import base64
import json
import shutil
from pathlib import Path
from typing import Annotated, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, UploadFile, File
from pydantic import BaseModel

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
MODEL_STATS_PATH = Path("./saved_models/model_stats.json")
UPLOAD_DATASET_PATH = Path("./data/uploaded_dataset.csv")
ABUSIVE_PATH = Path(settings.ABUSIVE_PATH)
SLANG_PATH = Path(settings.SLANG_PATH)
SAVED_MODELS_DIR = Path("./saved_models")


class ModelStatsBody(BaseModel):
    accuracy: Optional[float] = None
    macro_f1: Optional[float] = None


def _read_stats() -> dict:
    if not MODEL_STATS_PATH.exists():
        return {}
    try:
        return json.loads(MODEL_STATS_PATH.read_text())
    except Exception:
        return {}


def _write_stats(data: dict) -> None:
    MODEL_STATS_PATH.write_text(json.dumps(data, indent=2))

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


DEFAULT_DATASET_PATH = Path("./data/dataset_combined_labeled.csv")

@router.post("/retrain")
async def retrain(_: AuthDep):
    if not UPLOAD_DATASET_PATH.exists() and not DEFAULT_DATASET_PATH.exists():
        raise HTTPException(status_code=400, detail="Tidak ada dataset tersedia.")
    try:
        trainer.start()
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    return {"detail": "Training dimulai."}


@router.get("/training-status", response_model=TrainingStatusResponse)
async def training_status(_: AuthDep):
    return trainer.get_status()


@router.get("/model-history", response_model=List[ModelHistoryEntry])
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


# Mapping nama file → label split + keterangan
_PRETRAINED_LABELS = {
    # Dataset: Ibrahim
    "best_model_ibrahim_90_5_5.pt":              {"split": "90/5/5",   "label": "Ibrahim — Split 90/5/5",              "default": False},
    "best_model_ibrahim_80_10_10.pt":            {"split": "80/10/10", "label": "Ibrahim — Split 80/10/10",            "default": False},
    "best_model_ibrahim_70_15_15.pt":            {"split": "70/15/15", "label": "Ibrahim — Split 70/15/15",            "default": False},
    # Dataset: TikTok + Twitter
    "best_model_tiktok_twitter_90_5_5.pt":       {"split": "90/5/5",   "label": "TikTok+Twitter — Split 90/5/5",       "default": False},
    "best_model_tiktok_twitter_80_10_10.pt":     {"split": "80/10/10", "label": "TikTok+Twitter — Split 80/10/10",     "default": False},
    "best_model_tiktok_twitter_70_15_15.pt":     {"split": "70/15/15", "label": "TikTok+Twitter — Split 70/15/15",     "default": False},
    # Dataset: Ibrahim + TikTok + Twitter (Combined)
    "best_model_ibrahimtiktoktwitter_90_5_5.pt":   {"split": "90/5/5",   "label": "Combined — Split 90/5/5",   "default": True},
    "best_model_ibrahimtiktoktwitter_80_10_10.pt":  {"split": "80/10/10", "label": "Combined — Split 80/10/10",  "default": False},
    "best_model_ibrahimtiktoktwitter_70_15_15.pt":  {"split": "70/15/15", "label": "Combined — Split 70/15/15",  "default": False},
}


@router.get("/available-models")
async def available_models(_: AuthDep):
    import app.services.model_service as model_svc

    active = Path(model_svc.get_active_path()).name

    # Baca history.json untuk info model hasil retrain
    history_map = {}
    if HISTORY_PATH.exists():
        try:
            for entry in json.loads(HISTORY_PATH.read_text()):
                fname = f"model_{entry['version']}.pt"
                history_map[fname] = entry
        except Exception:
            pass

    result = []

    # 1. Model pretrained dari registry
    for fname, meta in _PRETRAINED_LABELS.items():
        path = SAVED_MODELS_DIR / fname
        result.append({
            "filename": fname,
            "label":    meta["label"],
            "split":    meta["split"],
            "default":  meta["default"],
            "exists":   path.exists(),
            "active":   active == fname,
            "retrained": False,
        })

    # 2. Model hasil retrain (model_*.pt) yang ada di folder
    for pt_file in sorted(SAVED_MODELS_DIR.glob("model_*.pt"), reverse=True):
        fname = pt_file.name
        entry = history_map.get(fname, {})
        date_str = entry.get("date", "")
        try:
            date_label = date_str[:10] if date_str else fname
        except Exception:
            date_label = fname
        result.append({
            "filename":  fname,
            "label":     f"Retrain {date_label}",
            "split":     f"{entry.get('dataset_size', '?')} baris",
            "default":   False,
            "exists":    True,
            "active":    active == fname,
            "retrained": True,
        })

    return result

@router.get("/model-stats/{filename}")
async def get_model_stats(filename: str, _: AuthDep):
    return _read_stats().get(filename, {})


@router.post("/model-stats/{filename}")
async def save_model_stats(filename: str, body: ModelStatsBody, _: AuthDep):
    stats = _read_stats()
    entry = stats.get(filename, {})
    if body.accuracy is not None:
        entry["accuracy"] = body.accuracy
    if body.macro_f1 is not None:
        entry["macro_f1"] = body.macro_f1
    stats[filename] = entry
    _write_stats(stats)
    return {"detail": "Statistik disimpan."}


@router.post("/model-cm/{filename}")
async def upload_model_cm(filename: str, _: AuthDep, file: UploadFile = File(...)):
    content = await file.read()
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "png"
    if ext not in {"png", "jpg", "jpeg", "webp"}:
        raise HTTPException(status_code=400, detail="Format gambar tidak didukung. Gunakan PNG atau JPG.")
    b64 = base64.b64encode(content).decode()
    stats = _read_stats()
    entry = stats.get(filename, {})
    entry["cm_image"] = f"data:image/{ext};base64,{b64}"
    stats[filename] = entry
    _write_stats(stats)
    return {"detail": "Gambar confusion matrix disimpan."}


@router.post("/set-model/{filename}")
async def set_model(filename: str, _: AuthDep):
    import app.services.model_service as model_svc

    # Hanya izinkan file yang dikenal
    if filename not in _PRETRAINED_LABELS and not filename.startswith("model_"):
        raise HTTPException(status_code=400, detail="Nama file model tidak dikenal.")
    model_path = SAVED_MODELS_DIR / filename
    if not model_path.exists():
        raise HTTPException(status_code=404, detail=f"{filename} tidak ditemukan.")
    model_svc.load_model(str(model_path))
    return {"detail": f"Model aktif diubah ke {filename}."}
