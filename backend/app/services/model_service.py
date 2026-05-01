from pathlib import Path
import torch
from transformers import AutoTokenizer
from fastapi import HTTPException

from app.models.cyberbully_model import CyberbullyModel
from app.config import settings

MODEL_NAME = "indolem/indobertweet-base-uncased"
MAX_LEN = 128
LABEL_MAP = {0: "non-cyberbullying", 1: "cyberbullying"}
SEVERITY_MAP = {0: "weak", 1: "moderate", 2: "strong"}

_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
_model: CyberbullyModel | None = None
_tokenizer = None


def load_model(path: str | None = None) -> None:
    global _model, _tokenizer
    model_path = Path(path or settings.MODEL_PATH)

    _tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    _model = CyberbullyModel(model_name=MODEL_NAME)

    if model_path.exists():
        state = torch.load(str(model_path), map_location=_device)
        _model.load_state_dict(state)
        print(f"[model] loaded from {model_path}")
    else:
        print(f"[model] WARNING: {model_path} tidak ditemukan. Model berjalan tanpa bobot terlatih.")

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
    input_ids = enc["input_ids"].to(_device)
    attention_mask = enc["attention_mask"].to(_device)
    tkd_tensor = torch.tensor([tkd]).to(_device)

    with torch.no_grad():
        logits_t1, logits_t2 = _model(input_ids, attention_mask, tkd_tensor)

    probs_t1 = torch.softmax(logits_t1, dim=-1)[0]
    pred_t1 = int(probs_t1.argmax().item())
    confidence = float(probs_t1[pred_t1].item())
    label = LABEL_MAP[pred_t1]

    severity = None
    severity_confidence = None
    if pred_t1 == 1:
        probs_t2 = torch.softmax(logits_t2, dim=-1)[0]
        pred_t2 = int(probs_t2.argmax().item())
        severity = SEVERITY_MAP[pred_t2]
        severity_confidence = float(probs_t2[pred_t2].item())

    return {
        "label": label,
        "confidence": confidence,
        "severity": severity,
        "severity_confidence": severity_confidence,
        "toxicity_density": round(tkd, 4),
    }
