import re
from pathlib import Path
import pandas as pd

_instance = None


class Preprocessor:
    def __init__(self, abusive_path: str, slang_path: str):
        self.abusive_words = self._load_abusive(abusive_path)
        self.slang_dict    = self._load_slang(slang_path)

    def _load_abusive(self, path: str) -> set:
        p = Path(path)
        if not p.exists():
            return set()
        # header=0: baris pertama ("ABUSIVE") adalah nama kolom, bukan data
        df = pd.read_csv(p, header=0, encoding="latin1")
        return set(df.iloc[:, 0].astype(str).str.lower().str.strip().tolist())

    def _load_slang(self, path: str) -> dict:
        p = Path(path)
        if not p.exists():
            return {}
        df = pd.read_csv(p, header=None, encoding="latin1")
        return dict(zip(
            df[0].astype(str).str.lower().str.strip(),
            df[1].astype(str).str.lower().str.strip(),
        ))

    def _clean(self, text: str) -> str:
        if not isinstance(text, str):
            return ""
        text = text.lower()
        text = re.sub(r"http\S+|www\.\S+", "", text)
        text = re.sub(r"@\w+|#\w+", "", text)
        text = re.sub(r"\buser\b|\burl\b", "", text)
        # Slang normalize DULU (sesuai notebook), baru hapus non-alpha
        text = " ".join(self.slang_dict.get(w.lower(), w) for w in text.split())
        text = re.sub(r"[^a-zA-Z\s]", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def compute_tkd(self, text: str) -> float:
        words = text.lower().split()
        if not words:
            return 0.0
        return sum(1 for w in words if w in self.abusive_words) / len(words)

    def process(self, text: str) -> tuple:
        cleaned = self._clean(text)
        tkd     = self.compute_tkd(cleaned)
        return cleaned, tkd


def init(abusive_path: str, slang_path: str) -> None:
    global _instance
    _instance = Preprocessor(abusive_path, slang_path)


def process(text: str) -> tuple:
    return _instance.process(text)
