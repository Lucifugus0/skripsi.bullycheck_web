import re
from pathlib import Path
import pandas as pd

_instance = None


class Preprocessor:
    def __init__(self, abusive_path: str, slang_path: str):
        self.abusive_words = self._load_abusive(abusive_path)
        self.slang_dict = self._load_slang(slang_path)

    def _load_abusive(self, path: str) -> set:
        p = Path(path)
        if not p.exists():
            return set()
        df = pd.read_csv(p, header=None)
        return set(df[0].astype(str).str.lower().tolist())

    def _load_slang(self, path: str) -> dict:
        p = Path(path)
        if not p.exists():
            return {}
        df = pd.read_csv(p, header=None)
        return dict(zip(df[0].astype(str).str.lower(), df[1].astype(str).str.lower()))

    def _clean(self, text: str) -> str:
        text = text.lower()
        text = re.sub(r"http\S+|www\S+", "", text)
        text = re.sub(r"@\w+", "", text)
        text = re.sub(r"#\w+", "", text)
        text = re.sub(r"[^a-z0-9\s]", " ", text)
        text = re.sub(r"\s+", " ", text).strip()
        return text

    def _normalize_slang(self, text: str) -> str:
        return " ".join(self.slang_dict.get(w, w) for w in text.split())

    def compute_tkd(self, text: str) -> float:
        words = text.split()
        if not words:
            return 0.0
        return sum(1 for w in words if w in self.abusive_words) / len(words)

    def process(self, text: str) -> tuple[str, float]:
        cleaned = self._clean(text)
        normalized = self._normalize_slang(cleaned)
        tkd = self.compute_tkd(normalized)
        return normalized, tkd


def init(abusive_path: str, slang_path: str) -> None:
    global _instance
    _instance = Preprocessor(abusive_path, slang_path)


def process(text: str) -> tuple[str, float]:
    return _instance.process(text)
