from pathlib import Path

import torch
from fastapi import HTTPException
from transformers import AutoTokenizer

from app.models.cyberbully_model import CyberbullyMultiTask
from app.config import settings

MODEL_NAME  = "indolem/indobertweet-base-uncased"
MAX_LEN     = 128
LABEL_MAP   = {0: "non-cyberbullying", 1: "cyberbullying"}
SEVERITY_MAP = {0: "weak", 1: "moderate", 2: "strong"}

_device      = torch.device("cuda" if torch.cuda.is_available() else "cpu")
_model       = None
_tokenizer   = None
_active_path = None


def get_active_path() -> str:
    return str(_active_path) if _active_path else settings.MODEL_PATH


def load_model(path=None) -> None:
    global _model, _tokenizer, _active_path
    model_path = Path(path or settings.MODEL_PATH)

    _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    _model     = CyberbullyMultiTask(model_name=MODEL_NAME)

    if model_path.exists():
        state = torch.load(str(model_path), map_location=_device)
        _model.load_state_dict(state)
        _active_path = model_path
        print(f"[model] loaded from {model_path}")
    else:
        print(f"[model] WARNING: {model_path} tidak ditemukan. Berjalan tanpa bobot terlatih.")

    _model.to(_device)
    _model.eval()


def predict(text: str, tkd: float) -> dict:
    if _model is None or _tokenizer is None:
        raise HTTPException(status_code=503, detail="Model belum dimuat.")

    enc = _tokenizer(
        text,
        max_length=MAX_LEN,
        padding="max_length",
        truncation=True,
        return_tensors="pt",
    )
    input_ids      = enc["input_ids"].to(_device)
    attention_mask = enc["attention_mask"].to(_device)
    # toxic shape harus (batch, 1) sesuai arsitektur notebook
    tkd_tensor     = torch.tensor([[tkd]], dtype=torch.float).to(_device)

    with torch.no_grad():
        out1, out2 = _model(input_ids, attention_mask, tkd_tensor)

    probs1     = torch.softmax(out1, dim=1)[0]
    pred1      = int(probs1.argmax().item())
    confidence = float(probs1[pred1].item())
    label      = LABEL_MAP[pred1]

    severity            = None
    severity_confidence = None
    if pred1 == 1:
        probs2              = torch.softmax(out2, dim=1)[0]
        pred2               = int(probs2.argmax().item())
        severity            = SEVERITY_MAP[pred2]
        severity_confidence = float(probs2[pred2].item())

    return {
        "label":               label,
        "confidence":          confidence,
        "severity":            severity,
        "severity_confidence": severity_confidence,
        "toxicity_density":    round(tkd, 4),
    }
