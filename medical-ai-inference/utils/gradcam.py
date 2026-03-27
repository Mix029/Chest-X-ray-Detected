import torch
import cv2
import numpy as np
import os
from torchvision import transforms
from PIL import Image
from utils.lung_preprocess import apply_lung_mask, get_lung_mask


class GradCAM:
    def __init__(self, model, target_layer):
        self.model = model
        self.target_layer = target_layer
        self.gradients = None
        self.activations = None
        self.hooks = []
        self._register_hooks()

    def _register_hooks(self):
        def forward_hook(module, input, output):
            self.activations = output.clone().detach()

        def backward_hook(module, grad_input, grad_output):
            self.gradients = grad_output[0].clone().detach()

        self.hooks.append(self.target_layer.register_forward_hook(forward_hook))
        self.hooks.append(self.target_layer.register_full_backward_hook(backward_hook))

    def generate(self, input_tensor, class_idx):
        output = self.model(input_tensor.clone())

        self.model.zero_grad()
        target = output[0][class_idx]
        target.backward()

        gradients = self.gradients[0].cpu().numpy()
        activations = self.activations[0].cpu().numpy()

        weights = np.mean(gradients, axis=(1, 2))

        cam = np.zeros(activations.shape[1:], dtype=np.float32)

        for i, w in enumerate(weights):
            cam += w * activations[i]

        cam = np.maximum(cam, 0)
        cam = cv2.resize(cam, (224, 224))

        cam = cam - np.min(cam)
        cam = cam / (np.max(cam) + 1e-8)

        # Remove hooks
        for hook in self.hooks:
            hook.remove()

        return cam


def draw_precise_box(image_path, cam, output_path):
    img = cv2.imread(image_path)
    img = cv2.resize(img, (224, 224))

    cam = (cam - np.min(cam)) / (np.max(cam) + 1e-8)

    lung_mask = get_lung_mask(image_path) / 255.0
    cam = cam * lung_mask

    h, w = cam.shape

    top_filter = np.zeros_like(cam)
    top_filter[int(h * 0.35):, :] = 1
    cam = cam * top_filter

    roi = np.zeros_like(cam)
    roi[int(h*0.3):int(h*0.9), int(w*0.25):int(w*0.75)] = 1
    cam = cam * roi

    cam = cv2.GaussianBlur(cam, (11, 11), 0)

    mask = (cam > 0.25).astype(np.uint8) * 255

    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    if len(contours) == 0:
        flat = cam.flatten()
        top_idx = np.argsort(flat)[-50:]

        coords = np.array([
            [idx // cam.shape[1], idx % cam.shape[1]]
            for idx in top_idx
        ])

        y_min, x_min = coords.min(axis=0)
        y_max, x_max = coords.max(axis=0)

        cv2.rectangle(img, (x_min, y_min), (x_max, y_max), (0, 0, 255), 2)

    else:
        for cnt in contours:
            if cv2.contourArea(cnt) > 50:
                x, y, w_box, h_box = cv2.boundingRect(cnt)

                pad = 10
                x = max(0, x - pad)
                y = max(0, y - pad)
                w_box = min(224 - x, w_box + pad)
                h_box = min(224 - y, h_box + pad)

                cv2.rectangle(img, (x, y), (x + w_box, y + h_box), (0, 0, 255), 2)

    # ✅ FIX: ต้องอยู่นอก if/else
    cv2.imwrite(output_path, img)


def apply_gradcam(model, image_path, output_path):

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(
            [0.485, 0.456, 0.406],
            [0.229, 0.224, 0.225]
        ),
    ])

    masked_img = apply_lung_mask(image_path)

    img = Image.fromarray(cv2.cvtColor(masked_img, cv2.COLOR_BGR2RGB))
    input_tensor = transform(img).unsqueeze(0).to(device)

    target_layer = model.features[-2]
    gradcam = GradCAM(model, target_layer)

    model.eval()
    output = model(input_tensor.clone())
    pred_class = torch.argmax(output, dim=1).item()

    cam = gradcam.generate(input_tensor, pred_class)

    os.makedirs("outputs", exist_ok=True)

    # ❌ ห้าม override output_path แล้ว
    draw_precise_box(image_path, cam, output_path)

    return output_path