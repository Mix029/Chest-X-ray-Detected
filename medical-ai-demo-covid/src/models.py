# ==========================================
# models.py
# ==========================================

import torch.nn as nn
from torchvision import models


def get_model(model_name, num_classes=4):

    if model_name == "resnet50":
        model = models.resnet50(weights="IMAGENET1K_V1")
        in_features = model.fc.in_features
        model.fc = nn.Linear(in_features, num_classes)

    elif model_name == "densenet121":
        model = models.densenet121(weights="IMAGENET1K_V1")
        in_features = model.classifier.in_features
        model.classifier = nn.Linear(in_features, num_classes)

    else:
        raise ValueError("Model not supported")

    return model