from fastapi import APIRouter, HTTPException

from app.schemas.predict import PredictRequest, PredictResponse
from app.services import preprocessor as preprocessor_svc
import app.services.model_service as model_svc

router = APIRouter()


@router.post("/predict", response_model=PredictResponse)
async def predict(body: PredictRequest):
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Teks tidak boleh kosong.")
    if len(body.text) > 300:
        raise HTTPException(status_code=400, detail="Teks maksimal 300 karakter.")

    cleaned, tkd = preprocessor_svc.process(body.text)
    result = model_svc.predict(cleaned, tkd)
    return result
