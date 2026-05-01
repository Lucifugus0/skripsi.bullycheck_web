import json
import threading
from datetime import datetime
from pathlib import Path

import pandas as pd
import torch
import torch.nn as nn
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader, Dataset
from transformers import AutoTokenizer

from app.models.cyberbully_model import CyberbullyModel
from app.config import settings

MODEL_NAME = "indolem/indobertweet-base-uncased"
MAX_LEN = 128
BATCH_SIZE = 16
EPOCHS = 5

HISTORY_PATH = Path("./saved_models/history.json")
UPLOAD_PATH = Path("./data/uploaded_dataset.csv")

_status: dict = {"status": "idle", "progress": 0, "logs": []}
_lock = threading.Lock()


def get_status() -> dict:
    with _lock:
        return dict(_status)


def _set_status(**kwargs) -> None:
    with _lock:
        _status.update(kwargs)


class _BullyDataset(Dataset):
    def __init__(self, texts, labels_t1, labels_t2, tkds, tokenizer):
        self.texts = texts
        self.labels_t1 = labels_t1
        self.labels_t2 = labels_t2
        self.tkds = tkds
        self.tokenizer = tokenizer

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        enc = self.tokenizer(
            self.texts[idx],
            max_length=MAX_LEN,
            padding="max_length",
            truncation=True,
            return_tensors="pt",
        )
        return {
            "input_ids": enc["input_ids"].squeeze(),
            "attention_mask": enc["attention_mask"].squeeze(),
            "label_t1": torch.tensor(self.labels_t1[idx], dtype=torch.long),
            "label_t2": torch.tensor(self.labels_t2[idx], dtype=torch.long),
            "tkd": torch.tensor(self.tkds[idx], dtype=torch.float),
        }


def _run() -> None:
    try:
        from app.services import preprocessor as preprocessor_svc
        import app.services.model_service as model_svc

        _set_status(status="training", progress=0, logs=[])
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        df = pd.read_csv(UPLOAD_PATH)
        texts, tkds = [], []
        for t in df["Tweet"].astype(str).tolist():
            cleaned, tkd = preprocessor_svc.process(t)
            texts.append(cleaned)
            tkds.append(tkd)

        labels_t1 = df["HS"].astype(int).tolist()

        def _severity(row):
            if row["HS_Strong"] == 1:
                return 2
            if row["HS_Moderate"] == 1:
                return 1
            return 0

        labels_t2 = df.apply(_severity, axis=1).tolist()

        idx = list(range(len(texts)))
        train_idx, val_idx = train_test_split(idx, test_size=0.1, random_state=42)

        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

        def _make_ds(indices):
            return _BullyDataset(
                [texts[i] for i in indices],
                [labels_t1[i] for i in indices],
                [labels_t2[i] for i in indices],
                [tkds[i] for i in indices],
                tokenizer,
            )

        train_loader = DataLoader(_make_ds(train_idx), batch_size=BATCH_SIZE, shuffle=True)
        val_loader = DataLoader(_make_ds(val_idx), batch_size=BATCH_SIZE)

        model = CyberbullyModel(MODEL_NAME).to(device)
        optimizer = torch.optim.AdamW(model.parameters(), lr=2e-5)
        criterion = nn.CrossEntropyLoss()

        logs = []
        for epoch in range(EPOCHS):
            model.train()
            total_loss = 0.0
            for batch in train_loader:
                ids = batch["input_ids"].to(device)
                mask = batch["attention_mask"].to(device)
                lt1 = batch["label_t1"].to(device)
                lt2 = batch["label_t2"].to(device)
                tkd_b = batch["tkd"].to(device)

                optimizer.zero_grad()
                l1, l2 = model(ids, mask, tkd_b)
                loss = criterion(l1, lt1) + criterion(l2, lt2)
                loss.backward()
                optimizer.step()
                total_loss += loss.item()

            model.eval()
            t1_true, t1_pred = [], []
            with torch.no_grad():
                for batch in val_loader:
                    ids = batch["input_ids"].to(device)
                    mask = batch["attention_mask"].to(device)
                    tkd_b = batch["tkd"].to(device)
                    l1, _ = model(ids, mask, tkd_b)
                    t1_true.extend(batch["label_t1"].tolist())
                    t1_pred.extend(l1.argmax(dim=-1).cpu().tolist())

            val_acc = accuracy_score(t1_true, t1_pred)
            val_f1 = f1_score(t1_true, t1_pred, average="weighted", zero_division=0)
            avg_loss = total_loss / max(len(train_loader), 1)

            log = {"epoch": epoch + 1, "loss": round(avg_loss, 4),
                   "val_acc": round(val_acc, 4), "val_f1": round(val_f1, 4)}
            logs.append(log)
            _set_status(progress=int((epoch + 1) / EPOCHS * 100), logs=logs)

        # Save model
        version = datetime.now().strftime("%Y%m%d_%H%M%S")
        model_path = Path(f"./saved_models/model_{version}.pt")
        model_path.parent.mkdir(parents=True, exist_ok=True)
        torch.save(model.state_dict(), str(model_path))

        # Update history.json
        history = json.loads(HISTORY_PATH.read_text()) if HISTORY_PATH.exists() else []
        last = logs[-1]
        history.insert(0, {
            "version": version,
            "date": datetime.now().isoformat(),
            "dataset_size": len(df),
            "t1_acc": last["val_acc"],
            "t2_acc": last["val_acc"],
        })
        HISTORY_PATH.write_text(json.dumps(history, indent=2))

        # Reload active model
        model_svc.load_model(str(model_path))

        _set_status(status="done", progress=100)

    except Exception as exc:
        _set_status(status="error", progress=0)
        print(f"[trainer] ERROR: {exc}")
        raise


def start() -> None:
    if _status["status"] == "training":
        raise ValueError("Training sudah berjalan.")
    thread = threading.Thread(target=_run, daemon=True)
    thread.start()
