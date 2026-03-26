# ==========================================
# COMPARE OPTIMIZED MODELS ONLY
# ==========================================

import os
import json
import pandas as pd

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RESULT_DIR = os.path.join(PROJECT_ROOT, "results")

models = ["resnet50", "densenet121"]

rows = []

for model in models:

    metrics_path = os.path.join(
        RESULT_DIR, f"{model}_metrics.json"
    )

    if not os.path.exists(metrics_path):
        print(f"Missing metrics for {model}")
        continue

    with open(metrics_path) as f:
        metrics = json.load(f)

    row = {
        "Model": model,
        "Accuracy": metrics["accuracy"],
        "Macro F1": metrics["macro_f1"],
        "Weighted F1": metrics["weighted_f1"],
    }

    rows.append(row)

# Create DataFrame
df = pd.DataFrame(rows)

# Sort by Macro F1 (main metric)
df = df.sort_values(by="Macro F1", ascending=False)

# Save
output_path = os.path.join(RESULT_DIR, "optimized_model_comparison.csv")
df.to_csv(output_path, index=False)

print("\nOptimized Model Comparison:\n")
print(df)

print(f"\nSaved to: {output_path}")