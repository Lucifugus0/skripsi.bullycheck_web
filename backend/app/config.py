from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SECRET_KEY: str = "bullycheck-secret-key-ganti-di-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    MODEL_PATH: str = "./saved_models/best_model_v3_90_5_5.pt"
    ABUSIVE_PATH: str = "./data/abusive.csv"
    SLANG_PATH: str = "./data/new_kamusalay.csv"
    DATASET_PATH: str = "./data/data.csv"
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD_HASH: str = "admin123"

    model_config = {"env_file": ".env"}


settings = Settings()
