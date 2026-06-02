# CLAUDE.md — BullyCheck Project

> File ini adalah dokumentasi lengkap proyek BullyCheck. Digunakan sebagai konteks utama untuk Claude AI (web/CLI) agar memahami seluruh struktur, alur, dan konvensi kode proyek ini.

---

## PROJECT OVERVIEW

**BullyCheck** adalah website deteksi cyberbullying berbahasa Indonesia berbasis AI.
Sistem ini menjalankan dua tugas sekaligus dalam satu model (Multi-Task Learning):
- **Task 1:** Deteksi teks sebagai Cyberbullying (CB) atau Non-Cyberbullying (Non-CB)
- **Task 2:** Klasifikasi severity → Weak / Moderate / Strong

**Model:** IndoBERTweet + BiGRU + Attention Mechanism + TKD (Toxicity Keyword Density) + ANN Multi-Task Learning

**Dataset utama:** `dataset_combined_labeled.csv` dan `data.csv` (Ibrohim) — gabungan TikTok, Instagram, Twitter, YouTube

---

## TECH STACK

| Layer | Tech |
|---|---|
| Frontend | React + Vite + JavaScript |
| Styling | Tailwind CSS |
| Backend | FastAPI (Python) |
| Model | PyTorch + HuggingFace Transformers |
| Auth | JWT token (admin only) |
| HTTP Client | Axios |
| Routing | React Router DOM v6 |

---

## CARA MENJALANKAN (DEVELOPMENT)

### Persyaratan
| Software | Versi Minimum |
|---|---|
| Node.js | 18+ |
| Python | 3.9+ |

### Siapkan File Model
Sebelum menjalankan backend, pastikan minimal satu file `.pt` ada di `backend/saved_models/`:
```
backend/saved_models/best_model_v3_90_5_5.pt   ← default
backend/saved_models/best_model_v3_80_10_10.pt
backend/saved_models/best_model_v3_70_15_15.pt
backend/saved_models/best_model_A_Ibrohim.pt
```
File `.pt` tidak disertakan di repo karena ukurannya ~426MB. Simpan di Google Drive.

### Jalankan Backend (Terminal 1)

**Pertama kali / setelah clone ulang:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Selanjutnya (sudah pernah install):**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Jika port 8000 sudah dipakai:**
```bash
lsof -ti:8000 | xargs kill -9
```

> Saat startup pertama, server mengunduh tokenizer IndoBERTweet dari HuggingFace (~500MB). Tunggu pesan `Application startup complete.`

### Jalankan Frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
```

### Akses Aplikasi

| Halaman | URL |
|---|---|
| Deteksi Cyberbullying | http://localhost:5173/ |
| Riwayat Cek | http://localhost:5173/riwayat |
| Tentang Model | http://localhost:5173/about |
| Panduan Penggunaan | http://localhost:5173/panduan |
| Login Admin | http://localhost:5173/login |
| Dashboard Admin | http://localhost:5173/admin |
| API Docs | http://localhost:8000/docs |

### Login Admin
| Field | Value |
|---|---|
| Username | `admin` |
| Password | `admin123` |

Untuk ganti password: `python scripts/generate_hash.py` (dari folder `backend/`)

---

## STRUKTUR FOLDER LENGKAP

```
bullycheck/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── ResultCard.jsx
│   │   │   ├── SeverityBadge.jsx
│   │   │   └── ConfidenceBar.jsx
│   │   ├── pages/
│   │   │   ├── Deteksi.jsx
│   │   │   ├── Riwayat.jsx
│   │   │   ├── About.jsx
│   │   │   ├── Panduan.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Admin.jsx
│   │   ├── hooks/
│   │   │   ├── usePredict.js
│   │   │   └── useAuth.js
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── utils/
│   │   │   ├── severity.js
│   │   │   └── history.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── routers/
│   │   │   ├── predict.py
│   │   │   └── admin.py
│   │   ├── services/
│   │   │   ├── model_service.py
│   │   │   ├── preprocessor.py
│   │   │   └── trainer.py
│   │   ├── models/
│   │   │   └── cyberbully_model.py
│   │   ├── schemas/
│   │   │   ├── predict.py
│   │   │   └── admin.py
│   │   └── middleware/
│   │       └── auth.py
│   ├── data/
│   │   ├── abusive.csv
│   │   ├── new_kamusalay.csv
│   │   ├── data.csv
│   │   └── dataset_combined_labeled.csv
│   ├── saved_models/
│   │   ├── best_model_v3_90_5_5.pt
│   │   ├── best_model_v3_80_10_10.pt
│   │   ├── best_model_v3_70_15_15.pt
│   │   ├── best_model_A_Ibrohim.pt
│   │   └── history.json
│   ├── scripts/
│   │   └── generate_hash.py
│   ├── requirements.txt
│   └── .env
│
└── CLAUDE.md
```

---

## PENJELASAN DETAIL SETIAP FILE

### FRONTEND

#### `frontend/src/main.jsx`
Entry point React. Me-render `<App />` ke dalam `#root` di `index.html`, membungkus dengan `<BrowserRouter>` dari React Router dan mengimport `index.css` untuk Tailwind.

#### `frontend/src/App.jsx`
Mendefinisikan semua route aplikasi menggunakan React Router v6. Berisi komponen `ProtectedRoute` yang mengecek JWT token di `localStorage` — jika tidak ada, redirect ke `/login`. Route yang ada: `/` (Deteksi), `/about`, `/panduan`, `/riwayat`, `/login`, `/admin` (protected).

#### `frontend/src/index.css`
Inisialisasi Tailwind (`@tailwind base/components/utilities`) dan mendefinisikan CSS variables global untuk design system (warna, font). Semua komponen menggunakan variabel ini via Tailwind classes.

---

#### `frontend/src/components/Navbar.jsx`
Navbar publik. Menampilkan logo "BullyCheck" (link ke `/`) dan navigasi ke Tentang, Panduan, Riwayat. **Tidak ada link ke `/login`** — halaman admin diakses langsung via URL.

#### `frontend/src/components/Footer.jsx`
Footer sederhana dengan copyright. Muncul di semua halaman publik.

#### `frontend/src/components/ResultCard.jsx`
Menampilkan hasil prediksi setelah API `/predict` dipanggil. Berisi:
- Label CB/Non-CB dengan warna (merah/hijau)
- `<SeverityBadge />` — hanya muncul jika CB
- Penjelasan severity dalam bahasa Indonesia (dari `utils/severity.js`)
- `<ConfidenceBar />` — progress bar persentase kepercayaan model
- Nilai Toxicity Density (TKD)

#### `frontend/src/components/SeverityBadge.jsx`
Badge kecil berwarna yang menampilkan tingkat keparahan: Lemah (kuning), Sedang (oranye), Kuat (merah). Menerima prop `severity` berisi string `"weak"`, `"moderate"`, atau `"strong"`.

#### `frontend/src/components/ConfidenceBar.jsx`
Progress bar horizontal yang menampilkan confidence score model (0–100%). Warna indigo, animasi transition saat nilai berubah.

---

#### `frontend/src/pages/Deteksi.jsx`
Halaman utama (`/`). Alur:
1. User mengetik teks di `<textarea>` (max 500 karakter)
2. Klik "Cek Sekarang" → memanggil `usePredict()` hook
3. Hook mengirim POST ke `/predict` via `api.js`
4. Hasil ditampilkan di `<ResultCard />`
5. Setiap prediksi berhasil → disimpan ke localStorage via `utils/history.js`
6. Tombol "Reset" menghapus input dan hasil

#### `frontend/src/pages/Riwayat.jsx`
Halaman riwayat (`/riwayat`). Membaca 10 entri terakhir dari `localStorage` (key: `bullycheck_history`). Menampilkan kartu per prediksi dengan teks, label, severity, confidence, TKD, dan timestamp. Ada tombol hapus per item dan "Hapus Semua". Data hilang jika browser cache di-clear.

#### `frontend/src/pages/About.jsx`
Halaman informasi model (`/about`). Berisi:
- Diagram pipeline horizontal alur model
- 5 model cards: IndoBERTweet, BiGRU, Attention, TKD, MTL
- Tabel 5 sumber dataset

#### `frontend/src/pages/Panduan.jsx`
Halaman panduan penggunaan (`/panduan`). Berisi:
- 3 langkah penggunaan (masukkan teks → cek → baca hasil)
- 3 severity cards (Lemah/Sedang/Kuat) dengan penjelasan dan contoh
- Disclaimer sistem AI

#### `frontend/src/pages/Login.jsx`
Halaman login admin (`/login`). Form username + password dengan toggle show/hide. Memanggil `useAuth()` hook yang POST ke `/admin/login`. Jika berhasil, token JWT disimpan ke `localStorage` dan redirect ke `/admin`.

#### `frontend/src/pages/Admin.jsx`
Dashboard admin (`/admin`) — protected route. Terdiri dari 5 section:

1. **Pilih Model Aktif** — menampilkan 4 model tersedia (3 split + Ibrohim), tombol switch model aktif via `/admin/set-model/{filename}`
2. **Upload Dataset** — drag & drop CSV, validasi kolom (`Tweet, HS, HS_Weak, HS_Moderate, HS_Strong`), preview 5 baris, stats CB/Non-CB, tombol Retrain
3. **Upload Kamus** — upload `abusive.csv` dan `new_kamusalay.csv` baru
4. **Status Training** — progress bar + log per epoch (loss, val_acc, val_f1), polling tiap 3 detik saat training berjalan
5. **Riwayat Model** — tabel versi model dari retrain, tombol Rollback

---

#### `frontend/src/hooks/usePredict.js`
Custom hook untuk halaman Deteksi. State: `text`, `result`, `loading`, `error`. Fungsi `predict()` memanggil `api.predict(text)`, menyimpan hasil ke state, dan menyimpan ke history via `addHistory()`. Fungsi `reset()` membersihkan semua state.

#### `frontend/src/hooks/useAuth.js`
Custom hook untuk login admin. Fungsi `login(username, password)` memanggil `api.adminLogin()`, menyimpan token ke `localStorage`, dan return `true/false`. State: `loading`, `error`.

---

#### `frontend/src/services/api.js`
Semua API calls terpusat di sini. Menggunakan axios instance dengan `baseURL` dari `VITE_API_URL` (default: `http://localhost:8000`).
- **Request interceptor:** otomatis attach `Authorization: Bearer <token>` dari localStorage ke setiap request
- **Response interceptor:** jika response 401 (token expired/invalid), hapus token dari localStorage dan redirect ke `/login`
- Fungsi: `predict`, `adminLogin`, `uploadDataset`, `uploadKamus`, `retrain`, `getTrainingStatus`, `getModelHistory`, `rollback`, `getAvailableModels`, `setModel`

---

#### `frontend/src/utils/severity.js`
Helper data untuk severity level. Berisi mapping `label`, `description` (penjelasan bahasa Indonesia), `color` (Tailwind text class), dan `bg` (Tailwind background class) untuk setiap level: `weak`, `moderate`, `strong`. Digunakan oleh `ResultCard.jsx` dan `Panduan.jsx`.

#### `frontend/src/utils/history.js`
Helper untuk riwayat prediksi di localStorage. Key: `bullycheck_history`, max 10 entri (yang lama otomatis terhapus). Fungsi: `getHistory()`, `addHistory(entry)`, `deleteEntry(id)`, `clearHistory()`. Entry berisi: `id`, `text`, `timestamp`, `label`, `severity`, `confidence`, `severity_confidence`, `toxicity_density`.

---

### BACKEND

#### `backend/app/main.py`
Entry point FastAPI. Mendaftarkan:
- CORS middleware (allow origin: `http://localhost:5173`)
- Router `predict` dan `admin`
- `lifespan` context manager: saat startup, inisialisasi `preprocessor` (load abusive + slang dict) dan `model_service` (load model `.pt` ke memori)

#### `backend/app/config.py`
Membaca environment variables dari `.env` menggunakan `pydantic-settings`. Setting: `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `MODEL_PATH`, `ABUSIVE_PATH`, `SLANG_PATH`, `DATASET_PATH`, `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH`. Instance `settings` diimport oleh semua modul lain.

---

#### `backend/app/routers/predict.py`
Router untuk endpoint publik `POST /predict`. Alur:
1. Terima `{ "text": "..." }` dari frontend
2. Validasi: tidak kosong, max 500 karakter
3. Panggil `preprocessor.process(text)` → dapat `(cleaned_text, tkd)`
4. Panggil `model_service.predict(cleaned_text, tkd)` → dapat hasil prediksi
5. Return JSON dengan `label`, `confidence`, `severity`, `severity_confidence`, `toxicity_density`

#### `backend/app/routers/admin.py`
Router untuk semua endpoint admin (`prefix: /admin`). Semua endpoint kecuali `/login` memerlukan JWT token via `Authorization: Bearer`. Endpoint:
- `POST /login` — verifikasi username+password, return JWT token
- `POST /upload-dataset` — simpan CSV ke `data/uploaded_dataset.csv`
- `POST /upload-kamus?type=abusive|slang` — update file kamus
- `POST /retrain` — mulai training background thread
- `GET /training-status` — return status training saat ini
- `GET /model-history` — baca `saved_models/history.json`
- `POST /rollback/{version}` — load model versi lama
- `GET /available-models` — list 4 model pretrained + status aktif
- `POST /set-model/{filename}` — ganti model aktif

---

#### `backend/app/services/preprocessor.py`
Preprocessing teks sebelum masuk model. Alur `process(text)`:
1. Lowercase
2. Hapus URL (`http`, `www`)
3. Hapus mention (`@user`) dan hashtag (`#tag`)
4. Hapus kata `user` dan `url` (artefak dataset Twitter)
5. Normalisasi slang via `new_kamusalay.csv` (15.225 entri)
6. Hapus karakter non-alfabet (angka, tanda baca)
7. Normalisasi whitespace
8. Hitung TKD: jumlah kata abusif / total kata (menggunakan `abusive.csv`, 134 kata)

Return: `(cleaned_text: str, tkd: float)`

Module-level `_instance` diinisialisasi saat startup via fungsi `init()`. Fungsi `process()` mengakses instance global ini.

#### `backend/app/services/model_service.py`
Load dan inference model PyTorch. State global: `_model`, `_tokenizer`, `_active_path`, `_device`.

Fungsi `load_model(path=None)`:
- Load tokenizer IndoBERTweet dari HuggingFace
- Inisialisasi `CyberbullyMultiTask` architecture
- Load state dict dari file `.pt`
- Set ke eval mode

Fungsi `predict(text, tkd)`:
- Tokenisasi teks (max 128 token, padding, truncation)
- Forward pass dengan `torch.no_grad()`
- `toxic` tensor shape: `(1, 1)` — sesuai arsitektur yang expect `tkd_fc(Linear 1→32)`
- Softmax output Task 1 → label + confidence
- Jika CB, softmax output Task 2 → severity + severity_confidence
- Return dict lengkap

#### `backend/app/services/trainer.py`
Logika retrain model di background thread. Dijalankan via `start()` yang spawn `threading.Thread`.

Alur `_run()`:
1. Baca dataset (`uploaded_dataset.csv` jika ada, fallback ke `DATASET_PATH` dari config)
2. Preprocessing semua teks dengan `preprocessor`
3. Split train/val (90/10, stratified)
4. Inisialisasi `CyberbullyMultiTask` baru
5. Training 5 epoch dengan:
   - `AdamW` optimizer (lr=2e-5, weight_decay=0.01)
   - `CosineAnnealingLR` scheduler
   - Loss Task1: `CrossEntropyLoss` dengan class weight proporsional
   - Loss Task2: `CrossEntropyLoss` dengan weight (Weak=1.0, Moderate=6.5, Strong=15.0)
   - Combined loss: `0.5 * loss1 + 0.5 * loss2`
   - Gradient clipping: `max_norm=1.0`
   - Task2 loss hanya dihitung untuk sampel CB (`lbl2 >= 0`)
6. Simpan best model (berdasarkan val macro F1) ke `saved_models/model_{timestamp}.pt`
7. Update `saved_models/history.json`
8. Reload model aktif via `model_service.load_model()`

Status training (`_status`) diupdate tiap epoch: `status`, `progress`, `logs`.

---

#### `backend/app/models/cyberbully_model.py`
Arsitektur PyTorch `CyberbullyMultiTask`. Sesuai persis dengan notebook `Cyberbullying_Detection_Model_V3.ipynb` CELL 7:

```
Input teks
    ↓
IndoBERTweet (AutoModel) → hidden states (batch, seq, 768)
    ↓
BiGRU (hidden=128, num_layers=2, bidirectional) → (batch, seq, 256)
    ↓
AttentionLayer → context vector (batch, 256)
    ↓
TKD scalar → tkd_fc (Linear 1→32, ReLU, Dropout) → (batch, 32)
    ↓
Concat → (batch, 288)  [256 + 32]
    ↓
Dropout(0.3)
    ↓
task1 head (Linear 288→128→2) → logits Task 1 (CB/Non-CB)
task2 head (Linear 288→128→3) → logits Task 2 (Weak/Moderate/Strong)
```

**Penting:** arsitektur ini harus identik dengan yang digunakan saat training file `.pt`. Jangan ubah tanpa retrain.

---

#### `backend/app/schemas/predict.py`
Pydantic v2 schema untuk endpoint `/predict`:
- `PredictRequest`: field `text: str`
- `PredictResponse`: field `label`, `confidence`, `severity` (optional), `severity_confidence` (optional), `toxicity_density`

#### `backend/app/schemas/admin.py`
Pydantic v2 schema untuk endpoint admin: `LoginRequest`, `LoginResponse` (berisi `access_token`), `TrainingLog`, `TrainingStatusResponse`, `ModelHistoryEntry`.

#### `backend/app/middleware/auth.py`
JWT authentication. Fungsi:
- `verify_password(plain, stored)`: mendukung bcrypt hash atau plaintext (untuk development)
- `create_access_token(username)`: buat JWT dengan expiry dari config
- `get_current_user(credentials)`: dependency FastAPI, decode JWT dan return username. Raise 401 jika invalid/expired.

---

#### `backend/data/abusive.csv`
Kamus 134 kata abusif bahasa Indonesia. Header baris pertama: `ABUSIVE`. Digunakan preprocessor untuk menghitung TKD. Bisa diupdate via Admin Panel (Upload Kamus → abusive).

#### `backend/data/new_kamusalay.csv`
Kamus 15.225 pasang slang → formal bahasa Indonesia. Format: `slang,formal` (no header). Digunakan preprocessor untuk normalisasi kata gaul/singkatan. Bisa diupdate via Admin Panel (Upload Kamus → slang).

#### `backend/data/data.csv`
Dataset Ibrohim (13.169 baris). Kolom: `Tweet, HS, Abusive, HS_Individual, HS_Group, HS_Religion, HS_Race, HS_Physical, HS_Gender, HS_Other, HS_Weak, HS_Moderate, HS_Strong`. Default dataset untuk retrain saat ini.

#### `backend/data/dataset_combined_labeled.csv`
Dataset gabungan (15.546 baris) dari TikTok, Instagram, Twitter, YouTube. Kolom: `Tweet, HS, HS_Weak, HS_Moderate, HS_Strong`.

---

#### `backend/saved_models/history.json`
JSON array riwayat model hasil retrain. Setiap entry: `version` (timestamp), `date`, `dataset_size`, `t1_acc`, `t2_acc`. Dibaca oleh endpoint `GET /admin/model-history` dan ditampilkan di Admin Panel.

#### `backend/saved_models/*.pt`
File bobot model PyTorch (±426MB tiap file). Tidak masuk Git. Tersedia:
- `best_model_v3_90_5_5.pt` — split 90/5/5 (default)
- `best_model_v3_80_10_10.pt` — split 80/10/10
- `best_model_v3_70_15_15.pt` — split 70/15/15
- `best_model_A_Ibrohim.pt` — trained dengan data.csv (Ibrohim)

#### `backend/scripts/generate_hash.py`
Script untuk mengganti password admin. Jalankan: `python scripts/generate_hash.py`. Akan minta input password baru, generate bcrypt hash, dan update otomatis ke `.env`.

#### `backend/.env`
Environment variables sensitif. **Jangan commit ke Git.**
```
SECRET_KEY=...
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=admin123   ← ganti dengan bcrypt hash untuk production
MODEL_PATH=./saved_models/best_model_v3_90_5_5.pt
DATASET_PATH=./data/data.csv
ABUSIVE_PATH=./data/abusive.csv
SLANG_PATH=./data/new_kamusalay.csv
```

#### `backend/requirements.txt`
Dependencies Python. Versi yang sudah diverifikasi untuk Python 3.9: `fastapi==0.111.0`, `torch==2.2.2`, `transformers==4.42.3`, `pydantic==2.7.4`, dll.

---

## HALAMAN DAN KOMPONEN

### 1. Halaman Deteksi (`/`)
Input teks → prediksi → tampilkan `ResultCard` → simpan ke riwayat

### 2. Halaman Riwayat (`/riwayat`)
10 prediksi terakhir dari localStorage. Hapus per item atau semua.

### 3. Halaman Tentang Model (`/about`)
Pipeline diagram, 5 model cards, info dataset.

### 4. Halaman Panduan (`/panduan`)
3 langkah penggunaan, penjelasan severity, disclaimer.

### 5. Halaman Login Admin (`/login`)
Form login. Token JWT disimpan di localStorage setelah berhasil.

### 6. Dashboard Admin (`/admin`) — Protected
Pilih model aktif, upload dataset/kamus, trigger retrain, lihat status training, riwayat model + rollback.

---

## DESIGN SYSTEM

```css
--bg-primary:   #0F172A   /* Background utama */
--bg-surface:   #1E293B   /* Card / surface */
--bg-border:    #334155   /* Border */
--accent:       #6366F1   /* Indigo — tombol, focus */
--accent-hover: #4F46E5
--non-cb:       #22C55E   /* Hijau */
--weak:         #EAB308   /* Kuning */
--moderate:     #F97316   /* Oranye */
--strong:       #EF4444   /* Merah */
--text-primary: #F1F5F9
font-family: Inter, system-ui, sans-serif
```

- Dark mode ONLY
- Card: `rounded-xl border border-slate-700`
- Button: `rounded-lg`
- Semua teks UI Bahasa Indonesia

---

## API ENDPOINTS

### Public
```
POST /predict
Body: { "text": "string" }
Response: { "label", "confidence", "severity", "severity_confidence", "toxicity_density" }
```

### Admin (Authorization: Bearer <token>)
```
POST   /admin/login
POST   /admin/upload-dataset
POST   /admin/upload-kamus?type=abusive|slang
POST   /admin/retrain
GET    /admin/training-status
GET    /admin/model-history
POST   /admin/rollback/{version}
GET    /admin/available-models
POST   /admin/set-model/{filename}
```

---

## CONVENTIONS

### React
- Functional components + hooks only
- Satu komponen per file, PascalCase
- Semua API calls via `services/api.js`
- `async/await` + `try/catch` wajib
- Protected route `/admin` cek JWT di localStorage

### Python / FastAPI
- Pydantic v2 untuk schema
- Semua endpoint `async def`
- `APIRouter` per domain
- Response selalu JSON
- Error format: `{ "detail": "pesan" }`

---

## CATATAN PENTING

1. **File `.pt` tidak ada di repo** — download dari Google Drive, simpan ke `backend/saved_models/`
2. **Admin credentials** — jangan hardcode, pakai `.env`
3. **Tidak ada database** — prediksi stateless, riwayat model di `history.json`, riwayat cek di localStorage browser
4. **CORS** — hanya izinkan `http://localhost:5173`
5. **Severity hanya muncul jika CB** — jika Non-CB, `severity = null`
6. **JWT di localStorage** — expire 60 menit, frontend auto redirect ke `/login` jika 401
7. **Arsitektur model harus cocok** — jangan ubah `cyberbully_model.py` tanpa retrain semua file `.pt`
8. **Preprocessing harus identik** — urutan di `preprocessor.py` harus sama dengan notebook training
