"""Jalankan script ini untuk mengubah password admin.
Usage: python scripts/generate_hash.py
"""
from passlib.context import CryptContext
from pathlib import Path

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

password = input("Masukkan password baru admin: ")
hashed = pwd_context.hash(password)
print(f"\nHash: {hashed}")

env_path = Path(__file__).parent.parent / ".env"
if env_path.exists():
    content = env_path.read_text()
    lines = content.splitlines()
    updated = []
    for line in lines:
        if line.startswith("ADMIN_PASSWORD_HASH="):
            updated.append(f"ADMIN_PASSWORD_HASH={hashed}")
        else:
            updated.append(line)
    env_path.write_text("\n".join(updated) + "\n")
    print(f".env berhasil diperbarui.")
