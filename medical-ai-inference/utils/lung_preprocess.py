import cv2
import numpy as np


# ==============================
# Lung Mask Generator
# ==============================
def get_lung_mask(image_path):
    img = cv2.imread(image_path, 0)
    img = cv2.resize(img, (224, 224))

    # ==========================
    # 🔥 STEP 1: Normalize contrast
    # ==========================
    img = cv2.equalizeHist(img)

    # ==========================
    # 🔥 STEP 2: Threshold (แยกปอด)
    # ==========================
    _, thresh = cv2.threshold(
        img, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )
    thresh = 255 - thresh  # invert

    # ==========================
    # 🔥 STEP 3: Morphology
    # ==========================
    kernel = np.ones((5, 5), np.uint8)
    mask = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)

    # ==========================
    # 🔥 STEP 4: Connected Components
    # ==========================
    num_labels, labels, stats, _ = cv2.connectedComponentsWithStats(mask)

    if num_labels <= 1:
        return np.zeros_like(mask)

    areas = stats[1:, cv2.CC_STAT_AREA]

    # 👉 เอา 2 ก้อนใหญ่สุด (ปอดซ้าย + ขวา)
    top2 = np.argsort(areas)[-2:] + 1

    lung_mask = np.zeros_like(mask)

    for lbl in top2:
        lung_mask[labels == lbl] = 255

    # ==========================
    # 🔥 STEP 5: Crop เฉพาะกลาง (กันไหล่)
    # ==========================
    h, w = lung_mask.shape
    crop_mask = np.zeros_like(lung_mask)

    crop_mask[int(h * 0.25):int(h * 0.9),
              int(w * 0.2):int(w * 0.8)] = 255

    lung_mask = cv2.bitwise_and(lung_mask, crop_mask)

    # ==========================
    # 🔥 STEP 6: Smooth mask
    # ==========================
    lung_mask = cv2.GaussianBlur(lung_mask, (7, 7), 0)

    return lung_mask


# ==============================
# Apply Lung Mask (for model input)
# ==============================
def apply_lung_mask(image_path):
    img = cv2.imread(image_path)
    img = cv2.resize(img, (224, 224))

    mask = get_lung_mask(image_path)

    # normalize mask (0-1)
    mask = mask / 255.0

    # expand to 3 channel
    mask = np.stack([mask] * 3, axis=-1)

    # apply mask
    masked = (img * mask).astype(np.uint8)

    return masked


# ==============================
# 🔥 OPTIONAL: Debug Save Mask
# ==============================
def save_mask_visualization(image_path, output_path="outputs/lung_mask.png"):
    mask = get_lung_mask(image_path)
    cv2.imwrite(output_path, mask)