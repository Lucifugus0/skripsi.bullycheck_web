from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import predict, admin
from app.services import preprocessor as preprocessor_svc
import app.services.model_service as model_svc


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    preprocessor_svc.init(settings.ABUSIVE_PATH, settings.SLANG_PATH)
    model_svc.load_model()
    yield
    # Shutdown (nothing to clean up)


app = FastAPI(title="BullyCheck API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict.router)
app.include_router(admin.router)


@app.get("/")
async def root():
    return {"message": "BullyCheck API is running."}
