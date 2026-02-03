import { TrendingUp, TrendingDown, Minus, CheckCircle } from 'lucide-react';

const CompareTable = ({ players }) => {
  if (!players || players.length === 0) return null;

  const metrics = [
    { label: 'Club', key: 'Squad_std' },
    { label: 'Position', key: 'Pos_std' },
    { label: 'Age', key: 'Age', format: (val) => val || '-' },
    { label: 'Peak Potential', key: 'peak_potential', format: (val) => val?.toFixed(1) || '0.0', highlight: true },
    { label: 'Current Rating', key: 'current_rating', format: (val) => val?.toFixed(1) || '0.0' },
    { label: 'Growth', key: 'growth', isComputed: true, 
      getValue: (p) => ((p.peak_potential || 0) - (p.current_rating || 0)).toFixed(1) 
    },
    { label: 'Matches', key: 'matches' },
    { label: 'Minutes', key: 'minutes', format: (val) => Math.round(val || 0).toLocaleString() },
    { label: 'Goals', key: 'goals' },
    { label: 'Assists', key: 'assists' },
    { label: 'Goals/90', key: 'goals_per_90', format: (val) => val?.toFixed(2) || '0.00' },
    { label: 'Confidence', key: 'confidence' },
  ];

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full border-collapse bg-white text-sm text-left">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="p-4 font-semibold border-b border-gray-200 w-48 sticky left-0 bg-gray-50 z-10">Metric</th>
            {players.map(player => (
              <th key={player.id} className="p-4 font-semibold border-b border-gray-200 text-center min-w-[150px]">
                <div className="text-gray-900 text-base">{player.Player}</div>
                <div className="text-xs font-normal text-gray-500">{player.Squad_std}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 border-t border-gray-100">
          {metrics.map((metric, idx) => (
            <tr key={metric.label} className={`hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
              <td className="p-4 font-medium text-gray-700 sticky left-0 bg-inherit border-r border-gray-100 z-10">
                {metric.label}
              </td>
              {players.map(player => {
                let value;
                if (metric.isComputed) {
                  value = metric.getValue(player);
                } else {
                  value = player[metric.key] ?? player[metric.key.toLowerCase()] ?? '-';
                  if (metric.format && value !== '-') value = metric.format(value);
                }

                return (
                  <td key={player.id} className="p-4 text-center text-gray-600">
                    {metric.label === 'Growth' ? (
                      <span className={`inline-flex items-center gap-1 font-bold px-2 py-1 rounded-full text-xs ${
                        parseFloat(value) > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {parseFloat(value) > 0 ? <TrendingUp className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                        {parseFloat(value) > 0 ? '+' : ''}{value}
                      </span>
                    ) : metric.highlight ? (
                      <span className="font-bold text-lg text-blue-600">
                        {value}
                      </span>
                    ) : (
                      value
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CompareTable;