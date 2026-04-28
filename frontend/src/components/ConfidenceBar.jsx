const ConfidenceBar = ({ confidence }) => {
  const percent = Math.round((confidence ?? 0) * 100)

  return (
    <div className="mt-2">
      <div className="flex justify-between text-sm text-slate-400 mb-1">
        <span>Kepercayaan</span>
        <span>{percent}%</span>
      </div>
      <div className="w-full bg-slate-700 rounded-full h-2">
        <div
          className="bg-indigo-500 h-2 rounded-full transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

export default ConfidenceBar
