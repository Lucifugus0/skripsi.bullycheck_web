from pydantic import BaseModel
from typing import List, Optional


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TrainingLog(BaseModel):
    epoch: int
    loss: float
    val_acc: float
    val_f1: float


class TrainingStatusResponse(BaseModel):
    status: str
    progress: int
    logs: List[TrainingLog]


class ModelHistoryEntry(BaseModel):
    version: str
    date: str
    dataset_size: int
    t1_acc: float
    t2_acc: float
