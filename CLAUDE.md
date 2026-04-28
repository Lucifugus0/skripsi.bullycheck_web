# CLAUDE.md — BullyCheck Project

## PROJECT OVERVIEW

**BullyCheck** adalah website deteksi cyberbullying berbahasa Indonesia berbasis AI.
Sistem ini menjalankan dua tugas sekaligus dalam satu model (Multi-Task Learning):
- **Task 1:** Deteksi teks sebagai Cyberbullying (CB) atau Non-Cyberbullying (Non-CB)
- **Task 2:** Klasifikasi severity → Weak / Moderate / Strong

Model: IndoBERTweet + BiGRU + Attention Mechanism + Toxicity Keyword Density (TKD) + ANN Multi-Task Learning

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

## STRUKTUR FOLDER

```
bullycheck/
├── frontend/                  # React + Vite
│   ├── public/
│   ├── src/
│   │   ├── components/        # Komponen reusable
│   │   │   ├── Navbar.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── ResultCard.jsx
│   │   │   ├── SeverityBadge.jsx
│   │   │   └── ConfidenceBar.jsx
│   │   ├── pages/             # Satu file per halaman
│   │   │   ├── Deteksi.jsx    # Route: /
│   │   │   ├── About.jsx      # Route: /about
│   │   │   ├── Panduan.jsx    # Route: /panduan
│   │   │   ├── Login.jsx      # Route: /login
│   │   │   └── Admin.jsx      # Route: /admin
│   │   ├── hooks/             # Custom hooks
│   │   │   ├── usePredict.js
│   │   │   └── useAuth.js
│   │   ├── services/          # API calls
│   │   │   └── api.js
│   │   ├── utils/             # Helper functions
│   │   │   └── severity.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── backend/                   # FastAPI
│   ├── app/
│   │   ├── main.py            # Entry point FastAPI
│   │   ├── routers/
│   │   │   ├── predict.py     # POST /predict
│   │   │   └── admin.py       # POST /admin/*
│   │   ├── services/
│   │   │   ├── model.py       # Load + inference model
│   │   │   ├── preprocessor.py # Preprocessing + TKD
│   │   │   └── trainer.py     # Retrain logic
│   │   ├── models/
│   │   │   └── cyberbully_model.py  # Arsitektur PyTorch
│   │   ├── schemas/
│   │   │   ├── predict.py     # Pydantic input/output schema
│   │   │   └── admin.py       # Pydantic admin schema
│   │   ├── middleware/
│   │   │   └── auth.py        # JWT middleware
│   │   └── config.py          # Settings (env vars)
│   ├── data/
│   │   ├── abusive.csv
│   │   └── new_kamusalay.csv
│   ├── saved_models/          # .pt files disimpan di sini
│   ├── requirements.txt
│   └── .env
│
└── CLAUDE.md
```

---

## HALAMAN DAN KOMPONEN

### 1. Halaman Deteksi (`/`) — `pages/Deteksi.jsx`

**Komponen:**
- `<Navbar />` — logo BullyCheck + link ke /about dan /panduan
- Hero section — judul dan tagline
- `<textarea>` — input teks + character counter (max 500 karakter)
- Tombol "Cek Sekarang" — disabled jika input kosong
- Loading state — spinner saat menunggu response API
- `<ResultCard />` — muncul setelah prediksi selesai
- Tombol "Reset" — clear input dan result
- `<Footer />`

**ResultCard berisi:**
- Label CB / Non-CB (dengan warna sesuai)
- `<SeverityBadge />` — hanya muncul jika CB
- `<ConfidenceBar />` — progress bar confidence score
- Nilai TKD (toxicity density)
- Penjelasan singkat severity dalam bahasa Indonesia

---

### 2. Halaman Tentang Model (`/about`) — `pages/About.jsx`

**Komponen:**
- `<Navbar />`
- Header section
- Pipeline visualization — diagram horizontal alur model
- 5 Model Cards: IndoBERTweet, BiGRU, Attention, TKD, MTL
- Dataset info section — 5 sumber dataset
- `<Footer />`

---

### 3. Halaman Panduan (`/panduan`) — `pages/Panduan.jsx`

**Komponen:**
- `<Navbar />`
- Header section
- Steps section — 3 langkah penggunaan
- Severity explanation — 3 card (Weak/Moderate/Strong)
- Disclaimer section
- `<Footer />`

---

### 4. Halaman Login Admin (`/login`) — `pages/Login.jsx`

**Komponen:**
- Logo + teks "Admin Panel" di tengah
- Form card: input username + input password + tombol Masuk
- Pesan error merah jika kredensial salah
- Toggle show/hide password
- Setelah berhasil → redirect ke /admin
- TIDAK ada link ke halaman ini dari navbar publik

---

### 5. Halaman Dashboard Admin (`/admin`) — `pages/Admin.jsx`

**Protected route** — redirect ke /login jika tidak ada JWT token

**Komponen:**
- Navbar Admin: logo + badge "Admin Panel" + tombol Logout
- Section Upload Dataset:
  - Drag & drop atau file picker CSV
  - Validasi kolom: Tweet, HS, HS_Weak, HS_Moderate, HS_Strong
  - Preview 5 baris pertama (tabel)
  - Info stats: Total / CB / Non-CB
  - Tombol "Retrain Model"
- Section Upload Kamus (Opsional):
  - Slot 1: abusive.csv
  - Slot 2: new_kamusalay.csv
  - Status file aktif saat ini
- Section Status Training:
  - Progress bar
  - Log per epoch: Loss / Val Acc / Val F1
  - Status badge: Idle / Training / Done / Error
- Section Riwayat Model:
  - Tabel: versi, tanggal, dataset size, T1 Acc, T2 Acc
  - Tombol Rollback per baris

---

## DESIGN SYSTEM

```css
/* Warna utama */
--bg-primary:   #0F172A   /* Background utama */
--bg-surface:   #1E293B   /* Card / surface */
--bg-border:    #334155   /* Border */
--accent:       #6366F1   /* Indigo — tombol, focus */
--accent-hover: #4F46E5

/* Severity colors */
--non-cb:    #22C55E   /* Hijau */
--weak:      #EAB308   /* Kuning */
--moderate:  #F97316   /* Oranye */
--strong:    #EF4444   /* Merah */

/* Text */
--text-primary:   #F1F5F9
--text-secondary: #94A3B8
--text-muted:     #64748B

/* Font */
font-family: Inter, system-ui, sans-serif
```

**Style rules:**
- Dark mode ONLY — tidak ada light mode
- Border radius card: 12px (`rounded-xl`)
- Border radius button: 8px (`rounded-lg`)
- Semua card pakai `border border-slate-700`
- Semua teks bahasa Indonesia
- Responsive: mobile-first
- Tidak ada animasi berlebihan — smooth transition saja

---

## API ENDPOINTS

### Public

```
POST /predict
Content-Type: application/json

Body:
{
  "text": "string"
}

Response:
{
  "label": "cyberbullying" | "non-cyberbullying",
  "confidence": 0.87,
  "severity": "weak" | "moderate" | "strong" | null,
  "severity_confidence": 0.76 | null,
  "toxicity_density": 0.33
}
```

### Admin (perlu JWT token di header)

```
POST   /admin/login
POST   /admin/upload-dataset
POST   /admin/upload-kamus
POST   /admin/retrain
GET    /admin/training-status
GET    /admin/model-history
POST   /admin/rollback/{version}
```

**Header untuk admin routes:**
```
Authorization: Bearer <jwt_token>
```

---

## CONVENTIONS DAN CODING RULES

### React / JavaScript

- Gunakan functional components + hooks ONLY — tidak ada class components
- Satu komponen per file
- Nama file komponen: PascalCase (`ResultCard.jsx`)
- Nama file utils/hooks: camelCase (`usePredict.js`)
- Gunakan `const` bukan `let` untuk deklarasi fungsi komponen
- Import CSS Tailwind melalui `index.css` — tidak ada inline style kecuali untuk dynamic values
- Gunakan `axios` untuk semua API calls — tidak ada `fetch` langsung
- Semua API calls taruh di `services/api.js`
- Gunakan `async/await` — tidak ada `.then().catch()`
- Error handling wajib ada di setiap API call dengan `try/catch`
- Gunakan `react-router-dom` v6 untuk routing (`useNavigate`, `useLocation`)
- Protected route untuk `/admin` — cek JWT di localStorage

### Tailwind CSS

- Gunakan Tailwind classes ONLY — tidak ada custom CSS kecuali di `index.css` untuk variabel global
- Urutan class: layout → spacing → sizing → color → typography → border → shadow → transition
- Gunakan `slate` untuk warna neutral (slate-800, slate-700, dll)
- Gunakan `indigo-500` untuk accent color
- Responsive breakpoints: `sm:` `md:` `lg:`

### FastAPI / Python

- Gunakan Pydantic v2 untuk semua schema
- Semua endpoint async (`async def`)
- Gunakan `APIRouter` per domain — tidak semua di `main.py`
- Gunakan `python-jose` untuk JWT
- Gunakan `python-dotenv` untuk environment variables
- Format response selalu JSON — tidak ada plain text response
- Error response format:
  ```json
  { "detail": "pesan error" }
  ```
- CORS: allow origins dari `http://localhost:5173` saat development

### Model

- Model dimuat sekali saat startup FastAPI menggunakan `lifespan` context manager
- Model disimpan sebagai `best_model_v3_90_5_5.pt`
- Gunakan `torch.no_grad()` untuk semua inference
- Gunakan `device = "cuda" if torch.cuda.is_available() else "cpu"`

---

## ENVIRONMENT VARIABLES

### Backend (`.env`)
```
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
MODEL_PATH=./saved_models/best_model_v3_90_5_5.pt
ABUSIVE_PATH=./data/abusive.csv
SLANG_PATH=./data/new_kamusalay.csv
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<bcrypt hash>
```

### Frontend (`.env`)
```
VITE_API_URL=http://localhost:8000
```

---

## CARA JALANKAN (DEVELOPMENT)

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Buka http://localhost:5173
```

---

## DEPENDENCIES

### Backend (`requirements.txt`)
```
fastapi
uvicorn[standard]
torch
transformers
python-jose[cryptography]
passlib[bcrypt]
python-dotenv
pandas
numpy
pydantic
python-multipart
```

### Frontend (`package.json` dependencies)
```
react
react-dom
react-router-dom
axios
tailwindcss
@vitejs/plugin-react
vite
```

---

## CATATAN PENTING

1. **Model tidak ada di repo** — file `.pt` terlalu besar untuk Git. Simpan di Google Drive dan download manual ke `backend/saved_models/`

2. **Admin credentials** — jangan hardcode di kode. Selalu pakai `.env`. Password disimpan sebagai bcrypt hash.

3. **Tidak ada database** — sistem ini stateless untuk prediksi. Riwayat model disimpan sebagai file JSON di `backend/saved_models/history.json`

4. **CORS** — wajib dikonfigurasi di `main.py` agar frontend bisa hit backend

5. **Severity hanya ditampilkan jika CB** — jika label Non-CB, severity null dan tidak ditampilkan di UI

6. **JWT disimpan di localStorage** — untuk proteksi route /admin di frontend

7. **Semua teks UI dalam Bahasa Indonesia** — termasuk label, pesan error, placeholder

8. **Halaman /login tidak ada di navbar** — diakses langsung via URL `/login`
