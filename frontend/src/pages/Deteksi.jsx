import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'
import ResultCard from '../components/ResultCard.jsx'
import { usePredict } from '../hooks/usePredict.js'

const Deteksi = () => {
  const { text, setText, result, loading, predict, reset } = usePredict()

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">BullyCheck</h1>
        <p className="text-slate-400 mb-8">Deteksi cyberbullying berbahasa Indonesia berbasis AI.</p>

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 mb-6">
          <textarea
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-4 text-slate-100 placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500 transition-colors"
            rows={5}
            maxLength={300}
            placeholder="Masukkan teks yang ingin dicek..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-slate-500 text-sm">{text.length}/300</span>
            <div className="flex gap-3">
              {result && (
                <button
                  onClick={reset}
                  className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Reset
                </button>
              )}
              <button
                onClick={predict}
                disabled={!text.trim() || loading}
                className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                {loading ? 'Memeriksa...' : 'Cek Sekarang'}
              </button>
            </div>
          </div>
        </div>

        {result && <ResultCard result={result} />}
      </main>
      <Footer />
    </div>
  )
}

export default Deteksi
