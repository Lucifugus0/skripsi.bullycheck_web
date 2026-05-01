import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  uploadDataset,
  uploadKamus,
  retrain,
  getTrainingStatus,
  getModelHistory,
  rollback,
} from '../services/api.js'

const REQUIRED_COLS = ['Tweet', 'HS', 'HS_Weak', 'HS_Moderate', 'HS_Strong']

const STATUS_LABEL = { idle: 'Idle', training: 'Training...', done: 'Selesai', error: 'Error' }
const STATUS_COLOR = {
  idle: 'text-slate-400 bg-slate-700',
  training: 'text-indigo-300 bg-indigo-500/20',
  done: 'text-green-300 bg-green-500/20',
  error: 'text-red-300 bg-red-500/20',
}

const parseCSV = (raw) => {
  const lines = raw.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return { error: 'File terlalu pendek atau tidak ada data.' }

  const headers = lines[0].split(',').map((h) => h.trim().replace(/"/g, ''))
  const missing = REQUIRED_COLS.filter((c) => !headers.includes(c))
  if (missing.length > 0) return { error: `Kolom tidak ditemukan: ${missing.join(', ')}` }

  const rows = lines.slice(1).map((line) => {
    const vals = line.split(',').map((v) => v.trim().replace(/"/g, ''))
    return headers.reduce((acc, h, i) => ({ ...acc, [h]: vals[i] ?? '' }), {})
  }).filter((r) => r.Tweet)

  const total = rows.length
  const cb = rows.filter((r) => r.HS === '1').length
  return { headers, preview: rows.slice(0, 5), stats: { total, cb, nonCb: total - cb } }
}

const SectionTitle = ({ children }) => (
  <h2 className="text-lg font-semibold text-white mb-4">{children}</h2>
)

const Admin = () => {
  const navigate = useNavigate()

  // Dataset
  const [isDragging, setIsDragging] = useState(false)
  const [datasetFile, setDatasetFile] = useState(null)
  const [parsed, setParsed] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadMsg, setUploadMsg] = useState(null)
  const fileInputRef = useRef(null)

  // Kamus
  const abusiveRef = useRef(null)
  const slangRef = useRef(null)
  const [abusiveLoading, setAbusiveLoading] = useState(false)
  const [slangLoading, setSlangLoading] = useState(false)
  const [abusiveMsg, setAbusiveMsg] = useState(null)
  const [slangMsg, setSlangMsg] = useState(null)

  // Training
  const [training, setTraining] = useState({ status: 'idle', progress: 0, logs: [] })
  const [startError, setStartError] = useState(null)

  // History
  const [history, setHistory] = useState([])
  const [rollingBack, setRollingBack] = useState(null)
  const [rollbackMsg, setRollbackMsg] = useState(null)

  useEffect(() => {
    getModelHistory().then(setHistory).catch(() => {})
  }, [])

  useEffect(() => {
    if (training.status !== 'training') return
    const id = setInterval(async () => {
      try {
        const data = await getTrainingStatus()
        setTraining(data)
        if (data.status === 'done' || data.status === 'error') {
          clearInterval(id)
          if (data.status === 'done') getModelHistory().then(setHistory).catch(() => {})
        }
      } catch {
        clearInterval(id)
      }
    }, 3000)
    return () => clearInterval(id)
  }, [training.status])

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const processFile = (file) => {
    if (!file?.name.endsWith('.csv')) {
      setParseError('Hanya file .csv yang diterima.')
      return
    }
    setDatasetFile(file)
    setParseError(null)
    setParsed(null)
    setUploadMsg(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = parseCSV(e.target.result)
      if (result.error) setParseError(result.error)
      else setParsed(result)
    }
    reader.readAsText(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    processFile(e.dataTransfer.files[0])
  }

  const handleRetrain = async () => {
    if (!datasetFile || !parsed) return
    setUploading(true)
    setStartError(null)
    try {
      await uploadDataset(datasetFile)
      await retrain()
      setTraining({ status: 'training', progress: 0, logs: [] })
      setUploadMsg(null)
    } catch (err) {
      setStartError(err.response?.data?.detail || 'Gagal memulai training.')
    } finally {
      setUploading(false)
    }
  }

  const handleKamus = async (type, file, setLoading, setMsg) => {
    if (!file) return
    setLoading(true)
    setMsg(null)
    try {
      await uploadKamus(type, file)
      setMsg({ ok: true, text: `${file.name} berhasil diupload.` })
    } catch (err) {
      setMsg({ ok: false, text: err.response?.data?.detail || 'Gagal upload.' })
    } finally {
      setLoading(false)
    }
  }

  const handleRollback = async (version) => {
    setRollingBack(version)
    setRollbackMsg(null)
    try {
      await rollback(version)
      const hist = await getModelHistory()
      setHistory(hist)
      setRollbackMsg({ ok: true, text: `Berhasil rollback ke versi ${version}.` })
    } catch (err) {
      setRollbackMsg({ ok: false, text: err.response?.data?.detail || 'Gagal rollback.' })
    } finally {
      setRollingBack(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Navbar */}
      <nav className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-indigo-400">BullyCheck</span>
            <span className="bg-indigo-500 text-white text-xs px-2 py-1 rounded font-medium">Admin Panel</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">

        {/* ── Section 1: Upload Dataset ── */}
        <section className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <SectionTitle>Upload Dataset</SectionTitle>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors mb-4 ${
              isDragging
                ? 'border-indigo-400 bg-indigo-500/10'
                : 'border-slate-600 hover:border-slate-500 hover:bg-slate-700/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => processFile(e.target.files[0])}
            />
            <p className="text-slate-300 text-sm mb-1">
              {datasetFile ? datasetFile.name : 'Drag & drop file CSV di sini, atau klik untuk memilih'}
            </p>
            <p className="text-slate-500 text-xs">
              Kolom wajib: Tweet, HS, HS_Weak, HS_Moderate, HS_Strong
            </p>
          </div>

          {parseError && (
            <p className="text-red-400 text-sm mb-4">{parseError}</p>
          )}

          {/* Preview */}
          {parsed && (
            <div className="mb-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Total', value: parsed.stats.total, color: 'text-white' },
                  { label: 'Cyberbullying', value: parsed.stats.cb, color: 'text-red-400' },
                  { label: 'Non-CB', value: parsed.stats.nonCb, color: 'text-green-400' },
                ].map((s) => (
                  <div key={s.label} className="bg-slate-900 rounded-lg p-3 text-center border border-slate-700">
                    <p className={`text-xl font-bold ${s.color}`}>{s.value.toLocaleString()}</p>
                    <p className="text-slate-400 text-xs mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Preview table */}
              <p className="text-slate-400 text-xs mb-2">Preview 5 baris pertama:</p>
              <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full text-xs text-slate-300">
                  <thead>
                    <tr className="bg-slate-900 text-slate-400">
                      {parsed.headers.map((h) => (
                        <th key={h} className="px-3 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.preview.map((row, i) => (
                      <tr key={i} className="border-t border-slate-700 hover:bg-slate-700/30">
                        {parsed.headers.map((h) => (
                          <td key={h} className="px-3 py-2 max-w-[200px] truncate" title={row[h]}>
                            {row[h]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {startError && <p className="text-red-400 text-sm mb-3">{startError}</p>}
          {uploadMsg && <p className="text-green-400 text-sm mb-3">{uploadMsg}</p>}

          <button
            onClick={handleRetrain}
            disabled={!parsed || uploading || training.status === 'training'}
            className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
          >
            {uploading ? 'Mengunggah...' : training.status === 'training' ? 'Training berjalan...' : 'Retrain Model'}
          </button>
        </section>

        {/* ── Section 2: Upload Kamus ── */}
        <section className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <SectionTitle>Upload Kamus (Opsional)</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Abusive */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <p className="text-white text-sm font-medium mb-1">Kamus Kata Abusif</p>
              <p className="text-slate-400 text-xs mb-3">abusive.csv — satu kata per baris</p>
              <input
                ref={abusiveRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => handleKamus('abusive', e.target.files[0], setAbusiveLoading, setAbusiveMsg)}
              />
              <button
                onClick={() => abusiveRef.current?.click()}
                disabled={abusiveLoading}
                className="w-full py-2 border border-slate-600 hover:border-indigo-500 text-slate-300 hover:text-white rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {abusiveLoading ? 'Mengunggah...' : 'Pilih File'}
              </button>
              {abusiveMsg && (
                <p className={`text-xs mt-2 ${abusiveMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
                  {abusiveMsg.text}
                </p>
              )}
            </div>

            {/* Slang */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <p className="text-white text-sm font-medium mb-1">Kamus Kata Gaul</p>
              <p className="text-slate-400 text-xs mb-3">new_kamusalay.csv — format: slang,baku</p>
              <input
                ref={slangRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => handleKamus('slang', e.target.files[0], setSlangLoading, setSlangMsg)}
              />
              <button
                onClick={() => slangRef.current?.click()}
                disabled={slangLoading}
                className="w-full py-2 border border-slate-600 hover:border-indigo-500 text-slate-300 hover:text-white rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {slangLoading ? 'Mengunggah...' : 'Pilih File'}
              </button>
              {slangMsg && (
                <p className={`text-xs mt-2 ${slangMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
                  {slangMsg.text}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ── Section 3: Status Training ── */}
        <section className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Status Training</SectionTitle>
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_COLOR[training.status]}`}>
              {STATUS_LABEL[training.status]}
            </span>
          </div>

          {/* Progress bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>Progress</span>
              <span>{training.progress ?? 0}%</span>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${training.progress ?? 0}%` }}
              />
            </div>
          </div>

          {/* Logs */}
          {training.logs?.length > 0 ? (
            <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700">
                    <th className="px-4 py-2 text-left">Epoch</th>
                    <th className="px-4 py-2 text-left">Loss</th>
                    <th className="px-4 py-2 text-left">Val Acc</th>
                    <th className="px-4 py-2 text-left">Val F1</th>
                  </tr>
                </thead>
                <tbody>
                  {training.logs.map((log, i) => (
                    <tr key={i} className="border-t border-slate-800 text-slate-300">
                      <td className="px-4 py-2">{log.epoch}</td>
                      <td className="px-4 py-2">{log.loss?.toFixed(4)}</td>
                      <td className="px-4 py-2">{(log.val_acc * 100)?.toFixed(1)}%</td>
                      <td className="px-4 py-2">{(log.val_f1 * 100)?.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">
              {training.status === 'idle'
                ? 'Belum ada training yang berjalan.'
                : training.status === 'training'
                ? 'Menunggu log epoch pertama...'
                : 'Training selesai.'}
            </p>
          )}
        </section>

        {/* ── Section 4: Riwayat Model ── */}
        <section className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <SectionTitle>Riwayat Model</SectionTitle>

          {rollbackMsg && (
            <p className={`text-sm mb-4 ${rollbackMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
              {rollbackMsg.text}
            </p>
          )}

          {history.length === 0 ? (
            <p className="text-slate-500 text-sm">Belum ada riwayat model tersimpan.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-900 text-slate-400 text-xs">
                    <th className="px-4 py-3 text-left">Versi</th>
                    <th className="px-4 py-3 text-left">Tanggal</th>
                    <th className="px-4 py-3 text-left">Dataset</th>
                    <th className="px-4 py-3 text-left">T1 Acc</th>
                    <th className="px-4 py-3 text-left">T2 Acc</th>
                    <th className="px-4 py-3 text-left"></th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.version} className="border-t border-slate-700 text-slate-300 hover:bg-slate-700/30">
                      <td className="px-4 py-3 font-mono text-indigo-400 text-xs">{row.version}</td>
                      <td className="px-4 py-3 text-xs">{new Date(row.date).toLocaleDateString('id-ID')}</td>
                      <td className="px-4 py-3 text-xs">{row.dataset_size?.toLocaleString()} baris</td>
                      <td className="px-4 py-3 text-xs">{(row.t1_acc * 100)?.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-xs">{(row.t2_acc * 100)?.toFixed(1)}%</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleRollback(row.version)}
                          disabled={rollingBack === row.version}
                          className="text-xs px-3 py-1 border border-slate-600 hover:border-indigo-500 text-slate-300 hover:text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                          {rollingBack === row.version ? 'Memproses...' : 'Rollback'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </main>
    </div>
  )
}

export default Admin
