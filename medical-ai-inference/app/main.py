from fastapi import FastAPI, UploadFile, File
import shutil
import os
from app.predict import predict

app = FastAPI()

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.post("/predict")
async def predict_api(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    label, prob = predict(file_path)

    return {
        "prediction": label,
        "confidence": prob
    }