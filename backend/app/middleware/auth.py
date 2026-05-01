from datetime import datetime, timedelta

from fastapi import HTTPException, Security
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings

security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain: str, stored: str) -> bool:
    # Support plaintext password di .env untuk kemudahan development
    if stored.startswith("$2b$") or stored.startswith("$2a$"):
        return pwd_context.verify(plain, stored)
    return plain == stored


def create_access_token(username: str) -> str:
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"sub": username, "exp": expire}
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security),
) -> str:
    try:
        payload = jwt.decode(
            credentials.credentials,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
        )
        username: str | None = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Token tidak valid.")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="Token tidak valid atau kadaluarsa.")
