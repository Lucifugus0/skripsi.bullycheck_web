from pydantic import BaseModel
from typing import Optional


class PredictRequest(BaseModel):
    text: str


class PredictResponse(BaseModel):
    label: str
    confidence: float
    severity: Optional[str] = None
    severity_confidence: Optional[float] = None
    toxicity_density: float
