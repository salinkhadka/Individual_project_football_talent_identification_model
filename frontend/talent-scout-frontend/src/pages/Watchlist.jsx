// src/pages/Watchlist.jsx
import { useEffect, useState } from 'react';
import { Star, Trash2, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import PlayerCard from '../components/PlayerCard';

function Watchlist() {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    loadWatchlist();
  }, []);

  const loadWatchlist = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getWatchlist();
      console.log('Watchlist response:', response.data); // Debug log
      
      // Map the API response to match our component's expected structure
      const mappedWatchlist = (response.data.watchlist || []).map(item => ({
        id: parseInt(item.player_id), // Convert string ID to number
        Player: item.player_name,
        Squad_std: item.team,
        Pos_std: item.position,
        peak_potential: item.peak_potential,
        current_rating: item.current_rating || 0,
        Age_std: null, // Age not provided by API
        Age: null // Age not provided by API
      }));
      
      setWatchlist(mappedWatchlist);
    } catch (err) {
      console.error('Error loading watchlist:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (playerId) => {
    // Validate playerId before making API call
    if (!playerId) {
      console.error('Invalid player ID:', playerId);
      alert('Invalid player ID');
      return;
    }

    try {
      setRemoving(playerId);
      await api.removeFromWatchlist(playerId);
      setWatchlist(prev => prev.filter(p => p.id !== playerId));
    } catch (err) {
      console.error('Error removing from watchlist:', err);
      alert('Failed to remove player from watchlist');
    } finally {
      setRemoving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading watchlist...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-600 font-medium mb-2">Error loading watchlist</p>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadWatchlist}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Star className="w-8 h-8 fill-white" />
              <h1 className="text-3xl font-bold">My Watchlist</h1>
            </div>
            <p className="text-yellow-100">
              Track your favorite prospects and monitor their development
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{watchlist.length}</div>
            <div className="text-yellow-100 text-sm">Players Tracked</div>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {watchlist.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-100">
          <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Your watchlist is empty</h2>
          <p className="text-gray-600 mb-6">
            Start adding players to track their progress and build your scouting list
          </p>
          <Link
            to="/players"
            className="inline-block px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:shadow-lg transition-all font-medium"
          >
            Browse Players
          </Link>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              label="Avg Potential"
              value={(watchlist.reduce((sum, p) => sum + (p.peak_potential || 0), 0) / watchlist.length).toFixed(1)}
              color="bg-purple-500"
            />
            <StatCard
              label="Elite (≥80)"
              value={watchlist.filter(p => (p.peak_potential || 0) >= 80).length}
              color="bg-green-500"
            />
            <StatCard
              label="High (≥70)"
              value={watchlist.filter(p => (p.peak_potential || 0) >= 70 && (p.peak_potential || 0) < 80).length}
              color="bg-blue-500"
            />
          </div>

          {/* Watchlist Table */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white">
                  <tr>
                    <th className="px-4 py-4 text-left text-sm font-semibold">Player</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold">Team</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold">Pos</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold">Current</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold">Peak Potential</th>
                    <th className="px-4 py-4 text-left text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {watchlist.map((player) => {
                    // Debug log to check player ID
                    console.log('Player ID:', player.id, 'Player:', player.Player);
                    
                    return (
                      <tr
                        key={player.id}
                        className="hover:bg-purple-50 transition-colors"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setSelectedPlayer(player)}
                              className="font-bold text-gray-900 hover:text-purple-600 text-left"
                            >
                              {player.Player}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {player.Squad_std || 'N/A'}
                        </td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                            {player.Pos_std || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-600">
                          {(player.current_rating || 0).toFixed(1)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 w-20">
                              <div
                                className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full"
                                style={{ width: `${Math.min((player.peak_potential || 0), 100)}%` }}
                              ></div>
                            </div>
                            <span className="font-bold text-purple-600 min-w-[3rem]">
                              {(player.peak_potential || 0).toFixed(1)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/player/${player.id}`}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button
                              onClick={() => handleRemove(player.id)}
                              disabled={removing === player.id || !player.id}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Remove from Watchlist"
                            >
                              {removing === player.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <PlayerCard player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
      )}
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
      <div className={`w-10 h-10 ${color} rounded-lg flex items-center justify-center mb-2`}>
        <span className="text-white text-lg font-bold">📊</span>
      </div>
      <p className="text-gray-500 text-xs font-medium mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default Watchlist;