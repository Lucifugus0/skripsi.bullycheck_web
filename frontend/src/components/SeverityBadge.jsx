const colorMap = {
  weak: 'bg-yellow-500',
  moderate: 'bg-orange-500',
  strong: 'bg-red-500',
}

const labelMap = {
  weak: 'Lemah',
  moderate: 'Sedang',
  strong: 'Kuat',
}

const SeverityBadge = ({ severity }) => {
  const color = colorMap[severity] ?? 'bg-slate-500'
  const label = labelMap[severity] ?? severity

  return (
    <span className={`ml-3 px-2 py-1 rounded text-xs font-medium text-white ${color}`}>
      {label}
    </span>
  )
}

export default SeverityBadge
