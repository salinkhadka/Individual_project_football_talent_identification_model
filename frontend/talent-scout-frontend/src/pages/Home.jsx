// src/pages/Home.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Trophy, TrendingUp, Users, Target, BarChart3, 
  Search, Award, Sparkles, ArrowRight, Shield
} from 'lucide-react';
import api from '../services/api';

function Home() {
  const [stats, setStats] = useState(null);
  const [topPlayers, setTopPlayers] = useState([]);
  const [positionRankings, setPositionRankings] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, playersRes] = await Promise.all([
        api.getStats(),
        api.getPlayers(1, 100)
      ]);
      
      setStats(statsRes.data);
      const allPlayers = playersRes.data.items || [];
      
      // Get top 10 players
      const sorted = [...allPlayers]
        .sort((a, b) => (b.peak_potential || 0) - (a.peak_potential || 0))
        .slice(0, 10);
      setTopPlayers(sorted);
      
      // Get position-specific top 5
      const positions = ['FW', 'MF', 'DF', 'GK'];
      const positionData = {};
      
      positions.forEach(pos => {
        const posPlayers = allPlayers.filter(p => p.Pos_std === pos);
        positionData[pos] = posPlayers
          .sort((a, b) => (b.peak_potential || 0) - (a.peak_potential || 0))
          .slice(0, 5);
      });
      
      setPositionRankings(positionData);
    } catch (err) {
      console.error('Error loading home data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-900 rounded-2xl p-8 md:p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-yellow-300" />
            <span className="text-yellow-300 font-semibold">Thesis Project</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Bundesliga Youth Talent Analysis System
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            ML-powered player potential prediction and development tracking
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to="/players"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-100 font-semibold"
            >
              <Search className="w-5 h-5" />
              Explore Players
            </Link>
            <Link
              to="/analytics"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
            >
              <BarChart3 className="w-5 h-5" />
              View Analytics
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="Total Prospects"
          value={stats?.total_players || 0}
          color="bg-blue-500"
          description="Youth players tracked"
        />
        <StatCard
          icon={<TrendingUp className="w-6 h-6" />}
          label="Avg Potential"
          value={stats?.avg_potential?.toFixed(1) || '0.0'}
          color="bg-green-500"
          description="League average"
        />
        <StatCard
          icon={<Trophy className="w-6 h-6" />}
          label="Elite Prospects"
          value={stats?.elite_count || 0}
          color="bg-yellow-500"
          description="Potential ≥ 80"
        />
        <StatCard
          icon={<Target className="w-6 h-6" />}
          label="Top Potential"
          value={stats?.max_potential?.toFixed(1) || '0.0'}
          color="bg-purple-500"
          description="Highest rated"
        />
      </div>

      {/* Top Prospects Preview */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Top 10 Prospects</h2>
            <p className="text-gray-600">Highest predicted potential</p>
          </div>
          <Link
            to="/rankings"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
          >
            View Full Rankings
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Rank</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Player</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Position</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Club</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Age</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Potential</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Growth</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {topPlayers.map((player, index) => (
                <tr key={player.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-yellow-100 text-yellow-600' :
                      index === 1 ? 'bg-gray-100 text-gray-600' :
                      index === 2 ? 'bg-orange-100 text-orange-600' :
                      'bg-blue-100 text-blue-600'
                    }`}>
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/player/${player.id}`}
                      className="font-semibold text-gray-900 hover:text-blue-600"
                    >
                      {player.Player}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <PositionBadge position={player.Pos_std} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{player.Squad_std}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{player.Age_std || player.Age}</td>
                  <td className="px-4 py-3">
                    <span className="font-bold text-blue-600">
                      {(player.peak_potential || 0).toFixed(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${
                      ((player.peak_potential || 0) - (player.current_rating || 0)) > 5 ? 'text-green-600' :
                      ((player.peak_potential || 0) - (player.current_rating || 0)) > 0 ? 'text-blue-600' :
                      'text-gray-600'
                    }`}>
                      +{((player.peak_potential || 0) - (player.current_rating || 0)).toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Position Highlights */}
      {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {['FW', 'MF', 'DF', 'GK'].map((position) => (
          <div key={position} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <PositionBadge position={position} large />
                <div>
                  <h3 className="font-bold text-gray-900">Top {position}s</h3>
                  <p className="text-sm text-gray-600">Highest potential players</p>
                </div>
              </div>
              <Link
                to={`/players?position=${position}`}
                className="text-blue-600 hover:text-blue-700 text-sm font-semibold"
              >
                View All
              </Link>
            </div>
            <div className="space-y-3">
              {positionRankings[position]?.map((player, idx) => (
                <Link
                  key={player.id}
                  to={`/player/${player.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-sm font-bold text-gray-600">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{player.Player}</p>
                      <p className="text-xs text-gray-500">{player.Squad_std}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-blue-600">{(player.peak_potential || 0).toFixed(1)}</p>
                    <p className="text-xs text-gray-500">Potential</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div> */}

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickLink
          title="Compare Players"
          description="Side-by-side analysis of multiple prospects"
          icon={<Users className="w-6 h-6" />}
          link="/compare"
          color="from-blue-500 to-cyan-500"
        />
        <QuickLink
          title="Team Analysis"
          description="Youth squad performance by club"
          icon={<Shield className="w-6 h-6" />}
          link="/teams"
          color="from-green-500 to-emerald-500"
        />
        <QuickLink
          title="Advanced Analytics"
          description="League-wide trends and insights"
          icon={<BarChart3 className="w-6 h-6" />}
          link="/analytics"
          color="from-purple-500 to-pink-500"
        />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color, description }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className={`${color} p-3 rounded-xl text-white`}>
          {icon}
        </div>
      </div>
      <p className="text-gray-500 text-sm font-medium mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
      <p className="text-sm text-gray-600">{description}</p>
    </div>
  );
}

function PositionBadge({ position, large = false }) {
  const positionConfig = {
    FW: { color: 'bg-orange-100 text-orange-800', label: 'Forward' },
    MF: { color: 'bg-purple-100 text-purple-800', label: 'Midfielder' },
    DF: { color: 'bg-blue-100 text-blue-800', label: 'Defender' },
    GK: { color: 'bg-gray-100 text-gray-800', label: 'Goalkeeper' }
  };
  
  const config = positionConfig[position] || { color: 'bg-gray-100 text-gray-800', label: position };
  
  return (
    <span className={`${config.color} ${large ? 'px-4 py-2' : 'px-2 py-1'} rounded-lg font-bold ${large ? 'text-base' : 'text-xs'}`}>
      {position} • {config.label}
    </span>
  );
}

function QuickLink({ title, description, icon, link, color }) {
  return (
    <Link
      to={link}
      className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all group"
    >
      <div className={`w-12 h-12 bg-gradient-to-br ${color} rounded-lg flex items-center justify-center text-white mb-4`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 text-sm mb-4">{description}</p>
      <div className="flex items-center text-blue-600 font-medium">
        <span>Explore</span>
        <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}

export default Home;