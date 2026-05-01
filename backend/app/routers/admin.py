import json
import shutil
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File

from app.config import settings
from app.middleware.auth import create_access_token, get_current_user, verify_password
from app.schemas.admin import (
    LoginRequest,
    LoginResponse,
    ModelHistoryEntry,
    TrainingStatusResponse,
)
from app.services import trainer

HISTORY_PATH = Path("./saved_models/history.json")
UPLOAD_DATASET_PATH = Path("./data/uploaded_dataset.csv")
ABUSIVE_PATH = Path(settings.ABUSIVE_PATH)
SLANG_PATH = Path(settings.SLANG_PATH)
SAVED_MODELS_DIR = Path("./saved_models")

router = APIRouter(prefix="/admin")

AuthDep = Annotated[str, Depends(get_current_user)]


@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest):
    if body.username != settings.ADMIN_USERNAME:
        raise HTTPException(status_code=401, detail="Username atau password salah.")
    if not verify_password(body.password, settings.ADMIN_PASSWORD_HASH):
        raise HTTPException(status_code=401, detail="Username atau password salah.")
    token = create_access_token(body.username)
    return {"access_token": token}


@router.post("/upload-dataset")
async def upload_dataset(_: AuthDep, file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Hanya file .csv yang diterima.")
    UPLOAD_DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(UPLOAD_DATASET_PATH, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"detail": "Dataset berhasil diupload."}


@router.post("/upload-kamus")
async def upload_kamus(
    _: AuthDep,
    type: str = Query(..., pattern="^(abusive|slang)$"),
    file: UploadFile = File(...),
):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Hanya file .csv yang diterima.")
    target = ABUSIVE_PATH if type == "abusive" else SLANG_PATH
    target.parent.mkdir(parents=True, exist_ok=True)
    with open(target, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"detail": f"Kamus {type} berhasil diupload."}


@router.post("/retrain")
async def retrain(_: AuthDep):
    if not UPLOAD_DATASET_PATH.exists():
        raise HTTPException(status_code=400, detail="Upload dataset terlebih dahulu.")
    try:
        trainer.start()
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return {"detail": "Training dimulai."}


@router.get("/training-status", response_model=TrainingStatusResponse)
async def training_status(_: AuthDep):
    return trainer.get_status()


@router.get("/model-history", response_model=list[ModelHistoryEntry])
async def model_history(_: AuthDep):
    if not HISTORY_PATH.exists():
        return []
    return json.loads(HISTORY_PATH.read_text())


@router.post("/rollback/{version}")
async def rollback(version: str, _: AuthDep):
    import app.services.model_service as model_svc

    model_path = SAVED_MODELS_DIR / f"model_{version}.pt"
    if not model_path.exists():
        raise HTTPException(status_code=404, detail=f"Model versi {version} tidak ditemukan.")
    model_svc.load_model(str(model_path))
    return {"detail": f"Berhasil rollback ke versi {version}."}
