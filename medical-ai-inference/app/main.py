from fastapi import FastAPI, UploadFile, File, HTTPException
import shutil
import os
import traceback
from app.predict import predict

app = FastAPI()

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.get("/")
async def root():
    return {"message": "Medical AI Inference Server is running"}

@app.post("/predict")
async def predict_api(file: UploadFile = File(...)):
    try:
        file_path = os.path.join(UPLOAD_FOLDER, file.filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        label, prob, actual = predict(file_path)

        return {
            "prediction": label,
            "confidence": prob,
            "actual_label": actual
        }
    except Exception as e:
        print(f"Error during prediction: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))