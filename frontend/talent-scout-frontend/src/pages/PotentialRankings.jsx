import { useEffect, useState } from 'react';
import api from '../services/api';

function PotentialRankings() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const res = await api.getPlayers(1, 1000);
      const items = res.data.items || [];
      const sorted = [...items].sort(
        (a, b) => (b.peak_potential || 0) - (a.peak_potential || 0)
      );
      setPlayers(sorted.slice(0, 100));
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading rankings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Potential Rankings</h1>
      <p className="text-gray-600">
        Top players by predicted peak potential. Use this view for long-term scouting
        decisions.
      </p>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-semibold">#</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Player</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Pos</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Age</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Current</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Peak</th>
              <th className="px-4 py-3 text-left text-sm font-semibold">Gain</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {players.map((p, idx) => {
              const current = p.current_rating || 0;
              const peak = p.peak_potential || 0;
              const gain = peak - current;
              return (
                <tr key={p.id} className="hover:bg-purple-50 transition-colors cursor-pointer">
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <span className="w-8 h-8 bg-purple-100 rounded-full inline-flex items-center justify-center text-purple-600 font-bold text-sm">
                      {idx + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {p.Player}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                      {p.Pos_std || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {p.Age_std ? p.Age_std.toFixed(0) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{current.toFixed(1)}</td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 w-16">
                        <div
                          className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min(peak, 100)}%` }}
                        ></div>
                      </div>
                      <span className="font-bold text-purple-600 min-w-[3rem]">
                        {peak.toFixed(1)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-emerald-600 font-medium">
                    +{gain.toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PotentialRankings;


