// src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, TrendingUp, Users, Target } from 'lucide-react';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:5000';

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [topPlayers, setTopPlayers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, playersRes] = await Promise.all([
        axios.get(`${API_URL}/stats`),
        axios.get(`${API_URL}/top_players?n=5`)
      ]);
      setStats(statsRes.data);
      setTopPlayers(playersRes.data.players);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white">
        <h1 className="text-4xl font-bold mb-2">Welcome to Talent Scout</h1>
        <p className="text-purple-100 text-lg">
          AI-powered player analysis and potential prediction system
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          label="Total Players"
          value={stats?.total_players || 0}
          color="bg-blue-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Potential"
          value={stats?.avg_potential?.toFixed(1) || '0'}
          color="bg-green-500"
        />
        <StatCard
          icon={Target}
          label="Top Potential"
          value={stats?.max_potential?.toFixed(1) || '0'}
          color="bg-purple-500"
        />
        <StatCard
          icon={Trophy}
          label="Elite Players"
          value={topPlayers.filter(p => p.PredictedPotential >= 80).length}
          color="bg-yellow-500"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickActionCard
          title="View Leaderboard"
          description="Browse top potential players"
          link="/leaderboard"
          icon="🏆"
          color="from-yellow-400 to-orange-500"
        />
        <QuickActionCard
          title="Compare Players"
          description="Side-by-side analysis"
          link="/comparison"
          icon="⚖️"
          color="from-blue-400 to-purple-500"
        />
        <QuickActionCard
          title="View Analytics"
          description="Statistical insights"
          link="/analytics"
          icon="📊"
          color="from-green-400 to-teal-500"
        />
      </div>

      {/* Top 5 Players Preview */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Top 5 Players</h2>
          <Link
            to="/leaderboard"
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            View All →
          </Link>
        </div>
        <div className="space-y-4">
          {topPlayers.map((player, index) => (
            <Link
              key={index}
              to={`/player/${encodeURIComponent(player.Player)}`}
              className="flex items-center justify-between p-4 rounded-lg hover:bg-purple-50 transition-colors border border-gray-200"
            >
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  {player.Rank}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{player.Player}</p>
                  <p className="text-sm text-gray-500">
                    {player.Squad_std || 'N/A'} • {player.Pos_std || 'N/A'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-600">
                  {player.PredictedPotential?.toFixed(1) || '0.0'}
                </p>
                <p className="text-xs text-gray-500">Potential</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`${color} p-3 rounded-lg`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({ title, description, link, icon, color }) {
  return (
    <Link
      to={link}
      className="block bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow"
    >
      <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-lg flex items-center justify-center text-2xl mb-4`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </Link>
  );
}

export default Dashboard;