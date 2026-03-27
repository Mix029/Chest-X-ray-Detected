import torch
import torch.nn as nn
import cv2
import os
from torchvision import models, transforms
from PIL import Image
from utils.lung_preprocess import apply_lung_mask

# ✅ ใช้ฟังก์ชันที่คุณมีจริงใน gradcam.py
from utils.gradcam import apply_gradcam

# =========================
# Classes (Standardized)
# =========================
classes = ['COVID', 'Lung_Opacity', 'Normal', 'Viral_Pneumonia']

# =========================
# Device
# =========================
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# =========================
# Load Model
# =========================
def load_model():
    model = models.densenet121(weights=None)
    model.classifier = nn.Linear(1024, 4)

    model_path = os.path.join("model", "densenet121_optimized.pth")

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model not found: {model_path}")

    state_dict = torch.load(model_path, map_location=device, weights_only=True)
    model.load_state_dict(state_dict)

    model.to(device)
    model.eval()

    return model

model = load_model()

# =========================
# Fix GradCAM ReLU inplace
# =========================
for module in model.modules():
    if isinstance(module, torch.nn.ReLU):
        module.inplace = False

# =========================
# Transform (เหมือน train)
# =========================
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    ),
])

# =========================
# Predict Function
# =========================
def predict(image_path, debug=True):
    """
    Predict class ของภาพ X-ray + Grad-CAM (เฉพาะ non-Normal)
    """

    # โหลดภาพ
    img = Image.open(image_path).convert("RGB")
    img_tensor = transform(img).unsqueeze(0).to(device)

    # =========================
    # Predict
    # =========================
    with torch.no_grad():
        outputs = model(img_tensor)

    probs = torch.softmax(outputs, dim=1)
    pred = torch.argmax(probs, dim=1)

    pred_idx = pred.item()
    pred_label = classes[pred_idx]
    pred_conf = probs[0][pred_idx].item()

    # =========================
    # Grad-CAM (เฉพาะ non-Normal)
    # =========================
    os.makedirs("outputs", exist_ok=True)

    filename = os.path.basename(image_path)
    output_path = os.path.join("outputs", f"gradcam_{filename}")

    if pred_label != "Normal":
        print(f"[INFO] Showing Grad-CAM for {pred_label}")
        apply_gradcam(model, image_path, output_path)

    else:
        print("[INFO] Normal case - save original image")

        img = cv2.imread(image_path)
        img = cv2.resize(img, (224, 224))
        cv2.imwrite(output_path, img)

    print(f"Saved: {output_path}")
    # =========================
    # EXTRACT ACTUAL LABEL (Standardized)
    # =========================
    parent_dir = os.path.basename(os.path.dirname(image_path)).lower()
    filename_lower = filename.lower()
    context = f"{parent_dir}_{filename_lower}"

    actual_label = "Unknown"
    if "normal" in context:
        actual_label = "Normal"
    elif "lung_opacity" in context or "opacity" in context:
        actual_label = "Lung_Opacity"
    elif "covid" in context:
        actual_label = "COVID"
    elif "pneumonia" in context:
        actual_label = "Viral_Pneumonia"

    # =========================
    # DEBUG
    # =========================
    if debug:
        print("---- DEBUG ----")
        print("Raw logits:", outputs.cpu().numpy())
        print("Softmax probs:", probs.cpu().numpy())
        print("Pred index:", pred_idx)
        print("Pred label:", pred_label)
        print("Actual label:", actual_label)
        print("----------------")

    return pred_label, probs.cpu().numpy().tolist(), actual_label