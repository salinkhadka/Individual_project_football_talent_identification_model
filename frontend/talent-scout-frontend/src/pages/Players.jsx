// src/pages/Players.jsx
import { useState, useEffect } from 'react';
import { Trophy, Filter, Download, Target, TrendingUp, Users, Award, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

// Helper component for Position Badge
const PositionBadge = ({ position, large = false }) => {
  const positionConfig = {
    FW: { color: 'bg-orange-100 text-orange-800', label: 'Forward' },
    MF: { color: 'bg-purple-100 text-purple-800', label: 'Midfielder' },
    DF: { color: 'bg-blue-100 text-blue-800', label: 'Defender' },
    GK: { color: 'bg-gray-100 text-gray-800', label: 'Goalkeeper' }
  };
  
  const config = positionConfig[position] || { color: 'bg-gray-100 text-gray-800', label: position };
  
  return (
    <span className={`${config.color} ${large ? 'px-3 py-1' : 'px-2 py-1'} rounded-lg font-bold ${large ? 'text-sm' : 'text-xs'}`}>
      {position} {large && `• ${config.label}`}
    </span>
  );
};

function Players() {
  // Main Data State
  const [players, setPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Position Rankings State
  const [positionRankings, setPositionRankings] = useState({ FW: [], MF: [], DF: [], GK: [] });
  const [loadingRankings, setLoadingRankings] = useState(false);

  // Watchlist Toggle State
  const [toggleWatchlistLoading, setToggleWatchlistLoading] = useState(null);
  
  // Filter State
  const [sortBy, setSortBy] = useState('potential_desc');
  const [selectedPosition, setSelectedPosition] = useState('All');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [minPotential, setMinPotential] = useState('');

  useEffect(() => {
    loadData();
    loadPositionRankings();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [players, sortBy, selectedPosition, minAge, maxAge, minPotential]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [playersRes, watchlistRes] = await Promise.all([
        api.getPlayers(1, 1000),
        api.getWatchlist().catch(() => ({ data: { watchlist: [] } }))
      ]);
      
      const allPlayers = playersRes.data.items || [];
      setPlayers(allPlayers);
      setWatchlist(watchlistRes.data.watchlist || []);
    } catch (err) {
      console.error('Error loading players:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPositionRankings = async () => {
    setLoadingRankings(true);
    const positions = ['FW', 'MF', 'DF', 'GK'];
    const rankings = {};
    
    try {
      // In a real scenario, you might want to optimize this to fewer calls
      // or filter from the main 'players' state if data is already loaded
      for (const pos of positions) {
        const response = await api.getPositionRankings(pos, 5);
        rankings[pos] = response.data.players || [];
      }
      setPositionRankings(rankings);
    } catch (err) {
      console.error('Error loading position rankings:', err);
    } finally {
      setLoadingRankings(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...players];

    if (selectedPosition !== 'All') {
      filtered = filtered.filter(p => p.Pos_std === selectedPosition);
    }
    if (minAge) {
      filtered = filtered.filter(p => (p.Age_std || p.Age) >= parseInt(minAge));
    }
    if (maxAge) {
      filtered = filtered.filter(p => (p.Age_std || p.Age) <= parseInt(maxAge));
    }
    if (minPotential) {
      filtered = filtered.filter(p => (p.peak_potential || 0) >= parseInt(minPotential));
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'potential_desc':
          return (b.peak_potential || 0) - (a.peak_potential || 0);
        case 'potential_asc':
          return (a.peak_potential || 0) - (b.peak_potential || 0);
        case 'current_desc':
          return (b.current_rating || 0) - (a.current_rating || 0);
        case 'growth_desc':
          return ((b.peak_potential || 0) - (b.current_rating || 0)) - 
                 ((a.peak_potential || 0) - (a.current_rating || 0));
        case 'age_asc':
          return (a.Age_std || a.Age || 0) - (b.Age_std || b.Age || 0);
        default:
          return 0;
      }
    });

    setFilteredPlayers(filtered.slice(0, 100)); // Show top 100 based on filters
  };

  const toggleWatchlist = async (playerId, e) => {
    e.stopPropagation();
    if (!playerId) return;
    
    const isInWatchlist = watchlist.some(p => String(p.player_id) === String(playerId));
    
    try {
      setToggleWatchlistLoading(playerId);
      if (isInWatchlist) {
        await api.removeFromWatchlist(playerId);
        setWatchlist(prev => prev.filter(p => String(p.player_id) !== String(playerId)));
      } else {
        await api.addToWatchlist(playerId);
        const response = await api.getWatchlist();
        setWatchlist(response.data.watchlist || []);
      }
    } catch (err) {
      console.error('Error toggling watchlist:', err);
    } finally {
      setToggleWatchlistLoading(null);
    }
  };

  const clearFilters = () => {
    setSelectedPosition('All');
    setMinAge('');
    setMaxAge('');
    setMinPotential('');
    setSortBy('potential_desc');
  };

  const exportPlayers = () => {
    const csv = [
      ['Rank', 'Player', 'Position', 'Age', 'Club', 'Current', 'Potential', 'Growth', 'Matches'],
      ...filteredPlayers.map((p, idx) => [
        idx + 1,
        p.Player,
        p.Pos_std,
        p.Age_std || p.Age,
        p.Squad_std,
        (p.current_rating || 0).toFixed(1),
        (p.peak_potential || 0).toFixed(1),
        ((p.peak_potential || 0) - (p.current_rating || 0)).toFixed(1),
        p.matches_played_display || 0
      ])
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'players_export.csv';
    a.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading players database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Players Database</h1>
            </div>
            <p className="text-blue-100">
              Comprehensive database of all players and prospects
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{filteredPlayers.length}</div>
            <div className="text-blue-100 text-sm">Displayed</div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-blue-600" />
            <span className="text-sm text-gray-600">Top Potential</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {filteredPlayers[0]?.peak_potential?.toFixed(1) || '0.0'}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-green-600" />
            <span className="text-sm text-gray-600">Avg Age</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {(
              filteredPlayers.reduce((sum, p) => sum + (p.Age_std || p.Age || 0), 0) / 
              (filteredPlayers.length || 1)
            ).toFixed(1)}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <span className="text-sm text-gray-600">Avg Growth</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {(
              filteredPlayers.reduce((sum, p) => sum + ((p.peak_potential || 0) - (p.current_rating || 0)), 0) / 
              (filteredPlayers.length || 1)
            ).toFixed(1)}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Award className="w-5 h-5 text-amber-600" />
            <span className="text-sm text-gray-600">Elite (≥80)</span>
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {filteredPlayers.filter(p => (p.peak_potential || 0) >= 80).length}
          </div>
        </div>
      </div>

      {/* Top Players by Position Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {['FW', 'MF', 'DF', 'GK'].map((pos) => (
          <div key={pos} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <PositionBadge position={pos} large />
                <div>
                  <h3 className="font-bold text-gray-900">Top {pos}s</h3>
                  <p className="text-sm text-gray-600">Highest potential</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPosition(pos)}
                className="text-blue-600 hover:text-blue-700 text-sm font-semibold hover:underline"
              >
                Filter Table
              </button>
            </div>
            
            <div className="space-y-3">
              {loadingRankings ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-300" />
                </div>
              ) : positionRankings[pos]?.length > 0 ? (
                positionRankings[pos].map((player, idx) => (
                  <Link 
                    key={player.id} 
                    to={`/player/${player.id}`} 
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded flex items-center justify-center text-sm font-bold ${
                        idx === 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate max-w-[150px]">{player.Player}</p>
                        <p className="text-xs text-gray-500 truncate">{player.Squad_std}</p>
                      </div>
                    </div>
                    <div className="text-right whitespace-nowrap ml-2">
                      <p className="font-bold text-blue-600">{(player.peak_potential || 0).toFixed(1)}</p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">No data available</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            >
              <option value="potential_desc">Highest Potential ↓</option>
              <option value="potential_asc">Lowest Potential ↑</option>
              <option value="current_desc">Highest Current ↓</option>
              <option value="growth_desc">Highest Growth ↓</option>
              <option value="age_asc">Youngest First ↑</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Position
            </label>
            <select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            >
              <option value="All">All Positions</option>
              <option value="FW">Forward (FW)</option>
              <option value="MF">Midfielder (MF)</option>
              <option value="DF">Defender (DF)</option>
              <option value="GK">Goalkeeper (GK)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Age Range
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minAge}
                onChange={(e) => setMinAge(e.target.value)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="number"
                placeholder="Max"
                value={maxAge}
                onChange={(e) => setMaxAge(e.target.value)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Min Potential
            </label>
            <input
              type="number"
              value={minPotential}
              onChange={(e) => setMinPotential(e.target.value)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              Clear
            </button>
            <button
              onClick={exportPlayers}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Main Players Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 w-16">Watch</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Rank</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Player</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Position</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Club</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Age</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Matches</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Current</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Potential</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Growth</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPlayers.map((player, index) => {
                const growth = (player.peak_potential || 0) - (player.current_rating || 0);
                const isInWatchlist = watchlist.some(w => String(w.player_id) === String(player.id));
                const isToggling = toggleWatchlistLoading === player.id;

                return (
                  <tr 
                    key={player.id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => window.open(`/player/${player.id}`, '_self')}
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => toggleWatchlist(player.id, e)}
                        disabled={isToggling}
                        className="focus:outline-none"
                      >
                        {isToggling ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-500" />
                        ) : (
                          <Star 
                            className={`w-5 h-5 transition-colors ${
                              isInWatchlist ? 'fill-yellow-500 text-yellow-500' : 'text-gray-300 hover:text-yellow-400'
                            }`} 
                          />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-amber-100 text-amber-600' :
                        index === 1 ? 'bg-gray-100 text-gray-600' :
                        index === 2 ? 'bg-orange-100 text-orange-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {index + 1}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{player.Player}</div>
                    </td>
                    <td className="px-6 py-4">
                      <PositionBadge position={player.Pos_std} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{player.Squad_std}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{player.Age_std || player.Age}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{player.matches_played_display || 0}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {(player.current_rating || 0).toFixed(1)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 w-24">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                            style={{ width: `${Math.min(player.peak_potential || 0, 100)}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-blue-600 min-w-[3rem]">
                          {(player.peak_potential || 0).toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold ${
                        growth > 5 ? 'text-green-600' :
                        growth > 2 ? 'text-blue-600' :
                        growth > 0 ? 'text-yellow-600' :
                        'text-gray-600'
                      }`}>
                        +{growth.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/player/${player.id}`}
                        className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Position Breakdown Summary (Rankings Style) */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Position Breakdown</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {['FW', 'MF', 'DF', 'GK'].map((position) => {
            const positionPlayers = filteredPlayers.filter(p => p.Pos_std === position);
            const avgPotential = positionPlayers.length > 0 
              ? positionPlayers.reduce((sum, p) => sum + (p.peak_potential || 0), 0) / positionPlayers.length
              : 0;
            
            return (
              <div key={position} className="text-center p-4 bg-gray-50 rounded-xl">
                <div className="text-2xl font-bold text-gray-900 mb-1">{position}</div>
                <div className="text-sm text-gray-600 mb-2">
                  {positionPlayers.length} players
                </div>
                <div className="text-lg font-bold text-blue-600">
                  {avgPotential.toFixed(1)}
                </div>
                <div className="text-xs text-gray-500">Avg Potential</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Players;