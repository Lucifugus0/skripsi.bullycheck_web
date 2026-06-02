import { useState, useEffect } from 'react'
import Navbar from '../components/Navbar.jsx'
import Footer from '../components/Footer.jsx'
import SeverityBadge from '../components/SeverityBadge.jsx'
import { getHistory, deleteEntry, clearHistory } from '../utils/history.js'

const formatTime = (iso) => {
  const d = new Date(iso)
  return d.toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const Riwayat = () => {
  const [history, setHistory] = useState([])

  useEffect(() => {
    setHistory(getHistory())
  }, [])

  const handleDelete = (id) => {
    deleteEntry(id)
    setHistory(getHistory())
  }

  const handleClear = () => {
    clearHistory()
    setHistory([])
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900">
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-12">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Riwayat Cek</h1>
            <p className="text-slate-400 mt-1">
              {history.length === 0
                ? 'Belum ada riwayat.'
                : `${history.length} hasil terakhir disimpan di browser.`}
            </p>
          </div>
          {history.length > 0 && (
            <button
              onClick={handleClear}
              className="text-sm text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-400 px-3 py-1.5 rounded-lg transition-colors"
            >
              Hapus Semua
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-12 text-center">
            <p className="text-slate-500 text-sm">
              Belum ada teks yang dicek. Coba gunakan fitur deteksi dulu.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry) => {
              const isCB = entry.label === 'cyberbullying'
              return (
                <div
                  key={entry.id}
                  className="bg-slate-800 border border-slate-700 rounded-xl p-5"
                >
                  {/* Header: label + waktu + hapus */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`font-semibold text-sm ${isCB ? 'text-red-400' : 'text-green-400'}`}>
                        {isCB ? 'Cyberbullying' : 'Non-Cyberbullying'}
                      </span>
                      {isCB && entry.severity && (
                        <SeverityBadge severity={entry.severity} />
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-slate-500 text-xs">{formatTime(entry.timestamp)}</span>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-slate-600 hover:text-red-400 transition-colors text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Teks input */}
                  <p className="text-slate-300 text-sm bg-slate-900 rounded-lg px-4 py-3 mb-3 leading-relaxed">
                    {entry.text}
                  </p>

                  {/* Stats */}
                  <div className="flex gap-4 text-xs text-slate-400">
                    <span>
                      Kepercayaan:{' '}
                      <span className="text-slate-200 font-medium">
                        {Math.round((entry.confidence ?? 0) * 100)}%
                      </span>
                    </span>
                    <span>
                      TKD:{' '}
                      <span className="text-slate-200 font-medium">
                        {entry.toxicity_density?.toFixed(2) ?? '0.00'}
                      </span>
                    </span>
                    {isCB && entry.severity_confidence && (
                      <span>
                        Severity conf:{' '}
                        <span className="text-slate-200 font-medium">
                          {Math.round(entry.severity_confidence * 100)}%
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  )
}

export default Riwayat
