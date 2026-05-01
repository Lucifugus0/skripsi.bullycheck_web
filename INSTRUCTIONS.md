# BullyCheck — Cara Menjalankan Aplikasi

## Persyaratan

| Software | Versi Minimum |
|---|---|
| Node.js | 18+ |
| Python | 3.10+ |
| pip | terbaru |

---

## Struktur Folder

```
bullycheck/
├── frontend/       → React + Vite (UI)
├── backend/        → FastAPI + PyTorch (API & Model)
└── INSTRUCTIONS.md
```

---

## 1. Siapkan File Model

Sebelum menjalankan backend, pastikan file model sudah ada di:

```
backend/saved_models/best_model_v3_90_5_5.pt
```

File `.pt` ini tidak disertakan di repository karena ukurannya besar. Download secara manual dan letakkan di folder tersebut.

---

## 2. Jalankan Backend (FastAPI)

Buka **Terminal 1**, lalu jalankan perintah berikut:

```bash
cd backend
python -m venv venv
```

Aktifkan virtual environment:

- **Mac / Linux:**
  ```bash
  source venv/bin/activate
  ```
- **Windows:**
  ```bash
  venv\Scripts\activate
  ```

Install dependencies:

```bash
pip install -r requirements.txt
```

Jalankan server:

```bash
uvicorn app.main:app --reload --port 8000
```

Backend berjalan di: `http://localhost:8000`

Dokumentasi API otomatis tersedia di: `http://localhost:8000/docs`

---

## 3. Jalankan Frontend (React)

Buka **Terminal 2** (jangan tutup Terminal 1), lalu jalankan:

```bash
cd frontend
npm install
npm run dev
```

Frontend berjalan di: `http://localhost:5173`

---

## 4. Akses Aplikasi

| Halaman | URL |
|---|---|
| Deteksi Cyberbullying | http://localhost:5173/ |
| Tentang Model | http://localhost:5173/about |
| Panduan Penggunaan | http://localhost:5173/panduan |
| Login Admin | http://localhost:5173/login |
| Dashboard Admin | http://localhost:5173/admin |

---

## 5. Login Admin

Akses halaman login di `http://localhost:5173/login`

| Field | Value |
|---|---|
| Username | `admin` |
| Password | `admin123` |

Untuk mengganti password admin, jalankan:

```bash
cd backend
python scripts/generate_hash.py
```

Ikuti instruksi yang muncul. File `.env` akan diperbarui otomatis.

---

## Catatan Penting

- Kedua terminal (backend & frontend) harus tetap berjalan bersamaan.
- Jika port 8000 atau 5173 sudah dipakai, hentikan proses lain yang menggunakannya.
- File `.env` di folder `backend/` berisi konfigurasi sensitif — jangan dibagikan.
- File model `.pt` tidak masuk ke Git — simpan di Google Drive sebagai backup.
