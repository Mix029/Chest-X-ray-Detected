# ==========================================
# EVALUATE MODEL (FIXED VERSION)
# ==========================================

import os
import argparse
import json
import torch
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt

from torchvision import datasets, transforms
from torch.utils.data import DataLoader
from sklearn.metrics import (
    accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    roc_curve,
    auc
)
from sklearn.preprocessing import label_binarize
from itertools import cycle

# ✅ IMPORTANT: use same model factory as training
from models import get_model


# ==========================================
# ARGUMENTS
# ==========================================

parser = argparse.ArgumentParser()
parser.add_argument("--model", type=str, required=True,
                    choices=["resnet50", "densenet121"])
parser.add_argument("--weights", type=str, required=True,
                    help="Path to .pth file")
args = parser.parse_args()


# ==========================================
# PATH SETUP
# ==========================================

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA_DIR = os.path.join(PROJECT_ROOT, "dataset")
RESULT_DIR = os.path.join(PROJECT_ROOT, "results")

os.makedirs(RESULT_DIR, exist_ok=True)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("Using device:", DEVICE)


# ==========================================
# TRANSFORM (MUST MATCH TRAINING)
# ==========================================

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    )
])


# ==========================================
# DATASET
# ==========================================

val_dataset = datasets.ImageFolder(
    os.path.join(DATA_DIR, "val"),
    transform=transform
)

val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)

class_names = val_dataset.classes
num_classes = len(class_names)

print("Classes:", class_names)


# ==========================================
# LOAD MODEL (IDENTICAL TO TRAIN)
# ==========================================

model = get_model(args.model, num_classes)
model.load_state_dict(torch.load(args.weights, map_location=DEVICE))
model = model.to(DEVICE)
model.eval()

print("Loaded model:", args.model)


# ==========================================
# INFERENCE
# ==========================================

all_preds = []
all_labels = []
all_probs = []

with torch.no_grad():
    for images, labels in val_loader:
        images = images.to(DEVICE)
        labels = labels.to(DEVICE)

        outputs = model(images)
        probs = torch.softmax(outputs, dim=1)
        preds = torch.argmax(probs, dim=1)

        all_preds.extend(preds.cpu().numpy())
        all_labels.extend(labels.cpu().numpy())
        all_probs.extend(probs.cpu().numpy())

all_preds = np.array(all_preds)
all_labels = np.array(all_labels)
all_probs = np.array(all_probs)


# ==========================================
# METRICS
# ==========================================

accuracy = accuracy_score(all_labels, all_preds)
macro_f1 = f1_score(all_labels, all_preds, average="macro")
weighted_f1 = f1_score(all_labels, all_preds, average="weighted")

print(f"\nAccuracy: {accuracy:.4f}")
print(f"Macro F1: {macro_f1:.4f}")
print(f"Weighted F1: {weighted_f1:.4f}")

report = classification_report(
    all_labels,
    all_preds,
    target_names=class_names
)

print("\nClassification Report:\n")
print(report)

with open(os.path.join(
        RESULT_DIR, f"{args.model}_classification_report.txt"), "w") as f:
    f.write(report)


# ==========================================
# CONFUSION MATRIX
# ==========================================

cm = confusion_matrix(all_labels, all_preds)

plt.figure(figsize=(6, 5))
plt.imshow(cm, interpolation="nearest")
plt.title("Confusion Matrix")
plt.colorbar()

tick_marks = np.arange(num_classes)
plt.xticks(tick_marks, class_names, rotation=45)
plt.yticks(tick_marks, class_names)

plt.xlabel("Predicted")
plt.ylabel("True")
plt.tight_layout()

plt.savefig(os.path.join(
    RESULT_DIR, f"{args.model}_confusion_matrix.png"))
plt.close()


# ==========================================
# ROC CURVE (One-vs-Rest)
# ==========================================

binary_labels = label_binarize(all_labels, classes=range(num_classes))

fpr = dict()
tpr = dict()
roc_auc = dict()

for i in range(num_classes):
    fpr[i], tpr[i], _ = roc_curve(binary_labels[:, i], all_probs[:, i])
    roc_auc[i] = auc(fpr[i], tpr[i])

plt.figure()

colors = cycle(["blue", "red", "green", "orange"])

for i, color in zip(range(num_classes), colors):
    plt.plot(fpr[i], tpr[i], color=color,
             label=f"{class_names[i]} (AUC = {roc_auc[i]:.2f})")

plt.plot([0, 1], [0, 1], "k--")
plt.xlabel("False Positive Rate")
plt.ylabel("True Positive Rate")
plt.title("ROC Curve (One-vs-Rest)")
plt.legend(loc="lower right")

plt.savefig(os.path.join(
    RESULT_DIR, f"{args.model}_roc_curve.png"))
plt.close()


# ==========================================
# SAVE PREDICTIONS
# ==========================================

df = pd.DataFrame({
    "true_label": all_labels,
    "predicted_label": all_preds
})

df.to_csv(os.path.join(
    RESULT_DIR, f"{args.model}_predictions.csv"),
    index=False)


# ==========================================
# SAVE SUMMARY JSON
# ==========================================

summary = {
    "accuracy": float(accuracy),
    "macro_f1": float(macro_f1),
    "weighted_f1": float(weighted_f1)
}

with open(os.path.join(
        RESULT_DIR, f"{args.model}_metrics.json"), "w") as f:
    json.dump(summary, f, indent=4)

print("\nEvaluation completed. Results saved to results/ folder.")