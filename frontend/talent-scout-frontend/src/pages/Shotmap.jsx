import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Target, Filter } from 'lucide-react';
import api from '../services/api';
import ShotmapChart from '../components/ShotmapChart';

function Shotmap() {
  const { id } = useParams();
  const [shots, setShots] = useState([]);
  const [filter, setFilter] = useState('all'); // all, goal, miss, key_pass
  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [shotRes, playerRes] = await Promise.all([
          api.getShotmap(id), // Don't pass n, let backend determine from player goals
          api.getPlayerById(id),
        ]);
        // Filter to only show shots in opponent's half (x > 50)
        const filteredShots = (shotRes.data || []).filter(s => s.x > 50);
        setShots(filteredShots);
        setPlayer(playerRes.data);
      } catch (err) {
        console.error('Error loading shotmap:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  // Filter shots to only opponent's half (x > 50) and apply type filter
  const opponentHalfShots = shots.filter(s => s.x && s.x > 50);
  const filteredShots = filter === 'all' 
    ? opponentHalfShots 
    : opponentHalfShots.filter(s => s.type === filter);

  const stats = {
    total: opponentHalfShots.length,
    goals: opponentHalfShots.filter(s => s.type === 'goal').length,
    misses: opponentHalfShots.filter(s => s.type === 'miss').length,
    keyPasses: opponentHalfShots.filter(s => s.type === 'key_pass').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading shotmap...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to={`/player/${id}`}
        className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium mb-4"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Player
      </Link>

      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {player?.Player || 'Player'} Shotmap
            </h1>
            <p className="text-green-100">
              Interactive shot distribution visualization
            </p>
          </div>
          <Target className="w-16 h-16 text-green-200" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Shots" value={stats.total} color="bg-blue-500" />
        <StatCard label="Goals" value={stats.goals} color="bg-green-500" />
        <StatCard label="Misses" value={stats.misses} color="bg-red-500" />
        <StatCard label="Key Passes" value={stats.keyPasses} color="bg-yellow-500" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
        <div className="flex items-center gap-3 flex-wrap">
          <Filter className="w-5 h-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filter:</span>
          {['all', 'goal', 'miss', 'key_pass'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                filter === f
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f === 'all' ? 'All' : f === 'goal' ? 'Goals' : f === 'miss' ? 'Misses' : 'Key Passes'}
            </button>
          ))}
        </div>
      </div>

      {/* Shotmap Visualization */}
      <div className="bg-white rounded-xl shadow-xl p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Shot Distribution</h2>
        <div className="flex justify-center">
          <ShotmapChart shots={filteredShots} width={800} height={400} />
        </div>
        <div className="mt-4 flex justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-gray-600">Goals</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="text-gray-600">Misses</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500"></div>
            <span className="text-gray-600">Key Passes</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
      <p className="text-gray-500 text-xs font-medium mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color.replace('bg-', 'text-')}`}>{value}</p>
    </div>
  );
}

export default Shotmap;



