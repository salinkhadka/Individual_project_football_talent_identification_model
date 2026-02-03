import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Users, X, Plus, Search, AlertCircle } from 'lucide-react';
import api from '../services/api';
import CompareCharts from '../components/CompareCharts';
import CompareTable from '../components/CompareTable';

// Comparison feedback component
function ComparisonFeedback({ players }) {
  if (players.length < 2) return null;

  const positionCounts = players.reduce((acc, p) => {
    acc[p.Pos_std] = (acc[p.Pos_std] || 0) + 1;
    return acc;
  }, {});

  const positions = Object.keys(positionCounts);
  const uniquePositions = positions.length;

 const getMessage = () => {
  // Single-position comparison
  if (uniquePositions === 1) {
    const pos = positions[0];

    const messages = {
      FW: {
        icon: '⚽',
        title: 'Forward Performance Analysis',
        description:
          'Comparative evaluation of attacking output, including goal conversion, shot quality, off-ball movement, and chance creation.',
        note:
          'Since both players operate as forwards, the comparison emphasizes direct attacking impact and efficiency in goal-scoring situations.',
        color: 'bg-orange-50 border-orange-200 text-orange-800'
      },
      MF: {
        icon: '🎯',
        title: 'Midfield Control Comparison',
        description:
          'Assessment of playmaking influence, ball progression, passing efficiency, spatial awareness, and tempo control.',
        note:
          'With identical midfield roles, the focus is on control of possession, creativity, and influence on overall team structure.',
        color: 'bg-purple-50 border-purple-200 text-purple-800'
      },
      DF: {
        icon: '🛡️',
        title: 'Defensive Effectiveness Review',
        description:
          'Evaluation of defensive reliability, including duels, interceptions, positioning discipline, and build-up contribution.',
        note:
          'Both players are defenders, so the comparison prioritizes defensive stability, decision-making, and consistency under pressure.',
        color: 'bg-blue-50 border-blue-200 text-blue-800'
      },
      GK: {
        icon: '🧤',
        title: 'Goalkeeper Shot-Stopping Analysis',
        description:
          'Comparison of goal prevention metrics such as save efficiency, positioning, aerial command, and distribution quality.',
        note:
          'As both players are goalkeepers, the analysis focuses on shot-stopping ability, reliability, and contribution to build-up play.',
        color: 'bg-green-50 border-green-200 text-green-800'
      }
    };

    return messages[pos];
  }

  // Two-position comparison
  if (uniquePositions === 2) {
    const [pos1, pos2] = positions;

    // Forward + Midfielder
    if (
      (pos1 === 'FW' && pos2 === 'MF') ||
      (pos1 === 'MF' && pos2 === 'FW')
    ) {
      return {
        icon: '⚡',
        title: 'Offensive Contribution Comparison',
        description:
          'Analysis of attacking influence across different roles, focusing on involvement in chance creation and goal-related actions.',
        note:
          'As the players occupy forward and midfield roles, the comparison highlights positive offensive impact rather than direct positional output.',
        color: 'bg-pink-50 border-pink-200 text-pink-800'
      };
    }

    // Midfielder + Defender
    if (
      (pos1 === 'MF' && pos2 === 'DF') ||
      (pos1 === 'DF' && pos2 === 'MF')
    ) {
      return {
        icon: '🔄',
        title: 'Build-Up & Transition Analysis',
        description:
          'Evaluation of influence in defensive and midfield phases, emphasizing ball progression, positional discipline, and transition play.',
        note:
          'Since one player is a midfielder and the other a defender, the comparison focuses on positive contributions to build-up play and defensive stability rather than raw attacking statistics.',
        color: 'bg-indigo-50 border-indigo-200 text-indigo-800'
      };
    }

    // Any other mixed pairing
    return {
      icon: '🔀',
      title: 'Cross-Role Performance Comparison',
      description:
        'Comparison across distinct positional roles, prioritizing adaptability, effectiveness, and overall match impact.',
      note:
        'With differing roles, direct statistical comparisons are contextualized to emphasize how each player positively impacts their team within their respective responsibilities.',
      color: 'bg-cyan-50 border-cyan-200 text-cyan-800'
    };
  }

  // Three or more different positions
  return {
    icon: '🌟',
    title: 'Multi-Positional Squad Overview',
    description:
      'Holistic comparison of players across multiple areas of the pitch, focusing on balance, versatility, and overall contribution.',
    note:
      'Due to the diversity of positions, the analysis emphasizes overall impact, adaptability, and role suitability rather than position-specific dominance.',
    color: 'bg-violet-50 border-violet-200 text-violet-800'
  };
};


  const message = getMessage();

  return (
    <div className={`${message.color} border-2 rounded-xl p-4 mb-6`}>
      <div className="flex items-start gap-3">
        <div className="text-3xl">{message.icon}</div>
        <div className="flex-1">
          <h3 className="font-bold text-lg mb-1">{message.title}</h3>
          <p className="text-sm opacity-90">{message.description}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            {positions.map(pos => (
              <span key={pos} className="px-2 py-1 bg-white/50 rounded text-xs font-bold">
                {pos} ({positionCounts[pos]})
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Position filter component
function PositionFilter({ selectedPosition, onPositionChange, playerCounts }) {
  const positions = [
    { value: 'All', label: 'All Positions', icon: '⚽' },
    { value: 'FW', label: 'Forwards', icon: '⚽', color: 'orange' },
    { value: 'MF', label: 'Midfielders', icon: '🎯', color: 'purple' },
    { value: 'DF', label: 'Defenders', icon: '🛡️', color: 'blue' },
    { value: 'GK', label: 'Goalkeepers', icon: '🧤', color: 'green' }
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {positions.map(pos => {
        const count = playerCounts[pos.value] || 0;
        const isSelected = selectedPosition === pos.value;
        
        const colorClasses = {
          orange: isSelected ? 'bg-orange-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          purple: isSelected ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          blue: isSelected ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          green: isSelected ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        };
        
        return (
          <button
            key={pos.value}
            onClick={() => onPositionChange(pos.value)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              pos.value === 'All' 
                ? (isSelected ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
                : colorClasses[pos.color]
            }`}
          >
            <span className="mr-2">{pos.icon}</span>
            {pos.label}
            {pos.value !== 'All' && (
              <span className="ml-2 text-xs opacity-75">({count})</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ComparePlayers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [positionFilter, setPositionFilter] = useState('All');
  
  const isManualUpdate = useRef(false);

  useEffect(() => {
    if (isManualUpdate.current) {
      isManualUpdate.current = false;
      return;
    }

    const ids = searchParams.get('ids');
    if (ids) {
      const urlIds = ids.split(',')
        .map(id => parseInt(id))
        .filter(id => !isNaN(id) && id > 0);
      
      const currentIds = selectedPlayers.map(p => p.id);
      
      const isDifferent = urlIds.length !== currentIds.length || 
                          !urlIds.every(id => currentIds.includes(id));

      if (isDifferent && urlIds.length > 0) {
        loadPlayersById(urlIds);
      } else if (urlIds.length === 0 && selectedPlayers.length > 0) {
        setSelectedPlayers([]);
      }
    } else if (selectedPlayers.length > 0) {
      setSelectedPlayers([]);
    }
  }, [searchParams]);

  const loadPlayersById = async (ids) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.comparePlayers({ player_ids: ids });
      const data = Array.isArray(response.data) ? response.data : response.data.players || [];
      const sortedData = data.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
      
      setSelectedPlayers(sortedData);
    } catch (err) {
      console.error('Error loading players:', err);
      setError('Failed to load player data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (term) => {
    setSearchTerm(term);
    if (term.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await api.searchPlayers(term);
      let results = response.data || [];
      
      // Apply position filter to search results
      if (positionFilter !== 'All') {
        results = results.filter(p => p.Pos_std === positionFilter);
      }
      
      setSearchResults(results);
    } catch (err) {
      console.error('Error searching:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const addPlayer = (player) => {
    if (selectedPlayers.length >= 4) {
      alert('Maximum 4 players can be compared');
      return;
    }

    if (selectedPlayers.find(p => p.id === player.id)) {
      alert('Player already added');
      return;
    }

    const newPlayers = [...selectedPlayers, player];
    setSelectedPlayers(newPlayers);
    setSearchTerm('');
    setSearchResults([]);

    isManualUpdate.current = true;

    const ids = newPlayers.map(p => p.id).join(',');
    setSearchParams({ ids });
  };

  const removePlayer = (playerId) => {
    const updated = selectedPlayers.filter(p => p.id !== playerId);
    setSelectedPlayers(updated);
    
    isManualUpdate.current = true;

    if (updated.length > 0) {
      const ids = updated.map(p => p.id).join(',');
      setSearchParams({ ids });
    } else {
      setSearchParams({});
    }
  };

  // Calculate position counts for filter buttons
  const positionCounts = selectedPlayers.reduce((acc, p) => {
    acc[p.Pos_std] = (acc[p.Pos_std] || 0) + 1;
    return acc;
  }, {});

  // Re-trigger search when position filter changes
  useEffect(() => {
    if (searchTerm.length >= 2) {
      handleSearch(searchTerm);
    }
  }, [positionFilter]);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Compare Players</h1>
            </div>
            <p className="text-purple-100">
              Side-by-side analysis of up to 4 players
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{selectedPlayers.length}/4</div>
            <div className="text-purple-100 text-sm">Players Selected</div>
          </div>
        </div>
      </div>

      {/* Position Filter */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Filter by Position
        </label>
        <PositionFilter
          selectedPosition={positionFilter}
          onPositionChange={setPositionFilter}
          playerCounts={positionCounts}
        />
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 relative z-20">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Search Players to Compare
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={`Search ${positionFilter === 'All' ? 'all positions' : positionFilter + 's'}...`}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none transition-shadow"
            disabled={selectedPlayers.length >= 4}
          />
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 max-h-80 overflow-y-auto z-50">
            {searchResults.slice(0, 10).map((player) => (
              <button
                key={player.id}
                onClick={() => addPlayer(player)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                    player.Pos_std === 'FW' ? 'bg-orange-100 text-orange-600' :
                    player.Pos_std === 'MF' ? 'bg-purple-100 text-purple-600' :
                    player.Pos_std === 'DF' ? 'bg-blue-100 text-blue-600' :
                    'bg-green-100 text-green-600'
                  }`}>
                    {player.Pos_std}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-900">{player.Player}</p>
                    <p className="text-xs text-gray-500">{player.Squad_std}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-xs text-gray-400">Potential</div>
                    <div className="font-bold text-purple-600">{(player.peak_potential || 0).toFixed(1)}</div>
                  </div>
                  <Plus className="w-5 h-5 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        )}

        {searching && (
          <div className="mt-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600 mx-auto" />
          </div>
        )}
      </div>

      {/* Comparison Feedback */}
      {selectedPlayers.length >= 2 && (
        <ComparisonFeedback players={selectedPlayers} />
      )}

      {/* Selected Players Cards */}
      {selectedPlayers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {selectedPlayers.map((player) => (
            <div
              key={player.id}
              className="bg-white rounded-xl shadow-md p-4 border border-purple-100 relative group hover:shadow-lg transition-shadow"
            >
              <button
                onClick={() => removePlayer(player.id)}
                className="absolute top-2 right-2 p-1 bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-600 rounded-full transition-colors"
                title="Remove player"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mb-4 pr-6">
                <h3 className="font-bold text-gray-900 truncate" title={player.Player}>
                  {player.Player}
                </h3>
                <p className="text-xs text-gray-500 truncate">{player.Squad_std}</p>
                <span className={`inline-block mt-2 px-2 py-0.5 text-xs font-bold rounded ${
                  player.Pos_std === 'FW' ? 'bg-orange-50 text-orange-700' :
                  player.Pos_std === 'MF' ? 'bg-purple-50 text-purple-700' :
                  player.Pos_std === 'DF' ? 'bg-blue-50 text-blue-700' :
                  'bg-green-50 text-green-700'
                }`}>
                  {player.Pos_std}
                </span>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-50">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Potential</span>
                  <span className="font-bold text-purple-600">{(player.peak_potential || 0).toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Current</span>
                  <span className="font-bold text-blue-600">{(player.current_rating || 0).toFixed(1)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Goals/90</span>
                  <span className="font-medium text-gray-900">{(player['Per 90 Minutes_Gls'] || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && selectedPlayers.length === 0 && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading comparisons...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Data Visualization */}
      {selectedPlayers.length >= 2 && (
        <div className="grid grid-cols-1 gap-6">
          {/* Comparison Charts */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Visual Comparison</h2>
            <CompareCharts players={selectedPlayers} />
          </div>

          {/* Detailed Table */}
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Detailed Statistics</h2>
            <CompareTable players={selectedPlayers} />
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && selectedPlayers.length < 2 && (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center border border-gray-100">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {selectedPlayers.length === 0 ? 'No Players Selected' : 'Select More Players'}
          </h2>
          <p className="text-gray-600 mb-6">
            {selectedPlayers.length === 0 
              ? 'Search and add players above to start comparing'
              : 'Add at least one more player to see the comparison'}
          </p>
        </div>
      )}
    </div>
  );
}

export default ComparePlayers;