import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  uploadDataset,
  uploadKamus,
  retrain,
  getTrainingStatus,
  getModelHistory,
  rollback,
  getAvailableModels,
  setModel,
  getModelStats,
  saveModelStats,
  uploadModelCM,
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

  // Model selection
  const [availableModels, setAvailableModels] = useState(null)
  const [switchingModel, setSwitchingModel] = useState(null)
  const [switchMsg, setSwitchMsg] = useState(null)

  // Model stats
  const [modelStats, setModelStats] = useState(null)
  const [statsEditOpen, setStatsEditOpen] = useState(false)
  const [editT1Accuracy, setEditT1Accuracy] = useState('')
  const [editT1MacroF1, setEditT1MacroF1] = useState('')
  const [editT2Accuracy, setEditT2Accuracy] = useState('')
  const [editT2MacroF1, setEditT2MacroF1] = useState('')
  const [cmFile1, setCmFile1] = useState(null)
  const [cmFile2, setCmFile2] = useState(null)
  const [statsMsg, setStatsMsg] = useState(null)
  const [statsSaving, setStatsSaving] = useState(false)
  const cmInput1Ref = useRef(null)
  const cmInput2Ref = useRef(null)

  useEffect(() => {
    getModelHistory().then(setHistory).catch(() => {})
    getAvailableModels().then(setAvailableModels).catch(() => setAvailableModels([]))
  }, [])

  useEffect(() => {
    const active = (availableModels ?? []).find((m) => m.active)
    if (!active) return
    setModelStats(null)
    setStatsEditOpen(false)
    getModelStats(active.filename).then(setModelStats).catch(() => setModelStats({}))
  }, [availableModels])

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

  const handleSaveStats = async () => {
    const active = (availableModels ?? []).find((m) => m.active)
    if (!active) return
    setStatsSaving(true)
    setStatsMsg(null)
    try {
      const t1acc = editT1Accuracy !== '' ? parseFloat(editT1Accuracy) : null
      const t1f1  = editT1MacroF1  !== '' ? parseFloat(editT1MacroF1)  : null
      const t2acc = editT2Accuracy !== '' ? parseFloat(editT2Accuracy) : null
      const t2f1  = editT2MacroF1  !== '' ? parseFloat(editT2MacroF1)  : null
      if (t1acc !== null || t1f1 !== null || t2acc !== null || t2f1 !== null) {
        await saveModelStats(active.filename, t1acc, t1f1, t2acc, t2f1)
      }
      if (cmFile1) { await uploadModelCM(active.filename, 1, cmFile1); setCmFile1(null) }
      if (cmFile2) { await uploadModelCM(active.filename, 2, cmFile2); setCmFile2(null) }
      const updated = await getModelStats(active.filename)
      setModelStats(updated)
      setStatsMsg({ ok: true, text: 'Statistik berhasil disimpan.' })
      setStatsEditOpen(false)
    } catch (err) {
      setStatsMsg({ ok: false, text: err.response?.data?.detail || 'Gagal menyimpan statistik.' })
    } finally {
      setStatsSaving(false)
    }
  }

  const handleSetModel = async (filename) => {
    setSwitchingModel(filename)
    setSwitchMsg(null)
    try {
      await setModel(filename)
      const models = await getAvailableModels()
      setAvailableModels(models)
      setSwitchMsg({ ok: true, text: `Model aktif: ${filename}` })
    } catch (err) {
      setSwitchMsg({ ok: false, text: err.response?.data?.detail || 'Gagal mengganti model.' })
    } finally {
      setSwitchingModel(null)
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

        {/* ── Section 0: Pilih Model Aktif ── */}
        <section className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <SectionTitle>Pilih Model Aktif</SectionTitle>

          {/* Active model highlight + statistik */}
          {availableModels !== null && (() => {
            const active = (availableModels ?? []).find((m) => m.active)
            return (
              <div className="mb-5 border border-indigo-500/40 bg-indigo-500/10 rounded-xl overflow-hidden">
                {/* Header model aktif */}
                <div className="flex items-center justify-between gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400 mb-0.5">Sedang Digunakan</p>
                      <p className="text-white font-semibold text-sm">{active ? active.label : '—'}</p>
                      {active && <p className="text-slate-500 text-xs font-mono mt-0.5">{active.filename}</p>}
                    </div>
                  </div>
                  {active && (
                    <button
                      onClick={() => {
                        setStatsEditOpen((v) => !v)
                        setStatsMsg(null)
                        setEditT1Accuracy(modelStats?.task1_accuracy != null ? String(modelStats.task1_accuracy) : '')
                        setEditT1MacroF1(modelStats?.task1_macro_f1 != null ? String(modelStats.task1_macro_f1) : '')
                        setEditT2Accuracy(modelStats?.task2_accuracy != null ? String(modelStats.task2_accuracy) : '')
                        setEditT2MacroF1(modelStats?.task2_macro_f1 != null ? String(modelStats.task2_macro_f1) : '')
                        setCmFile1(null)
                        setCmFile2(null)
                      }}
                      className="text-xs px-3 py-1.5 border border-slate-600 hover:border-indigo-400 text-slate-300 hover:text-white rounded-lg transition-colors shrink-0"
                    >
                      {statsEditOpen ? 'Tutup' : 'Edit Statistik'}
                    </button>
                  )}
                </div>

                {/* Tampilan statistik — 2 task */}
                {modelStats && (modelStats.task1_accuracy != null || modelStats.task1_macro_f1 != null || modelStats.task1_cm_image || modelStats.task2_accuracy != null || modelStats.task2_macro_f1 != null || modelStats.task2_cm_image) && (
                  <div className="border-t border-indigo-500/20 px-4 py-4 space-y-4">
                    {[
                      { key: 'task1', label: 'Task 1 — Deteksi CB / Non-CB' },
                      { key: 'task2', label: 'Task 2 — Klasifikasi Severity' },
                    ].map(({ key, label }) => {
                      const acc = modelStats[`${key}_accuracy`]
                      const f1  = modelStats[`${key}_macro_f1`]
                      const cm  = modelStats[`${key}_cm_image`]
                      if (acc == null && f1 == null && !cm) return null
                      return (
                        <div key={key} className="bg-slate-900/50 rounded-lg p-4">
                          <p className="text-slate-300 text-xs font-semibold mb-3">{label}</p>
                          <div className="flex flex-wrap gap-3 mb-3">
                            {acc != null && (
                              <div className="bg-slate-800 rounded-lg px-4 py-3 text-center min-w-[90px]">
                                <p className="text-indigo-300 text-xl font-bold">{(acc * 100).toFixed(1)}%</p>
                                <p className="text-slate-400 text-xs mt-0.5">Akurasi</p>
                              </div>
                            )}
                            {f1 != null && (
                              <div className="bg-slate-800 rounded-lg px-4 py-3 text-center min-w-[90px]">
                                <p className="text-indigo-300 text-xl font-bold">{(f1 * 100).toFixed(1)}%</p>
                                <p className="text-slate-400 text-xs mt-0.5">Macro F1</p>
                              </div>
                            )}
                          </div>
                          {cm && (
                            <div>
                              <p className="text-slate-400 text-xs mb-2">Confusion Matrix</p>
                              <img src={cm} alt={`CM ${label}`} className="rounded-lg border border-slate-700 max-h-56 object-contain" />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Form edit statistik — 2 task */}
                {statsEditOpen && active && (
                  <div className="border-t border-indigo-500/20 px-4 py-4 bg-slate-900/40 space-y-5">
                    {[
                      { label: 'Task 1 — Deteksi CB / Non-CB', accVal: editT1Accuracy, setAcc: setEditT1Accuracy, f1Val: editT1MacroF1, setF1: setEditT1MacroF1, cmFile: cmFile1, setCm: setCmFile1, cmRef: cmInput1Ref, taskNum: 1 },
                      { label: 'Task 2 — Klasifikasi Severity',  accVal: editT2Accuracy, setAcc: setEditT2Accuracy, f1Val: editT2MacroF1, setF1: setEditT2MacroF1, cmFile: cmFile2, setCm: setCmFile2, cmRef: cmInput2Ref, taskNum: 2 },
                    ].map(({ label, accVal, setAcc, f1Val, setF1, cmFile, setCm, cmRef, taskNum }) => (
                      <div key={taskNum}>
                        <p className="text-slate-300 text-xs font-semibold mb-3">{label}</p>
                        <div className="flex flex-wrap gap-3 mb-3">
                          <div>
                            <label className="text-slate-400 text-xs block mb-1">Akurasi (0–1)</label>
                            <input
                              type="number" min="0" max="1" step="0.0001"
                              value={accVal} onChange={(e) => setAcc(e.target.value)}
                              placeholder="cth: 0.912"
                              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white w-36 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="text-slate-400 text-xs block mb-1">Macro F1 (0–1)</label>
                            <input
                              type="number" min="0" max="1" step="0.0001"
                              value={f1Val} onChange={(e) => setF1(e.target.value)}
                              placeholder="cth: 0.894"
                              className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-white w-36 focus:outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-slate-400 text-xs block mb-1">Gambar Confusion Matrix (PNG/JPG)</label>
                          <input ref={cmRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                            onChange={(e) => setCm(e.target.files[0] ?? null)} />
                          <button onClick={() => cmRef.current?.click()}
                            className="text-xs px-3 py-1.5 border border-slate-600 hover:border-indigo-500 text-slate-300 hover:text-white rounded-lg transition-colors"
                          >
                            {cmFile ? cmFile.name : 'Pilih Gambar'}
                          </button>
                        </div>
                      </div>
                    ))}
                    {statsMsg && (
                      <p className={`text-xs ${statsMsg.ok ? 'text-green-400' : 'text-red-400'}`}>{statsMsg.text}</p>
                    )}
                    <button onClick={handleSaveStats} disabled={statsSaving}
                      className="px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white rounded-lg text-xs font-medium transition-colors"
                    >
                      {statsSaving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                )}
              </div>
            )
          })()}

          {switchMsg && (
            <p className={`text-sm mb-4 ${switchMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
              {switchMsg.text}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {availableModels === null && (
              <p className="text-slate-500 text-sm col-span-3">Memuat daftar model...</p>
            )}
            {availableModels !== null && availableModels.length === 0 && (
              <p className="text-red-400 text-sm col-span-3">Gagal memuat daftar model.</p>
            )}
            {(availableModels ?? []).map((m) => (
              <div
                key={m.filename}
                className={`border rounded-xl p-4 flex flex-col gap-3 transition-colors ${
                  m.active
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-slate-700 bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-white font-medium text-sm">{m.label}</p>
                    <p className="text-slate-500 text-xs mt-0.5 font-mono">{m.filename}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {m.retrained && (
                      <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                        Retrain
                      </span>
                    )}
                    {m.default && (
                      <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                    {m.active && (
                      <span className="text-xs bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full">
                        Aktif
                      </span>
                    )}
                  </div>
                </div>
                {!m.exists ? (
                  <p className="text-red-400 text-xs">File tidak ditemukan</p>
                ) : (
                  <button
                    onClick={() => handleSetModel(m.filename)}
                    disabled={m.active || switchingModel === m.filename}
                    className="w-full py-1.5 rounded-lg text-xs font-medium transition-colors border border-slate-600 hover:border-indigo-500 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {switchingModel === m.filename ? 'Memuat...' : m.active ? 'Sedang Digunakan' : 'Gunakan Model Ini'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

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

          {/* Format info */}
          <div className="mt-5 border border-slate-700 rounded-lg overflow-hidden">
            <div className="bg-slate-900 px-3 py-1.5 border-b border-slate-700">
              <p className="text-slate-400 text-xs font-medium">Format CSV yang Dibutuhkan</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-900/60 text-slate-300">
                    <th className="px-3 py-2 text-left font-medium">Tweet</th>
                    <th className="px-3 py-2 text-left font-medium">HS</th>
                    <th className="px-3 py-2 text-left font-medium">HS_Weak</th>
                    <th className="px-3 py-2 text-left font-medium">HS_Moderate</th>
                    <th className="px-3 py-2 text-left font-medium">HS_Strong</th>
                  </tr>
                </thead>
                <tbody className="text-slate-400">
                  {[
                    { tweet: 'kamu sangat menjengkelkan sekali', hs: '1', weak: '1', mod: '0', strong: '0' },
                    { tweet: 'pergi sana, tidak ada yang suka kamu', hs: '1', weak: '0', mod: '1', strong: '0' },
                    { tweet: 'halo selamat pagi semua!', hs: '0', weak: '0', mod: '0', strong: '0' },
                  ].map((r, i) => (
                    <tr key={i} className="border-t border-slate-700/60">
                      <td className="px-3 py-1.5 max-w-[220px] truncate" title={r.tweet}>{r.tweet}</td>
                      <td className="px-3 py-1.5">{r.hs}</td>
                      <td className="px-3 py-1.5">{r.weak}</td>
                      <td className="px-3 py-1.5">{r.mod}</td>
                      <td className="px-3 py-1.5">{r.strong}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2 bg-slate-900/40 border-t border-slate-700 space-y-0.5">
              <p className="text-slate-500 text-xs">• <span className="text-slate-300">HS</span>: 1 = Cyberbullying, 0 = Non-Cyberbullying</p>
              <p className="text-slate-500 text-xs">• <span className="text-slate-300">HS_Weak / HS_Moderate / HS_Strong</span>: 1 jika sesuai tingkat keparahan, selain itu 0</p>
              <p className="text-slate-500 text-xs">• Jika HS = 0 (Non-CB), semua kolom severity diisi 0</p>
              <p className="text-slate-500 text-xs">• Kolom tambahan di luar 5 kolom ini akan diabaikan</p>
            </div>
          </div>
        </section>

        {/* ── Section 2: Upload Kamus ── */}
        <section className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          <SectionTitle>Upload Kamus (Opsional)</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

            {/* Abusive */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <p className="text-white text-sm font-medium mb-1">Kamus Kata Abusif</p>
              <p className="text-slate-400 text-xs mb-3">Ganti file abusive.csv dengan versi baru</p>
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
              {/* Format info */}
              <div className="mt-4 border border-slate-700 rounded-lg overflow-hidden">
                <div className="bg-slate-800 px-3 py-1.5 border-b border-slate-700">
                  <p className="text-slate-400 text-xs font-medium">Format CSV</p>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-800/60">
                      <th className="px-3 py-1.5 text-left text-slate-300 font-medium">ABUSIVE</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-400">
                    {['anjing', 'bajingan', 'goblok', '...'].map((w) => (
                      <tr key={w} className="border-t border-slate-700/60">
                        <td className="px-3 py-1">{w}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-3 py-2 bg-slate-800/40 border-t border-slate-700">
                  <p className="text-slate-500 text-xs">• Header wajib: <span className="text-slate-300 font-mono">ABUSIVE</span></p>
                  <p className="text-slate-500 text-xs">• Satu kata per baris, tanpa tanda baca</p>
                </div>
              </div>
            </div>

            {/* Slang */}
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4">
              <p className="text-white text-sm font-medium mb-1">Kamus Kata Gaul / Singkatan</p>
              <p className="text-slate-400 text-xs mb-3">Ganti file new_kamusalay.csv dengan versi baru</p>
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
              {/* Format info */}
              <div className="mt-4 border border-slate-700 rounded-lg overflow-hidden">
                <div className="bg-slate-800 px-3 py-1.5 border-b border-slate-700">
                  <p className="text-slate-400 text-xs font-medium">Format CSV</p>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-800/60">
                      <th className="px-3 py-1.5 text-left text-slate-300 font-medium">Slang</th>
                      <th className="px-3 py-1.5 text-left text-slate-300 font-medium">Kata Baku</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-400">
                    {[['gw', 'saya'], ['lo', 'kamu'], ['gak', 'tidak'], ['...', '...']].map(([s, b]) => (
                      <tr key={s} className="border-t border-slate-700/60">
                        <td className="px-3 py-1">{s}</td>
                        <td className="px-3 py-1">{b}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="px-3 py-2 bg-slate-800/40 border-t border-slate-700">
                  <p className="text-slate-500 text-xs">• <span className="text-slate-300">Tanpa header</span> — langsung isi dari baris pertama</p>
                  <p className="text-slate-500 text-xs">• Format tiap baris: <span className="text-slate-300 font-mono">slang,kata_baku</span></p>
                </div>
              </div>
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
                    <th className="px-4 py-3 text-left">Waktu Mulai</th>
                    <th className="px-4 py-3 text-left">Waktu Selesai</th>
                    <th className="px-4 py-3 text-left">Durasi</th>
                    <th className="px-4 py-3 text-left">Dataset</th>
                    <th className="px-4 py-3 text-left">T1 Acc</th>
                    <th className="px-4 py-3 text-left">T2 Acc</th>
                    <th className="px-4 py-3 text-left"></th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((row) => {
                    const fmtDt = (iso) => {
                      if (!iso) return '—'
                      const d = new Date(iso)
                      return d.toLocaleDateString('id-ID') + ' ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    }
                    const fmtDur = (secs) => {
                      if (secs == null) return '—'
                      const h = Math.floor(secs / 3600)
                      const m = Math.floor((secs % 3600) / 60)
                      const s = secs % 60
                      if (h > 0) return `${h}j ${m}m ${s}d`
                      if (m > 0) return `${m}m ${s}d`
                      return `${s}d`
                    }
                    return (
                      <tr key={row.version} className="border-t border-slate-700 text-slate-300 hover:bg-slate-700/30">
                        <td className="px-4 py-3 font-mono text-indigo-400 text-xs">{row.version}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">{fmtDt(row.start_time)}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">{fmtDt(row.end_time)}</td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap">{fmtDur(row.duration_seconds)}</td>
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
                    )
                  })}
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
