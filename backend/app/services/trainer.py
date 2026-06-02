import json
import threading
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split
from torch.utils.data import DataLoader, Dataset
from transformers import AutoTokenizer

from app.models.cyberbully_model import CyberbullyMultiTask
from app.config import settings

MODEL_NAME  = "indolem/indobertweet-base-uncased"
MAX_LEN     = 128
BATCH_SIZE  = 16
EPOCHS      = 5
LR          = 2e-5
ALPHA       = 0.5
BETA        = 0.5
W2_WEAK     = 1.0
W2_MODERATE = 6.5
W2_STRONG   = 15.0

HISTORY_PATH   = Path("./saved_models/history.json")
UPLOAD_PATH    = Path("./data/uploaded_dataset.csv")
DEFAULT_DATASET = Path(settings.DATASET_PATH)

_status: dict = {"status": "idle", "progress": 0, "logs": []}
_lock = threading.Lock()


def get_status() -> dict:
    with _lock:
        return dict(_status)


def _set(**kwargs) -> None:
    with _lock:
        _status.update(kwargs)


class _Dataset(Dataset):
    def __init__(self, indices, texts, labels1, labels2, tkds, tokenizer):
        self.indices   = indices
        self.texts     = texts
        self.labels1   = labels1
        self.labels2   = labels2
        self.tkds      = tkds
        self.tokenizer = tokenizer

    def __len__(self):
        return len(self.indices)

    def __getitem__(self, idx):
        i   = self.indices[idx]
        enc = self.tokenizer(
            self.texts[i],
            max_length=MAX_LEN,
            padding="max_length",
            truncation=True,
            return_tensors="pt",
        )
        return {
            "input_ids":      enc["input_ids"].squeeze(0),
            "attention_mask": enc["attention_mask"].squeeze(0),
            "toxic_density":  torch.tensor([self.tkds[i]], dtype=torch.float),
            "label_task1":    torch.tensor(self.labels1[i], dtype=torch.long),
            "label_task2":    torch.tensor(self.labels2[i], dtype=torch.long),
        }


def _run() -> None:
    try:
        from app.services import preprocessor as prep_svc
        import app.services.model_service as model_svc

        start_time = datetime.now()
        _set(status="training", progress=0, logs=[])
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

        # Load & preprocess dataset (pakai upload jika ada, fallback ke dataset asli)
        dataset_path = UPLOAD_PATH if UPLOAD_PATH.exists() else DEFAULT_DATASET
        df = pd.read_csv(dataset_path, encoding="latin1")
        texts, tkds = [], []
        for t in df["Tweet"].astype(str).tolist():
            cleaned, tkd = prep_svc.process(t)
            texts.append(cleaned)
            tkds.append(tkd)
        tkds = np.array(tkds, dtype=np.float32)

        labels1 = df["HS"].astype(int).values

        def _severity(row):
            if row["HS"] == 0:           return -1
            if row["HS_Strong"] == 1:    return 2
            if row["HS_Moderate"] == 1:  return 1
            return 0

        labels2  = df.apply(_severity, axis=1).values
        idx_all  = np.arange(len(texts))

        idx_train, idx_temp = train_test_split(
            idx_all, test_size=0.1, random_state=42, stratify=labels1
        )
        idx_val, _ = train_test_split(
            idx_temp, test_size=0.5, random_state=42, stratify=labels1[idx_temp]
        )

        tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

        def _make(indices):
            return _Dataset(indices, texts, labels1, labels2, tkds, tokenizer)

        train_loader = DataLoader(_make(idx_train), batch_size=BATCH_SIZE, shuffle=True)
        val_loader   = DataLoader(_make(idx_val),   batch_size=BATCH_SIZE)

        model     = CyberbullyMultiTask(MODEL_NAME).to(device)
        optimizer = torch.optim.AdamW(model.parameters(), lr=LR, weight_decay=0.01)
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=EPOCHS)

        n_noncb = (labels1 == 0).sum()
        n_cb    = (labels1 == 1).sum()
        w1 = torch.tensor(
            [len(labels1) / (2 * n_noncb), len(labels1) / (2 * n_cb)],
            dtype=torch.float,
        ).to(device)
        w2 = torch.tensor([W2_WEAK, W2_MODERATE, W2_STRONG], dtype=torch.float).to(device)

        criterion1 = nn.CrossEntropyLoss(weight=w1)
        criterion2 = nn.CrossEntropyLoss(weight=w2)

        logs = []
        best_f1   = 0.0
        best_path = Path(f"./saved_models/_best_tmp.pt")

        for epoch in range(EPOCHS):
            model.train()
            total_loss = 0.0
            for batch in train_loader:
                ids    = batch["input_ids"].to(device)
                mask   = batch["attention_mask"].to(device)
                toxic  = batch["toxic_density"].to(device)   # (batch, 1)
                lbl1   = batch["label_task1"].to(device)
                lbl2   = batch["label_task2"].to(device)

                optimizer.zero_grad()
                out1, out2 = model(ids, mask, toxic)
                loss1  = criterion1(out1, lbl1)
                mask2  = lbl2 >= 0
                loss2  = criterion2(out2[mask2], lbl2[mask2]) if mask2.sum() > 0 else torch.tensor(0.0).to(device)
                loss   = ALPHA * loss1 + BETA * loss2
                loss.backward()
                torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step()
                total_loss += loss.item()
            scheduler.step()

            # Validation
            model.eval()
            v1_true, v1_pred = [], []
            with torch.no_grad():
                for batch in val_loader:
                    out1, _ = model(
                        batch["input_ids"].to(device),
                        batch["attention_mask"].to(device),
                        batch["toxic_density"].to(device),
                    )
                    v1_true.extend(batch["label_task1"].numpy())
                    v1_pred.extend(out1.argmax(dim=1).cpu().numpy())

            val_acc = accuracy_score(v1_true, v1_pred)
            val_f1  = f1_score(v1_true, v1_pred, average="macro", zero_division=0)
            avg_loss = total_loss / max(len(train_loader), 1)

            log = {"epoch": epoch + 1, "loss": round(avg_loss, 4),
                   "val_acc": round(val_acc, 4), "val_f1": round(val_f1, 4)}
            logs.append(log)
            _set(progress=int((epoch + 1) / EPOCHS * 100), logs=logs)

            if val_f1 > best_f1:
                best_f1 = val_f1
                torch.save(model.state_dict(), str(best_path))

        # Save final model
        version    = datetime.now().strftime("%Y%m%d_%H%M%S")
        model_path = Path(f"./saved_models/model_{version}.pt")
        model_path.parent.mkdir(parents=True, exist_ok=True)
        if best_path.exists():
            best_path.rename(model_path)
        else:
            torch.save(model.state_dict(), str(model_path))

        # Update history.json
        end_time = datetime.now()
        duration_seconds = int((end_time - start_time).total_seconds())
        history = json.loads(HISTORY_PATH.read_text()) if HISTORY_PATH.exists() else []
        last    = logs[-1]
        history.insert(0, {
            "version":          version,
            "date":             end_time.isoformat(),
            "start_time":       start_time.isoformat(),
            "end_time":         end_time.isoformat(),
            "duration_seconds": duration_seconds,
            "dataset_size":     len(df),
            "t1_acc":           last["val_acc"],
            "t2_acc":           last["val_f1"],
        })
        HISTORY_PATH.write_text(json.dumps(history, indent=2))

        model_svc.load_model(str(model_path))
        _set(status="done", progress=100)

    except Exception as exc:
        _set(status="error", progress=0)
        print(f"[trainer] ERROR: {exc}")
        raise


def start() -> None:
    if _status["status"] == "training":
        raise ValueError("Training sudah berjalan.")
    threading.Thread(target=_run, daemon=True).start()
