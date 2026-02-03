// src/pages/Teams.jsx
import { useEffect, useState } from 'react';
import { Shield, Users, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Teams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getTeams();
      console.log('Teams API Response:', response.data);

      let teamsData = [];
      if (Array.isArray(response.data)) {
        teamsData = response.data;
      } else if (response.data.teams && Array.isArray(response.data.teams)) {
        teamsData = response.data.teams;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        teamsData = response.data.data;
      }

      if (teamsData.length > 0) {
        console.log('First team structure:', teamsData[0]);
        console.log('Team keys:', Object.keys(teamsData[0]));
      }

      console.log('Processed teams data:', teamsData);
      setTeams(teamsData);
    } catch (err) {
      console.error('Error loading teams:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeams = teams.filter(team => {
    const teamName = team.team || team.team_name || team.name || team.Squad_std || '';
    return teamName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading teams...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <p className="text-red-600 font-medium mb-2">Error loading teams</p>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadTeams}
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
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Teams</h1>
            </div>
            <p className="text-purple-100">
              Explore team rosters and analyze youth talent by squad
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{teams.length}</div>
            <div className="text-purple-100 text-sm">Total Teams</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
        <input
          type="text"
          placeholder="Search teams..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent"
        />
      </div>

      {teams.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            Debug: No teams data received from API. Check console for details.
          </p>
        </div>
      )}

      {/* Teams Grid */}
      {filteredTeams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team, index) => (
            <TeamCard
              key={team.team || team.team_name || team.name || index}
              team={team}
              onClick={() =>
                navigate(`/team/${encodeURIComponent(team.team || team.team_name || team.name)}`)
              }
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl shadow-lg">
          <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium">
            {searchTerm ? 'No teams match your search' : 'No teams found'}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Clear Search
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function TeamCard({ team, onClick }) {
  const teamName =
    team.team ||
    team.team_name ||
    team.name ||
    team.Squad_std ||
    'Unknown Team';

  const playerCount = team.player_count || team.total_players || 0;
  const avgPotential = team.avg_potential || team.average_potential || 0;
  const avgCurrent = team.avg_current || team.average_current || 0;
  const maxPotential = team.max_potential || team.top_potential || 0;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 cursor-pointer border border-gray-100 hover:border-purple-300 transform hover:-translate-y-1"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
            {teamName}
          </h3>
        </div>
        <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 ml-2">
          <Shield className="w-6 h-6 text-white" />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Players
          </span>
          <span className="font-bold text-gray-900">{playerCount}</span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Avg Potential
          </span>
          <span className="font-bold text-purple-600">
            {avgPotential ? avgPotential.toFixed(1) : '0.0'}
          </span>
        </div>

        {/* NEW — Avg Current */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Avg Current
          </span>
          <span className="font-bold text-blue-600">
            {avgCurrent ? avgCurrent.toFixed(1) : '0.0'}
          </span>
        </div>

        {/* Optional: Max Potential
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-sm text-gray-600">
            Top Potential
          </span>
          <span className="font-bold text-gray-900">
            {maxPotential ? maxPotential.toFixed(1) : '0.0'}
          </span>
        </div> */}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <button className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:shadow-md transition-all">
          View Team Details →
        </button>
      </div>
    </div>
  );
}


export default Teams;
