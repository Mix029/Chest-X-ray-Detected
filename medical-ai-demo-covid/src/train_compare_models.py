import os
import copy
import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import datasets, transforms, models
from torch.utils.data import DataLoader, Dataset
from sklearn.metrics import f1_score
from tqdm import tqdm

# =============================
# FIX RANDOM SEED
# =============================
SEED = 42

torch.manual_seed(SEED)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)

torch.backends.cudnn.deterministic = True
torch.backends.cudnn.benchmark = False

# =============================
# CONFIG
# =============================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "dataset")

SELECTED_CLASSES = ["COVID", "Normal", "Viral Pneumonia", "Lung_Opacity"]

BATCH_SIZE = 32
EPOCHS = 15
LR = 1e-4
NUM_WORKERS = 0   # Windows safe
PATIENCE = 5

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print("Using device:", device)
print("DATA_DIR:", DATA_DIR)

# =============================
# TRANSFORMS
# =============================
train_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.RandomHorizontalFlip(),
    transforms.RandomRotation(10),
    transforms.ToTensor(),
])

val_transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
])

# =============================
# CUSTOM FILTERED DATASET
# =============================
class FilteredImageFolder(Dataset):
    def __init__(self, root, transform, selected_classes):
        base_dataset = datasets.ImageFolder(root=root, transform=transform)

        self.loader = base_dataset.loader
        self.transform = transform
        self.selected_classes = selected_classes

        # mapping ใหม่ 0..N-1
        self.class_to_newidx = {
            cls: i for i, cls in enumerate(selected_classes)
        }

        self.samples = []

        for path, label in base_dataset.samples:
            class_name = base_dataset.classes[label]
            if class_name in selected_classes:
                new_label = self.class_to_newidx[class_name]
                self.samples.append((path, new_label))

        print(f"Loaded {len(self.samples)} samples from {root}")

    def __len__(self):
        return len(self.samples)

    def __getitem__(self, idx):
        path, label = self.samples[idx]
        image = self.loader(path)

        if self.transform:
            image = self.transform(image)

        return image, label


# =============================
# LOAD DATA
# =============================
def load_datasets():

    train_dataset = FilteredImageFolder(
        os.path.join(DATA_DIR, "train"),
        train_transform,
        SELECTED_CLASSES
    )

    val_dataset = FilteredImageFolder(
        os.path.join(DATA_DIR, "val"),
        val_transform,
        SELECTED_CLASSES
    )

    train_loader = DataLoader(
        train_dataset,
        batch_size=BATCH_SIZE,
        shuffle=True,
        num_workers=NUM_WORKERS
    )

    val_loader = DataLoader(
        val_dataset,
        batch_size=BATCH_SIZE,
        shuffle=False,
        num_workers=NUM_WORKERS
    )

    return train_loader, val_loader


# =============================
# MODEL FACTORY
# =============================
def get_model(model_name, num_classes):

    if model_name == "densenet121":
        model = models.densenet121(weights="IMAGENET1K_V1")
        model.classifier = nn.Linear(model.classifier.in_features, num_classes)

    elif model_name == "resnet18":
        model = models.resnet18(weights="IMAGENET1K_V1")
        model.fc = nn.Linear(model.fc.in_features, num_classes)

    elif model_name == "resnet50":
        model = models.resnet50(weights="IMAGENET1K_V1")
        model.fc = nn.Linear(model.fc.in_features, num_classes)

    elif model_name == "efficientnet":
        model = models.efficientnet_b0(weights="IMAGENET1K_V1")
        model.classifier[1] = nn.Linear(
            model.classifier[1].in_features, num_classes)

    else:
        raise ValueError("Model not supported")

    return model.to(device)


# =============================
# TRAIN FUNCTION
# =============================
def train_model(model, model_name, train_loader, val_loader):

    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=LR)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode='max', patience=2, factor=0.5)

    best_f1 = 0.0
    best_model_wts = copy.deepcopy(model.state_dict())
    early_stop_counter = 0

    for epoch in range(EPOCHS):

        print(f"\n{model_name} | Epoch {epoch+1}/{EPOCHS}")

        # ===== TRAIN =====
        model.train()
        for inputs, labels in tqdm(train_loader):

            inputs = inputs.to(device)
            labels = labels.to(device)   # ✅ ไม่ใช้ torch.tensor()

            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()

        # ===== VALIDATION =====
        model.eval()
        all_preds = []
        all_labels = []

        with torch.no_grad():
            for inputs, labels in val_loader:

                inputs = inputs.to(device)
                labels = labels.to(device)

                outputs = model(inputs)
                _, preds = torch.max(outputs, 1)

                all_preds.extend(preds.cpu().numpy())
                all_labels.extend(labels.cpu().numpy())

        val_f1 = f1_score(all_labels, all_preds, average="macro")
        print("Validation Macro F1:", val_f1)

        scheduler.step(val_f1)

        # Early stopping
        if val_f1 > best_f1:
            best_f1 = val_f1
            best_model_wts = copy.deepcopy(model.state_dict())
            early_stop_counter = 0
        else:
            early_stop_counter += 1

        if early_stop_counter >= PATIENCE:
            print("Early stopping triggered")
            break

    print(f"Best F1 for {model_name}: {best_f1:.4f}")

    model.load_state_dict(best_model_wts)
    torch.save(model.state_dict(),f"{model_name}_{len(SELECTED_CLASSES)}class_seed{SEED}_best.pth")

    return best_f1

# =============================
# MAIN
# =============================
if __name__ == "__main__":

    train_loader, val_loader = load_datasets()
    num_classes = len(SELECTED_CLASSES)

    models_to_train = [
        "densenet121",
        "resnet18",
        "resnet50",
        "efficientnet"
    ]

    results = {}

    for model_name in models_to_train:

        print("\n==============================")
        print("Training:", model_name)
        print("==============================")

        model = get_model(model_name, num_classes)
        best_f1 = train_model(model, model_name,
                              train_loader, val_loader)
        results[model_name] = best_f1

    print("\n===== FINAL RESULTS =====")
    for name, score in results.items():
        print(f"{name}: {score:.4f}")