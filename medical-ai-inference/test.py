from app.predict import predict, model
from utils.gradcam import apply_gradcam
import os
import shutil

test_folder = "uploads"

# ✅ Clear outputs ก่อนรัน
output_dir = "outputs"
if os.path.exists(output_dir):
    shutil.rmtree(output_dir)
os.makedirs(output_dir, exist_ok=True)

correct_count = 0
total = 0

for filename in os.listdir(test_folder):
    image_path = os.path.join(test_folder, filename)

    print("\n==========================")
    print("Image:", filename)

    gt = filename.split("-")[0]
    print("Ground Truth:", gt)

    label, prob = predict(image_path)

    print("Prediction:", label)
    print("Confidence:", prob)

    correct = (gt.lower() == label.lower())
    print("Correct:", correct)

    if correct:
        correct_count += 1

    total += 1

    output_filename = f"gradcam_{filename}"
    output_path = os.path.join("outputs", output_filename)

print("\n==========================")
print("Final Accuracy:", correct_count / total)