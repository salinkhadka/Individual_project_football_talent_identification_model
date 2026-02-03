// src/pages/Leaderboard.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Download } from 'lucide-react';
import axios from 'axios';
import PlayerCard from '../components/PlayerCard';

const API_URL = 'http://127.0.0.1:5000';

function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('All');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    loadPlayers();
  }, []);

  useEffect(() => {
    if (players && players.length > 0) {
      filterPlayers();
    }
  }, [searchTerm, selectedPosition, minAge, maxAge, players]);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/top_players?n=100`);
      
      // FIX: Parse response if it comes as string
      let data = response.data;
      if (typeof data === 'string') {
        console.log('⚠️ Response is string, parsing JSON...');
        data = JSON.parse(data);
      }
      
      console.log('✅ Parsed data:', data);
      console.log('✅ Players array:', data.players);
      console.log('✅ Players count:', data.players?.length);
      
      const playersData = data?.players || [];
      
      if (playersData.length > 0) {
        console.log('✅ Setting', playersData.length, 'players');
        setPlayers(playersData);
        setFilteredPlayers(playersData);
      } else {
        console.warn('⚠️ No players found');
        setPlayers([]);
        setFilteredPlayers([]);
      }
    } catch (error) {
      console.error('❌ Error loading players:', error);
      setError(error.response?.data?.error || error.message);
      setPlayers([]);
      setFilteredPlayers([]);
    } finally {
      setLoading(false);
    }
  };

  const filterPlayers = () => {
    if (!Array.isArray(players) || players.length === 0) {
      return;
    }
    
    let filtered = [...players];

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.Player?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.Squad_std?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedPosition !== 'All') {
      filtered = filtered.filter((p) => p.Pos_std?.includes(selectedPosition));
    }

    if (minAge) {
      filtered = filtered.filter((p) => p.Age >= parseInt(minAge));
    }
    if (maxAge) {
      filtered = filtered.filter((p) => p.Age <= parseInt(maxAge));
    }

    setFilteredPlayers(filtered);
  };

  const exportToCSV = () => {
    if (!Array.isArray(filteredPlayers) || filteredPlayers.length === 0) {
      alert('No data to export');
      return;
    }

    const csv = [
      ['Rank', 'Player', 'Squad', 'Position', 'Age', 'Goals/90', 'Current Rating', 'Potential'],
      ...filteredPlayers.map((p) => [
        p.Rank || '',
        p.Player || '',
        p.Squad_std || 'N/A',
        p.Pos_std || 'N/A',
        p.Age || 'N/A',
        (p['Per 90 Minutes_Gls'] !== undefined && p['Per 90 Minutes_Gls'] !== null) ? p['Per 90 Minutes_Gls'].toFixed(2) : '0.00',
        (p.CurrentRating !== undefined && p.CurrentRating !== null) ? p.CurrentRating.toFixed(2) : '0.00',
        (p.PredictedPotential !== undefined && p.PredictedPotential !== null) ? p.PredictedPotential.toFixed(1) : '0.0',
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'players_leaderboard.csv';
    a.click();
  };

  const positions = ['All', 'FW', 'MF', 'DF', 'GK'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading players...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-600 font-medium mb-2">Error loading players</p>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadPlayers}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!Array.isArray(players) || players.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600 text-lg font-medium">No players found</p>
          <p className="text-sm text-gray-500 mt-2">Try reloading the data</p>
          <button
            onClick={loadPlayers}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Reload Data
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Player Leaderboard</h1>
          <p className="text-gray-600 mt-1">
            {filteredPlayers.length} of {players.length} players
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search Player or Team
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name or squad..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
            <div className="flex flex-wrap gap-2">
              {positions.map((pos) => (
                <button
                  key={pos}
                  onClick={() => setSelectedPosition(pos)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedPosition === pos
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Age</label>
              <input
                type="number"
                value={minAge}
                onChange={(e) => setMinAge(e.target.value)}
                placeholder="e.g., 16"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Age</label>
              <input
                type="number"
                value={maxAge}
                onChange={(e) => setMaxAge(e.target.value)}
                placeholder="e.g., 21"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}

      {/* Players Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">Rank</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Player</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Squad</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Pos</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Age</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">G/90</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Current</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Potential</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPlayers.map((player, index) => (
                <tr
                  key={player.Rank || index}
                  className="hover:bg-purple-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedPlayer(player)}
                >
                  <td className="px-6 py-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                      {player.Rank || index + 1}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900">{player.Player || 'Unknown'}</p>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{player.Squad_std || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-gray-100 rounded text-sm font-medium">
                      {player.Pos_std || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{player.Age || 'N/A'}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {(player['Per 90 Minutes_Gls'] !== undefined && player['Per 90 Minutes_Gls'] !== null) 
                      ? player['Per 90 Minutes_Gls'].toFixed(2) 
                      : '0.00'}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {(player.CurrentRating !== undefined && player.CurrentRating !== null)
                      ? player.CurrentRating.toFixed(1)
                      : '0.0'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2 w-24">
                        <div
                          className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min(player.PredictedPotential || 0, 100)}%` }}
                        ></div>
                      </div>
                      <span className="font-bold text-purple-600 min-w-[3rem]">
                        {(player.PredictedPotential !== undefined && player.PredictedPotential !== null)
                          ? player.PredictedPotential.toFixed(1)
                          : '0.0'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/player/${encodeURIComponent(player.Player)}`}
                      className="text-purple-600 hover:text-purple-700 font-medium"
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

      {selectedPlayer && (
        <PlayerCard player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />
      )}
    </div>
  );
}

export default Leaderboard;