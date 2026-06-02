import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'

const PIPELINE_STEPS = [
  { label: 'Teks Input', desc: 'Raw text' },
  { label: 'Preprocessing', desc: 'Cleaning & normalisasi' },
  { label: 'IndoBERTweet', desc: 'Embedding kontekstual' },
  { label: 'BiGRU + Attention', desc: 'Sequence modeling' },
  { label: 'TKD', desc: 'Toxicity density' },
  { label: 'ANN MTL', desc: 'Multi-task output' },
]

const MODEL_CARDS = [
  {
    title: 'IndoBERTweet',
    tag: 'Pre-trained LM',
    color: 'border-indigo-500/40 bg-indigo-500/5',
    tagColor: 'bg-indigo-500/20 text-indigo-300',
    desc: 'Model BERT yang di-pretrain khusus pada data Twitter berbahasa Indonesia. Menghasilkan representasi vektor yang memahami konteks dan nuansa bahasa gaul/informal.',
  },
  {
    title: 'BiGRU',
    tag: 'Sequence Model',
    color: 'border-violet-500/40 bg-violet-500/5',
    tagColor: 'bg-violet-500/20 text-violet-300',
    desc: 'Bidirectional Gated Recurrent Unit memproses urutan token dari dua arah (kiri ke kanan dan kanan ke kiri) untuk menangkap dependensi jangka panjang dalam kalimat.',
  },
  {
    title: 'Attention Mechanism',
    tag: 'Fokus Selektif',
    color: 'border-purple-500/40 bg-purple-500/5',
    tagColor: 'bg-purple-500/20 text-purple-300',
    desc: 'Mekanisme perhatian yang memberikan bobot berbeda pada setiap token. Kata-kata yang paling berkontribusi terhadap prediksi akan mendapat bobot lebih tinggi.',
  },
  {
    title: 'TKD',
    tag: 'Fitur Tambahan',
    color: 'border-amber-500/40 bg-amber-500/5',
    tagColor: 'bg-amber-500/20 text-amber-300',
    desc: 'Toxicity Keyword Density menghitung proporsi kata-kata kasar/abusif dalam teks menggunakan kamus kata abusif bahasa Indonesia sebagai fitur pendukung.',
  },
  {
    title: 'ANN Multi-Task',
    tag: 'Output Layer',
    color: 'border-sky-500/40 bg-sky-500/5',
    tagColor: 'bg-sky-500/20 text-sky-300',
    desc: 'Jaringan saraf tiruan yang menjalankan dua tugas sekaligus: klasifikasi biner (CB vs Non-CB) dan klasifikasi severity (Lemah / Sedang / Kuat) dalam satu forward pass.',
  },
]


const About = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">

        {/* Header */}
        <h1 className="text-3xl font-bold text-white mb-2">Tentang Model</h1>
        <p className="text-slate-400 mb-10">
          BullyCheck menggunakan arsitektur Multi-Task Learning berbasis IndoBERTweet untuk mendeteksi
          cyberbullying dan tingkat keparahannya secara bersamaan.
        </p>

        {/* Pipeline */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-white mb-4">Alur Pemrosesan</h2>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 overflow-x-auto">
            <div className="flex items-start gap-2 min-w-max">
              {PIPELINE_STEPS.map((step, i) => (
                <div key={step.label} className="flex items-center gap-2">
                  <div className="flex flex-col items-center">
                    <div className="bg-slate-700 border border-slate-600 rounded-lg px-4 py-2 text-center min-w-[110px]">
                      <p className="text-white text-sm font-medium">{step.label}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                  {i < PIPELINE_STEPS.length - 1 && (
                    <span className="text-slate-500 text-lg select-none">›</span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-between text-xs text-slate-500 px-1">
              <span>Input</span>
              <span>Output: Label + Severity</span>
            </div>
          </div>
        </section>

        {/* Model Cards */}
        <section className="mb-12">
          <h2 className="text-lg font-semibold text-white mb-4">Komponen Model</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MODEL_CARDS.map((card) => (
              <div
                key={card.title}
                className={`border rounded-xl p-5 ${card.color}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-white font-semibold">{card.title}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${card.tagColor}`}>
                    {card.tag}
                  </span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </section>


      </main>
      <Footer />
    </div>
  )
}

export default About
