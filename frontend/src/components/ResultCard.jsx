import SeverityBadge from './SeverityBadge.jsx'
import ConfidenceBar from './ConfidenceBar.jsx'

const ResultCard = ({ result }) => {
  const isCB = result?.label === 'cyberbullying'

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
      <div className="mb-4">
        <span className={`text-lg font-semibold ${isCB ? 'text-red-400' : 'text-green-400'}`}>
          {isCB ? 'Cyberbullying' : 'Non-Cyberbullying'}
        </span>
        {isCB && result?.severity && (
          <SeverityBadge severity={result.severity} />
        )}
      </div>
      <ConfidenceBar confidence={result?.confidence ?? 0} />
      <p className="text-slate-400 text-sm mt-2">
        Toxicity Density: {result?.toxicity_density?.toFixed(2) ?? '0.00'}
      </p>
    </div>
  )
}

export default ResultCard
