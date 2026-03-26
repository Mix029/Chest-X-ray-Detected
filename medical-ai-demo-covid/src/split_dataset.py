import os
import random
import shutil
from pathlib import Path

# -----------------------------
# CONFIG
# -----------------------------
RANDOM_SEED = 42
SPLIT_RATIO = (0.7, 0.15, 0.15)

RAW_DATA_DIR = Path("../COVID-19_Radiography_Dataset")
OUTPUT_DIR = Path("../dataset")

CLASSES = [
    "COVID",
    "Lung_Opacity",
    "Normal",
    "Viral Pneumonia"
]

# -----------------------------
# FIX RANDOM SEED
# -----------------------------
random.seed(RANDOM_SEED)

# -----------------------------
# FUNCTION TO SPLIT FILES
# -----------------------------
def split_files(file_list):
    random.shuffle(file_list)

    total = len(file_list)
    train_end = int(total * SPLIT_RATIO[0])
    val_end = train_end + int(total * SPLIT_RATIO[1])

    train_files = file_list[:train_end]
    val_files = file_list[train_end:val_end]
    test_files = file_list[val_end:]

    return train_files, val_files, test_files


# -----------------------------
# MAIN
# -----------------------------
def main():
    for class_name in CLASSES:
        print(f"\nProcessing class: {class_name}")

        class_dir = RAW_DATA_DIR / class_name
        images = list((class_dir / "images").glob("*.png"))

        train_files, val_files, test_files = split_files(images)

        for split_name, split_files_list in zip(
            ["train", "val", "test"],
            [train_files, val_files, test_files]
        ):
            target_dir = OUTPUT_DIR / split_name / class_name
            target_dir.mkdir(parents=True, exist_ok=True)

            for file_path in split_files_list:
                shutil.copy(file_path, target_dir)

        print(f"Total: {len(images)}")
        print(f"Train: {len(train_files)}")
        print(f"Val: {len(val_files)}")
        print(f"Test: {len(test_files)}")

    print("\nDataset split completed successfully!")


if __name__ == "__main__":
    main()