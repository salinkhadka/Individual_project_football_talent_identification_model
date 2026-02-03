// src/pages/Analytics.jsx
import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, TrendingUp, Users, Target, Download,
  Activity, Award, RefreshCw, Filter
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Scatter, Doughnut } from 'react-chartjs-2';
import api from '../services/api';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

function Analytics() {
  // Data State
  const [allPlayers, setAllPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [filters, setFilters] = useState({
    minAge: 15,
    maxAge: 23,
    minPotential: 70,
    position: 'All',
    club: 'All'
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  // Re-run filters whenever filters state or source data changes
  useEffect(() => {
    applyFilters();
  }, [filters, allPlayers]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      // Fetch extensive player list for analytics (limit 1000 for performance)
      const [statsRes, playersRes, teamsRes] = await Promise.all([
        api.getStats(),
        api.getPlayers(1, 1000),
        api.getTeams().catch(() => ({ data: { teams: [] } })) // Fallback if endpoint fails
      ]);
      
      setStats(statsRes.data);
      setAllPlayers(playersRes.data.items || []);
      
      // Extract unique teams if API structure differs, or use teams endpoint
      const teamList = teamsRes.data.teams || 
        [...new Set((playersRes.data.items || []).map(p => p.Squad_std))].sort();
      setTeams(teamList);

    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...allPlayers];

    // Age Filter
    result = result.filter(p => {
      const age = p.Age_std || p.Age || 0;
      return age >= filters.minAge && age <= filters.maxAge;
    });

    // Potential Filter
    result = result.filter(p => (p.peak_potential || 0) >= filters.minPotential);

    // Position Filter
    if (filters.position !== 'All') {
      result = result.filter(p => p.Pos_std === filters.position);
    }

    // Club Filter
    if (filters.club !== 'All') {
      result = result.filter(p => p.Squad_std === filters.club);
    }

    setFilteredPlayers(result);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // --- CHART DATA GENERATORS ---

  // 1. Scatter Plot: The "Gem Finder" (Age vs Potential)
  const scatterData = useMemo(() => {
    return {
      datasets: [
        {
          label: 'Player Prospects',
          data: filteredPlayers.map(p => ({
            x: p.Age_std || p.Age,
            y: p.peak_potential,
            player: p.Player, // Custom property for tooltip
            club: p.Squad_std
          })),
          backgroundColor: (ctx) => {
            const val = ctx.raw?.y;
            if (val >= 85) return 'rgba(34, 197, 94, 0.7)'; // Green (Elite)
            if (val >= 80) return 'rgba(59, 130, 246, 0.7)'; // Blue (Great)
            return 'rgba(156, 163, 175, 0.5)'; // Gray (Avg)
          },
          borderColor: 'transparent',
          pointRadius: 5,
          pointHoverRadius: 8
        }
      ]
    };
  }, [filteredPlayers]);

  const scatterOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const point = ctx.raw;
            return `${point.player} (${point.club}): Pot ${point.y.toFixed(1)}, Age ${point.x.toFixed(1)}`;
          }
        }
      },
      title: { display: true, text: 'The "Gem Finder": Age vs. Potential' }
    },
    scales: {
      x: { 
        title: { display: true, text: 'Age' },
        min: Math.max(15, filters.minAge - 1),
        max: Math.min(30, Number(filters.maxAge) + 1)
      },
      y: { 
        title: { display: true, text: 'Predicted Potential' },
        min: 60,
        max: 100
      }
    }
  };

  // 2. Bar Chart: Current vs Potential by Position
  const positionComparisonData = useMemo(() => {
    const positions = ['FW', 'MF', 'DF', 'GK'];
    const data = positions.map(pos => {
      const group = filteredPlayers.filter(p => p.Pos_std === pos);
      const avgCurr = group.length ? group.reduce((sum, p) => sum + (p.current_rating || 0), 0) / group.length : 0;
      const avgPot = group.length ? group.reduce((sum, p) => sum + (p.peak_potential || 0), 0) / group.length : 0;
      return { pos, avgCurr, avgPot };
    });

    return {
      labels: positions,
      datasets: [
        {
          label: 'Avg Current Ability',
          data: data.map(d => d.avgCurr),
          backgroundColor: 'rgba(107, 114, 128, 0.6)',
        },
        {
          label: 'Avg Potential Ceiling',
          data: data.map(d => d.avgPot),
          backgroundColor: 'rgba(79, 70, 229, 0.8)',
        }
      ]
    };
  }, [filteredPlayers]);

  // 3. Horizontal Bar: Top 5 Clubs by Youth Potential (Average)
  const clubPowerData = useMemo(() => {
    const clubStats = {};
    filteredPlayers.forEach(p => {
      if (!clubStats[p.Squad_std]) clubStats[p.Squad_std] = { sum: 0, count: 0 };
      clubStats[p.Squad_std].sum += (p.peak_potential || 0);
      clubStats[p.Squad_std].count += 1;
    });

    const sortedClubs = Object.entries(clubStats)
      .map(([club, data]) => ({ club, avg: data.sum / data.count }))
      .filter(item => item.avg > 0)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 7); // Top 7

    return {
      labels: sortedClubs.map(c => c.club),
      datasets: [{
        label: 'Avg Potential',
        data: sortedClubs.map(c => c.avg),
        backgroundColor: 'rgba(245, 158, 11, 0.8)', // Amber
        borderRadius: 4,
        barThickness: 20
      }]
    };
  }, [filteredPlayers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Calculating analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-900 to-blue-900 rounded-2xl p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-8 h-8" />
              <h1 className="text-3xl font-bold">Talent Analytics</h1>
            </div>
            <p className="text-gray-300">
              Interactive visualization of league-wide youth data
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{filteredPlayers.length}</div>
            <div className="text-gray-300 text-sm">Players in View</div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard
          icon={<TrendingUp className="w-6 h-6" />}
          label="Avg Potential"
          value={filteredPlayers.length ? (filteredPlayers.reduce((acc, p) => acc + (p.peak_potential || 0), 0) / filteredPlayers.length).toFixed(1) : '0.0'}
          color="bg-blue-500"
        />
        <StatCard
          icon={<Users className="w-6 h-6" />}
          label="Elite (80+)"
          value={filteredPlayers.filter(p => (p.peak_potential || 0) >= 80).length}
          color="bg-green-500"
        />
        <StatCard
          icon={<Target className="w-6 h-6" />}
          label="Highest Pot"
          value={filteredPlayers.length ? Math.max(...filteredPlayers.map(p => p.peak_potential || 0)).toFixed(1) : '0.0'}
          color="bg-purple-500"
        />
        <StatCard
          icon={<Award className="w-6 h-6" />}
          label="Avg Age"
          value={filteredPlayers.length ? (filteredPlayers.reduce((acc, p) => acc + (p.Age_std || p.Age || 0), 0) / filteredPlayers.length).toFixed(1) : '0.0'}
          color="bg-orange-500"
        />
      </div>

      {/* Control Panel / Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <h2 className="text-xl font-bold text-gray-900">Data Controls</h2>
          </div>
          <button 
            onClick={() => setFilters({minAge: 15, maxAge: 23, minPotential: 70, position: 'All', club: 'All'})}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Reset Filters
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Position Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
            <select
              value={filters.position}
              onChange={(e) => handleFilterChange('position', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            >
              <option value="All">All Positions</option>
              <option value="FW">Forwards</option>
              <option value="MF">Midfielders</option>
              <option value="DF">Defenders</option>
              <option value="GK">Goalkeepers</option>
            </select>
          </div>

          {/* Club Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Club</label>
            <select
              value={filters.club}
              onChange={(e) => handleFilterChange('club', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600"
            >
              <option value="All">All Clubs</option>
              {teams.map((team, idx) => (
                <option key={idx} value={team}>{team}</option>
              ))}
            </select>
          </div>
          
          {/* Age Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Age Range ({filters.minAge} - {filters.maxAge})</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min="15"
                max="40"
                value={filters.minAge}
                onChange={(e) => handleFilterChange('minAge', parseInt(e.target.value))}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
              />
              <span className="text-gray-400">-</span>
              <input
                type="number"
                min="15"
                max="40"
                value={filters.maxAge}
                onChange={(e) => handleFilterChange('maxAge', parseInt(e.target.value))}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          {/* Min Potential */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Min Potential</label>
            <div className="relative">
              <input
                type="range"
                min="50"
                max="95"
                value={filters.minPotential}
                onChange={(e) => handleFilterChange('minPotential', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="text-center text-sm font-bold text-blue-600 mt-1">
                {filters.minPotential}+
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Visualization: Scatter Plot */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="h-[400px]">
          <Scatter options={scatterOptions} data={scatterData} />
        </div>
        <p className="text-sm text-gray-500 mt-2 text-center">
          * Hover over points to see player details. Top-left quadrant represents high-potential youth.
        </p>
      </div>

      {/* Secondary Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Growth Analysis */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Talent Gap: Current vs. Potential</h2>
          <div className="h-64">
            <Bar 
              data={positionComparisonData} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: false, min: 40 } }
              }} 
            />
          </div>
        </div>

        {/* Club Rankings */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Club Youth Power Rankings</h2>
          <div className="h-64">
            <Bar 
              data={clubPowerData}
              options={{
                indexAxis: 'y', // Horizontal bar
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { beginAtZero: false, min: 60 } },
                plugins: { legend: { display: false } }
              }} 
            />
          </div>
        </div>
      </div>

      {/* Insight Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Automated Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InsightCard
            title="Most Promising Position"
            description="Based on filtered data, this position has the highest average potential ceiling."
            value={positionComparisonData.labels[
              positionComparisonData.datasets[1].data.indexOf(Math.max(...positionComparisonData.datasets[1].data))
            ] || 'N/A'}
          />
          <InsightCard
            title="Best Youth Club"
            description="The club with the highest average potential among filtered prospects."
            value={clubPowerData.labels[0] || 'N/A'}
          />
          <InsightCard
            title="Hidden Gems"
            description="Number of players with >80 potential currently viewing."
            value={`${filteredPlayers.filter(p => (p.peak_potential || 0) >= 80).length} Players`}
          />
        </div>
      </div>
    </div>
  );
}

// Sub-components
function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className={`${color} p-3 rounded-xl text-white`}>
          {icon}
        </div>
      </div>
      <p className="text-gray-500 text-sm font-medium mb-1">{label}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function InsightCard({ title, description, value }) {
  return (
    <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
      <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4 min-h-[40px]">{description}</p>
      <div className="text-2xl font-bold text-blue-600">{value}</div>
    </div>
  );
}

export default Analytics;