import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'

const STEPS = [
  {
    number: '01',
    title: 'Masukkan Teks',
    desc: 'Ketik atau tempelkan teks berbahasa Indonesia yang ingin kamu periksa ke dalam kolom input. Maksimal 500 karakter per satu kali pengecekan.',
    note: 'Teks bisa berupa komentar, caption, pesan chat, atau unggahan media sosial.',
  },
  {
    number: '02',
    title: 'Klik "Cek Sekarang"',
    desc: 'Tekan tombol Cek Sekarang. Sistem akan memproses teks menggunakan model AI dan menampilkan hasilnya dalam beberapa detik.',
    note: 'Pastikan koneksi internet aktif karena analisis dilakukan oleh server.',
  },
  {
    number: '03',
    title: 'Baca Hasil Analisis',
    desc: 'Hasil menampilkan label (Cyberbullying / Non-Cyberbullying), tingkat keparahan, skor kepercayaan model, dan nilai toxicity density teks kamu.',
    note: 'Tingkat keparahan hanya muncul jika teks terdeteksi sebagai cyberbullying.',
  },
]

const SEVERITY_CARDS = [
  {
    level: 'Lemah',
    color: 'border-yellow-500/40 bg-yellow-500/5',
    badge: 'bg-yellow-500 text-white',
    textColor: 'text-yellow-400',
    desc: 'Mengandung kata-kata kurang sopan atau sindiran ringan yang berpotensi menyinggung. Biasanya tidak disertai ancaman eksplisit.',
    examples: ['Ejekan ringan', 'Sindiran tidak langsung', 'Kata kasar tunggal'],
  },
  {
    level: 'Sedang',
    color: 'border-orange-500/40 bg-orange-500/5',
    badge: 'bg-orange-500 text-white',
    textColor: 'text-orange-400',
    desc: 'Mengandung serangan personal, hinaan berbasis identitas, atau konten yang jelas bertujuan merendahkan seseorang.',
    examples: ['Penghinaan personal', 'Labeling negatif berulang', 'Konten merendahkan'],
  },
  {
    level: 'Kuat',
    color: 'border-red-500/40 bg-red-500/5',
    badge: 'bg-red-500 text-white',
    textColor: 'text-red-400',
    desc: 'Mengandung ancaman, hasutan kekerasan, atau konten ekstrem yang berpotensi memberikan dampak psikologis serius pada korban.',
    examples: ['Ancaman eksplisit', 'Hasutan kebencian', 'Konten diskriminatif ekstrem'],
  },
]

const Panduan = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">

        {/* Header */}
        <h1 className="text-3xl font-bold text-white mb-2">Panduan Penggunaan</h1>
        <p className="text-slate-400 mb-10">
          Ikuti tiga langkah mudah ini untuk menggunakan BullyCheck secara efektif.
        </p>

        {/* Steps */}
        <section className="mb-12">
          <div className="space-y-4">
            {STEPS.map((step, i) => (
              <div
                key={step.number}
                className="bg-slate-800 border border-slate-700 rounded-xl p-6 flex gap-6"
              >
                <div className="shrink-0">
                  <span className="text-3xl font-bold text-slate-700 font-mono">{step.number}</span>
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg mb-2">{step.title}</h3>
                  <p className="text-slate-300 text-sm leading-relaxed mb-3">{step.desc}</p>
                  <div className="flex items-start gap-2 bg-slate-900 rounded-lg px-4 py-2">
                    <span className="text-indigo-400 text-xs mt-0.5">ℹ</span>
                    <p className="text-slate-400 text-xs leading-relaxed">{step.note}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Severity Explanation */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-white mb-4">Tingkat Keparahan (Severity)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SEVERITY_CARDS.map((card) => (
              <div key={card.level} className={`border rounded-xl p-5 ${card.color}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs px-2 py-1 rounded font-medium ${card.badge}`}>
                    {card.level}
                  </span>
                </div>
                <p className="text-slate-300 text-sm leading-relaxed mb-3">{card.desc}</p>
                <ul className="space-y-1">
                  {card.examples.map((ex) => (
                    <li key={ex} className="flex items-center gap-2 text-slate-400 text-xs">
                      <span className={`w-1 h-1 rounded-full shrink-0 ${card.textColor.replace('text-', 'bg-')}`} />
                      {ex}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Disclaimer */}
        <section>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
            <h2 className="text-white font-semibold mb-3">Disclaimer</h2>
            <div className="space-y-2 text-slate-400 text-sm leading-relaxed">
              <p>
                BullyCheck adalah sistem berbasis AI dan tidak sempurna. Hasil deteksi bersifat
                prediktif dan dapat mengandung kesalahan, terutama untuk teks dengan konteks sarkasme,
                ironi, atau bahasa daerah yang tidak umum.
              </p>
              <p>
                Sistem ini <span className="text-white">tidak</span> menyimpan teks yang kamu masukkan.
                Semua analisis dilakukan secara real-time dan tidak digunakan untuk keperluan lain.
              </p>
              <p>
                BullyCheck ditujukan sebagai alat bantu edukasi dan kesadaran, bukan sebagai
                pengganti penilaian manusia dalam konteks hukum atau klinis.
              </p>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  )
}

export default Panduan
