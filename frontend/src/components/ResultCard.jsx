import SeverityBadge from './SeverityBadge.jsx'
import ConfidenceBar from './ConfidenceBar.jsx'
import { severityDescription, severityBg } from '../utils/severity.js'

const ResultCard = ({ result }) => {
  const isCB = result?.label === 'cyberbullying'
  const sev = result?.severity

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
      <div className="mb-4">
        <span className={`text-lg font-semibold ${isCB ? 'text-red-400' : 'text-green-400'}`}>
          {isCB ? 'Cyberbullying' : 'Non-Cyberbullying'}
        </span>
        {isCB && sev && <SeverityBadge severity={sev} />}
      </div>

      {isCB && sev && severityDescription[sev] && (
        <div className={`border rounded-lg px-4 py-3 mb-4 text-sm text-slate-300 ${severityBg[sev]}`}>
          {severityDescription[sev]}
        </div>
      )}

      <ConfidenceBar confidence={result?.confidence ?? 0} />

      <p className="text-slate-400 text-sm mt-3">
        Toxicity Density:{' '}
        <span className="text-slate-200 font-medium">
          {result?.toxicity_density?.toFixed(2) ?? '0.00'}
        </span>
      </p>
    </div>
  )
}

export default ResultCard
