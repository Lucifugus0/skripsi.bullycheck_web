# BullyCheck — Sistem Deteksi Cyberbullying Berbahasa Indonesia

Aplikasi web deteksi cyberbullying berbahasa Indonesia berbasis AI dengan pendekatan Multi-Task Learning. Sistem mendeteksi apakah suatu teks mengandung cyberbullying sekaligus mengklasifikasikan tingkat keparahannya (Lemah / Sedang / Kuat) dalam satu model.

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | React 18 + Vite + JavaScript |
| Styling | Tailwind CSS |
| Backend | FastAPI (Python) |
| Model AI | PyTorch + HuggingFace Transformers |
| Arsitektur Model | IndoBERTweet + BiGRU + Attention Mechanism + TKD + Multi-Task Learning |
| Autentikasi | JWT Token (khusus admin) |
| HTTP Client | Axios |
| Routing | React Router DOM v6 |

---

## System Requirements

| Kebutuhan | Spesifikasi |
|---|---|
| Node.js | v18 atau lebih baru |
| Python | 3.9 atau lebih baru |
| RAM | Minimal 8 GB (untuk load model AI) |
| Storage | Minimal 2 GB (setiap file model ±426 MB) |
| Koneksi Internet | Diperlukan saat pertama kali menjalankan backend (unduh tokenizer IndoBERTweet ~500 MB dari HuggingFace) |

---

## Ketentuan yang Perlu Diinstall

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend
```bash
cd frontend
npm install
```

> **Catatan:** File model (`.pt`) tidak disertakan di repository karena ukurannya besar. Letakkan minimal satu file `.pt` ke folder `backend/saved_models/` sebelum menjalankan backend.

---

## Cara Menjalankan Frontend dan Backend

### Backend (Terminal 1)

**Pertama kali / setelah clone ulang:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Selanjutnya (sudah pernah install):**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

Tunggu hingga muncul pesan `Application startup complete.` sebelum membuka aplikasi.

### Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```

**Jika port sudah terpakai:**
```bash
lsof -ti:8000 | xargs kill -9   # reset port backend
lsof -ti:5173 | xargs kill -9   # reset port frontend
```

---

## Akses Aplikasi

| Halaman | URL |
|---|---|
| Deteksi Cyberbullying | http://localhost:5173/ |
| Riwayat Pemeriksaan | http://localhost:5173/riwayat |
| Tentang Model | http://localhost:5173/about |
| Panduan Penggunaan | http://localhost:5173/panduan |
| Login Admin | http://localhost:5173/login |
| Dashboard Admin | http://localhost:5173/admin |
| Dokumentasi API | http://localhost:8000/docs |

---

## Kredensial Admin

| Field | Nilai |
|---|---|
| Username | `admin` |
| Password | `admin123` |

Untuk mengganti password:
```bash
cd backend
source venv/bin/activate
python scripts/generate_hash.py
```

---

## Cara Menggunakan Aplikasi

### Pengguna Umum

- **Deteksi Teks** — Masukkan teks (maks. 500 karakter) pada halaman utama, klik **Cek Sekarang**. Sistem akan menampilkan:
  - Label: Cyberbullying atau Non-Cyberbullying
  - Tingkat Keparahan: Lemah / Sedang / Kuat (hanya jika terdeteksi CB)
  - Confidence Score dan Toxicity Keyword Density (TKD)
- **Riwayat** — Halaman `/riwayat` menampilkan 10 hasil pemeriksaan terakhir yang tersimpan di browser. Data dapat dihapus per item atau sekaligus.
- **Tentang Model** — Halaman `/about` menjelaskan arsitektur dan komponen model AI.
- **Panduan** — Halaman `/panduan` berisi langkah penggunaan dan penjelasan tingkat keparahan.

### Admin Panel

Login melalui http://localhost:5173/login, kemudian akses Dashboard Admin dengan fitur:

- **Pilih Model Aktif** — Memilih model `.pt` yang digunakan untuk prediksi. Menampilkan statistik model (akurasi, Macro F1, confusion matrix) jika sudah diinput.
- **Input Statistik Model** — Admin dapat menginput nilai akurasi, Macro F1, dan mengunggah gambar confusion matrix untuk model yang sedang aktif.
- **Upload Dataset** — Mengunggah dataset CSV baru untuk proses retrain. Terdapat preview data dan statistik jumlah CB/Non-CB sebelum training dimulai.
- **Retrain Model** — Memulai proses pelatihan ulang model di background. Progress dapat dipantau di section Status Training.
- **Upload Kamus** — Memperbarui kamus kata abusif (`abusive.csv`) atau kamus kata gaul/singkatan (`new_kamusalay.csv`).
- **Riwayat Model** — Menampilkan daftar model hasil retrain beserta akurasi dan tanggal training. Tersedia tombol Rollback untuk kembali ke versi sebelumnya.

---

## Format CSV

### Dataset (untuk Upload Dataset & Retrain)

```csv
Tweet,HS,HS_Weak,HS_Moderate,HS_Strong
"contoh teks cyberbullying",1,1,0,0
"contoh teks biasa",0,0,0,0
```

| Kolom | Keterangan |
|---|---|
| `Tweet` | Teks yang akan diklasifikasi |
| `HS` | 1 = Cyberbullying, 0 = Non-Cyberbullying |
| `HS_Weak` | 1 jika termasuk severity Lemah, selain itu 0 |
| `HS_Moderate` | 1 jika termasuk severity Sedang, selain itu 0 |
| `HS_Strong` | 1 jika termasuk severity Kuat, selain itu 0 |

Kolom tambahan di luar 5 kolom di atas akan diabaikan secara otomatis.

### Kamus Kata Abusif (`abusive.csv`)

```csv
ABUSIVE
anjing
goblok
bajingan
```

- Baris pertama wajib berisi header `ABUSIVE`
- Satu kata per baris, tanpa tanda baca

### Kamus Kata Gaul / Singkatan (`new_kamusalay.csv`)

```csv
gw,saya
lo,kamu
gak,tidak
yg,yang
```

- Tidak ada header
- Format tiap baris: `kata_slang,kata_baku`
- Digunakan untuk normalisasi teks sebelum masuk model
