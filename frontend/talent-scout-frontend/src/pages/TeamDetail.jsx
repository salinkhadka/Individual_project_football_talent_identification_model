// src/pages/TeamDetail.jsx
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Users, TrendingUp } from 'lucide-react';
import api from '../services/api';

function TeamDetail() {
  const { teamName } = useParams();
  const navigate = useNavigate();
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState('all');

  useEffect(() => {
    loadTeamData();
  }, [teamName]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getTeamAnalytics(teamName);
      const data = response.data;

      const totalPlayers = data.players?.length || 0;
      const avgPotential =
        totalPlayers > 0
          ? data.players.reduce((sum, p) => sum + (p.peak_potential || 0), 0) / totalPlayers
          : 0;
      const avgCurrent =
        totalPlayers > 0
          ? data.players.reduce((sum, p) => sum + (p.current_rating || 0), 0) / totalPlayers
          : 0;
      const avgAge =
        totalPlayers > 0
          ? data.players.reduce((sum, p) => sum + (p.Age_std || 0), 0) / totalPlayers
          : 0;

      setTeamData({
        ...data,
        total_players: totalPlayers,
        avg_ratings: { peak_potential: avgPotential, current_rating: avgCurrent },
        avg_age: avgAge,
      });
    } catch (err) {
      console.error('Error loading team data:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader />;
  if (error) return <ErrorView error={error} />;

  const filteredPlayers =
    selectedPosition === 'all'
      ? teamData.players
      : teamData.players.filter((p) => {
          const pos = p.Pos_std || '';
          if (selectedPosition === 'GK') return pos === 'GK';
          if (selectedPosition === 'DF') return pos.startsWith('DF');
          if (selectedPosition === 'MF') return pos.startsWith('MF');
          if (selectedPosition === 'FW') return pos.startsWith('FW');
          return false;
        });

  return (
    <div className="space-y-6">
      <Link
        to="/teams"
        className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Teams
      </Link>

      {/* Team Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Shield className="w-10 h-10" />
                <h1 className="text-4xl font-bold">{decodeURIComponent(teamName)}</h1>
              </div>
              <p className="text-purple-100 text-lg">Youth Squad Analysis</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-5 h-5" />} label="Total Players" value={teamData.total_players} color="bg-blue-500" />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Avg Potential"
          value={teamData.avg_ratings?.peak_potential.toFixed(1)}
          color="bg-purple-500"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Avg Current"
          value={teamData.avg_ratings?.current_rating.toFixed(1)}
          color="bg-green-500"
        />
        <StatCard icon={<Users className="w-5 h-5" />} label="Avg Age" value={teamData.avg_age.toFixed(1)} color="bg-orange-500" />
      </div>

      {/* Formation Visualization */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Squad Formation (4-3-3)</h2>
        <p className="text-sm text-gray-600 mb-4">Click on positions to filter players below</p>
        <div className="flex justify-center">
          <FormationField
            selectedPosition={selectedPosition}
            onPositionClick={setSelectedPosition}
            positionBreakdown={teamData.position_breakdown}
          />
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-6">
          {['all', 'GK', 'DF', 'MF', 'FW'].map((pos) => (
            <button
              key={pos}
              onClick={() => setSelectedPosition(pos)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                selectedPosition === pos
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {pos === 'all' ? 'All Positions' : pos} ({pos !== 'all' ? teamData.position_breakdown[pos] || 0 : teamData.players.length})
            </button>
          ))}
        </div>
      </div>

      {/* Top Prospects */}
      {teamData.top_prospects?.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Top Prospects</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {teamData.top_prospects.map((player, idx) => (
              <div
                key={player.id}
                className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 border-2 border-purple-200 hover:shadow-md transition-all cursor-pointer"
                onClick={() => navigate(`/player/${player.id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{player.name}</p>
                    <p className="text-sm text-gray-600">{player.position}</p>
                  </div>
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {idx + 1}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Potential:</span>
                  <span className="font-bold text-purple-600">{player.peak_potential.toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Players Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <h2 className="text-xl font-bold">
            {selectedPosition === 'all' ? 'All Players' : `${selectedPosition} Players`}
            <span className="ml-2 text-purple-100">({filteredPlayers.length})</span>
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Player</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Pos</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Age</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Matches</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Current</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Peak</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPlayers.map((player) => (
                <tr
                  key={player.id}
                  className="hover:bg-purple-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/player/${player.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{player.Player}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                      {player.Pos_std || 'N/A'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{player.Age_std ?? 'N/A'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{player.matches_played_display ?? 0}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{(player.current_rating || 0).toFixed(1)}</td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-purple-600">{(player.peak_potential || 0).toFixed(1)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/player/${player.id}`}
                      className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------- Helper Components ----------
function FormationField({ selectedPosition, onPositionClick, positionBreakdown }) {
  const positions = [
    { id: 'gk', type: 'GK', x: 10, y: 50, label: 'GK' },
    { id: 'df1', type: 'DF', x: 25, y: 20, label: 'DF' },
    { id: 'df2', type: 'DF', x: 25, y: 40, label: 'DF' },
    { id: 'df3', type: 'DF', x: 25, y: 60, label: 'DF' },
    { id: 'df4', type: 'DF', x: 25, y: 80, label: 'DF' },
    { id: 'mf1', type: 'MF', x: 50, y: 30, label: 'MF' },
    { id: 'mf2', type: 'MF', x: 50, y: 50, label: 'MF' },
    { id: 'mf3', type: 'MF', x: 50, y: 70, label: 'MF' },
    { id: 'fw1', type: 'FW', x: 75, y: 30, label: 'FW' },
    { id: 'fw2', type: 'FW', x: 75, y: 50, label: 'FW' },
    { id: 'fw3', type: 'FW', x: 75, y: 70, label: 'FW' },
  ];

  const width = 800;
  const height = 400;
  const scaleX = (x) => (x / 100) * width;
  const scaleY = (y) => (y / 100) * height;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-4xl bg-gradient-to-b from-green-700 to-green-900 rounded-2xl shadow-2xl cursor-pointer">
      <rect x="10" y="10" width={width - 20} height={height - 20} rx="20" ry="20" fill="#14532d" stroke="#bbf7d0" strokeWidth="3" />
      <line x1={width / 2} y1="10" x2={width / 2} y2={height - 10} stroke="#bbf7d0" strokeWidth="2" strokeDasharray="5,5" />
      <circle cx={width / 2} cy={height / 2} r="60" fill="none" stroke="#bbf7d0" strokeWidth="2" />

      {positions.map((pos) => {
        const isSelected = selectedPosition === pos.type || selectedPosition === 'all';
        const count = positionBreakdown[pos.type] || 0;
        return (
          <g key={pos.id} onClick={() => onPositionClick(pos.type)} className="cursor-pointer">
            <circle
              cx={scaleX(pos.x)}
              cy={scaleY(pos.y)}
              r={isSelected ? 22 : 18}
              fill={pos.type === 'GK' ? '#facc15' : pos.type === 'DF' ? '#60a5fa' : pos.type === 'MF' ? '#a855f7' : '#f97316'}
              stroke={isSelected ? '#ffffff' : '#fefce8'}
              strokeWidth={isSelected ? 3 : 2}
              opacity={isSelected ? 1 : 0.8}
              className="transition-all"
            />
            <text x={scaleX(pos.x)} y={scaleY(pos.y) + 5} textAnchor="middle" fill="white" fontSize="14" fontWeight="bold">{pos.label}</text>
            {count > 0 && (
              <text x={scaleX(pos.x)} y={scaleY(pos.y) + 35} textAnchor="middle" fill="white" fontSize="11" fontWeight="bold">({count})</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
      <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center mb-2 text-white`}>{icon}</div>
      <p className="text-gray-500 text-xs font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function Loader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
        <p className="mt-4 text-gray-600">Loading team data...</p>
      </div>
    </div>
  );
}

function ErrorView({ error }) {
  return (
    <div className="text-center py-12">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Team not found</h2>
      <p className="text-gray-600 mb-6">{error}</p>
      <Link
        to="/teams"
        className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Teams
      </Link>
    </div>
  );
}

export default TeamDetail;