# ==========================================
# Research-Grade Training Script
# ==========================================

import os
import argparse
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms
from torch.utils.data import DataLoader, WeightedRandomSampler
from sklearn.metrics import accuracy_score, f1_score
from tqdm import tqdm
from models import get_model

# ------------------------------------------
# Arguments
# ------------------------------------------
parser = argparse.ArgumentParser()
parser.add_argument("--model", type=str, required=True,
                    choices=["resnet50", "densenet121"])
parser.add_argument("--epochs", type=int, default=15)
args = parser.parse_args()

MODEL_NAME = args.model
EPOCHS = args.epochs

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("Using device:", DEVICE)
print("Model:", MODEL_NAME)

# ------------------------------------------
# Transforms
# ------------------------------------------
train_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(10),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    ),
])

val_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225]
    ),
])

# ------------------------------------------
# Dataset
# ------------------------------------------
train_dataset = datasets.ImageFolder("dataset/train", transform=train_transform)
val_dataset = datasets.ImageFolder("dataset/val", transform=val_transform)

num_classes = len(train_dataset.classes)
print("Classes:", train_dataset.classes)

# ------------------------------------------
# Handle Class Imbalance
# ------------------------------------------
targets = [label for _, label in train_dataset.samples]
class_counts = np.bincount(targets)
print("Class counts:", class_counts)

class_weights = 1. / torch.tensor(class_counts, dtype=torch.float)
sample_weights = class_weights[targets]

sampler = WeightedRandomSampler(sample_weights,
                                num_samples=len(sample_weights),
                                replacement=True)

train_loader = DataLoader(train_dataset, batch_size=32, sampler=sampler)
val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False)

# ------------------------------------------
# Model
# ------------------------------------------
model = get_model(MODEL_NAME, num_classes=num_classes)
model.to(DEVICE)

criterion = nn.CrossEntropyLoss(weight=class_weights.to(DEVICE))
optimizer = optim.Adam(model.parameters(), lr=1e-4)

scheduler = optim.lr_scheduler.ReduceLROnPlateau(
    optimizer, mode='max', patience=2, factor=0.5
)

# ------------------------------------------
# Early Stopping
# ------------------------------------------
best_f1 = 0
patience = 5
trigger_times = 0

os.makedirs("results", exist_ok=True)

# ------------------------------------------
# Training Loop
# ------------------------------------------
for epoch in range(EPOCHS):

    # ===== TRAIN =====
    model.train()
    train_preds = []
    train_labels = []
    train_loss = 0

    for images, labels in tqdm(train_loader, desc=f"Epoch {epoch+1}/{EPOCHS} - Train"):
        images = images.to(DEVICE)
        labels = labels.to(DEVICE)

        optimizer.zero_grad()
        outputs = model(images)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        train_loss += loss.item()
        preds = torch.argmax(outputs, dim=1)

        train_preds.extend(preds.cpu().numpy())
        train_labels.extend(labels.cpu().numpy())

    train_acc = accuracy_score(train_labels, train_preds)
    train_f1 = f1_score(train_labels, train_preds, average='macro')

    # ===== VALIDATION =====
    model.eval()
    val_preds = []
    val_labels = []
    val_loss = 0

    with torch.no_grad():
        for images, labels in val_loader:
            images = images.to(DEVICE)
            labels = labels.to(DEVICE)

            outputs = model(images)
            loss = criterion(outputs, labels)

            val_loss += loss.item()
            preds = torch.argmax(outputs, dim=1)

            val_preds.extend(preds.cpu().numpy())
            val_labels.extend(labels.cpu().numpy())

    val_acc = accuracy_score(val_labels, val_preds)
    val_f1 = f1_score(val_labels, val_preds, average='macro')

    scheduler.step(val_f1)

    print(f"\nEpoch {epoch+1}")
    print(f"Train Loss: {train_loss/len(train_loader):.4f} | Train Acc: {train_acc:.4f} | Train F1: {train_f1:.4f}")
    print(f"Val Loss: {val_loss/len(val_loader):.4f} | Val Acc: {val_acc:.4f} | Val F1: {val_f1:.4f}")

    # ===== Save Best Model =====
    if val_f1 > best_f1:
        best_f1 = val_f1
        trigger_times = 0
        torch.save(model.state_dict(),
                   f"results/{MODEL_NAME}_optimized.pth")
        print("Best model saved!")
    else:
        trigger_times += 1
        print(f"EarlyStopping counter: {trigger_times}/{patience}")

        if trigger_times >= patience:
            print("Early stopping triggered!")
            break

print("Training Completed.")
print("Best Val Macro F1:", best_f1)