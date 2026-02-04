// src/pages/Analytics.jsx
import { useState, useEffect, useMemo } from 'react';
import {
  BarChart3, TrendingUp, Users, Target, Download,
  Activity, Award, RefreshCw, Filter, Zap, Shield,
  Search, SlidersHorizontal, ChevronDown, MousePointer2
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
  const [allPlayers, setAllPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    minAge: 15,
    maxAge: 23,
    minPotential: 70,
    position: 'All',
    club: 'All'
  });

  useEffect(() => { loadInitialData(); }, []);
  useEffect(() => { applyFilters(); }, [filters, allPlayers]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [statsRes, playersRes, teamsRes] = await Promise.all([
        api.getStats(),
        api.getPlayers(1, 1000),
        api.getTeams().catch(() => ({ data: { teams: [] } }))
      ]);
      setStats(statsRes.data);
      const items = playersRes.data.items || [];
      setAllPlayers(items);
      const teamList = teamsRes.data.teams || [...new Set(items.map(p => p.Squad_std))].sort();
      setTeams(teamList);
    } catch (err) { console.error('Error loading analytics:', err); }
    finally { setLoading(false); }
  };

  const applyFilters = () => {
    let result = [...allPlayers];
    result = result.filter(p => {
      const age = p.Age_std || p.Age || 0;
      return age >= filters.minAge && age <= filters.maxAge;
    });
    result = result.filter(p => (p.peak_potential || 0) >= filters.minPotential);
    if (filters.position !== 'All') result = result.filter(p => p.Pos_std === filters.position);
    if (filters.club !== 'All') result = result.filter(p => p.Squad_std === filters.club);
    setFilteredPlayers(result);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // --- CHART DATA GENERATORS ---

  const scatterData = useMemo(() => ({
    datasets: [{
      label: 'Player Prospects',
      data: filteredPlayers.map(p => ({
        x: p.Age_std || p.Age,
        y: p.peak_potential,
        player: p.Player,
        club: p.Squad_std
      })),
      backgroundColor: (ctx) => {
        const val = ctx.raw?.y;
        if (val >= 85) return '#3B82F6'; // Digital Blue
        if (val >= 80) return '#818CF8'; // Light Indigo
        return '#94A3B8'; // Slate
      },
      borderColor: 'transparent',
      pointRadius: 6,
      pointHoverRadius: 9
    }]
  }), [filteredPlayers]);

  const scatterOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0F172A',
        titleFont: { weight: 'bold', size: 12 },
        bodyFont: { size: 11 },
        padding: 12,
        cornerRadius: 12,
        callbacks: {
          label: (ctx) => {
            const point = ctx.raw;
            return `${point.player} (${point.club}): ${point.y.toFixed(1)} POT`;
          }
        }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: '#64748B', font: { weight: 'bold', size: 10 } } },
      y: { grid: { color: '#F1F5F9' }, ticks: { color: '#64748B', font: { weight: 'bold', size: 10 } }, min: 60, max: 100 }
    }
  };

  const positionComparisonData = useMemo(() => {
    const positions = ['FW', 'MF', 'DF', 'GK'];
    const data = positions.map(pos => {
      const group = filteredPlayers.filter(p => p.Pos_std === pos);
      return {
        pos,
        avgCurr: group.length ? group.reduce((sum, p) => sum + (p.current_rating || 0), 0) / group.length : 0,
        avgPot: group.length ? group.reduce((sum, p) => sum + (p.peak_potential || 0), 0) / group.length : 0
      };
    });
    return {
      labels: positions,
      datasets: [
        { label: 'Current', data: data.map(d => d.avgCurr), backgroundColor: '#E2E8F0', borderRadius: 8 },
        { label: 'Potential', data: data.map(d => d.avgPot), backgroundColor: '#3B82F6', borderRadius: 8 }
      ]
    };
  }, [filteredPlayers]);

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
      .slice(0, 7);
    return {
      labels: sortedClubs.map(c => c.club),
      datasets: [{
        label: 'Avg Potential',
        data: sortedClubs.map(c => c.avg),
        backgroundColor: '#0F172A',
        borderRadius: 8,
        barThickness: 16
      }]
    };
  }, [filteredPlayers]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-accent rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Processing League Data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Scout Pro Analytics Header */}
      <div className="bg-slate-950 rounded-[2rem] p-8 lg:p-12 text-white relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-accent/5 to-transparent pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/20 border border-accent/30">
                <BarChart3 className="w-5 h-5 text-accent" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-black italic uppercase tracking-tight">Advanced Analytics</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium max-w-md uppercase tracking-[0.15em] text-[10px]">Statistical visualization and discovery engine for global youth talent pools.</p>
          </div>
          <div className="flex items-center gap-6 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
            <div className="text-center">
              <div className="text-4xl font-black text-white">{filteredPlayers.length}</div>
              <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">Total Players</div>
            </div>
            <div className="h-10 w-[1px] bg-slate-800" />
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-success/10 border border-success/20 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] font-black text-success uppercase">Live Feed</span>
              </div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter italic">V.4.2 Analysis Engine</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <AnalyticsKPI label="Median Potential" value={filteredPlayers.length ? (filteredPlayers.reduce((acc, p) => acc + (p.peak_potential || 0), 0) / filteredPlayers.length).toFixed(1) : '0.0'} icon={TrendingUp} color="blue" />
        <AnalyticsKPI label="Elite Prospects" value={filteredPlayers.filter(p => (p.peak_potential || 0) >= 80).length} icon={Award} color="indigo" />
        <AnalyticsKPI label="Max Potential" value={filteredPlayers.length ? Math.max(...filteredPlayers.map(p => p.peak_potential || 0)).toFixed(1) : '0.0'} icon={Zap} color="orange" />
        <AnalyticsKPI label="Avg Age" value={filteredPlayers.length ? (filteredPlayers.reduce((acc, p) => acc + (p.Age_std || p.Age || 0), 0) / filteredPlayers.length).toFixed(1) : '0.0'} icon={Activity} color="slate" />
      </div>

      {/* Advanced Filter Module */}
      <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 italic">
              <SlidersHorizontal className="w-4 h-4 text-slate-400 font-black" />
            </div>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Control Center</h2>
          </div>
          <button onClick={() => setFilters({ minAge: 15, maxAge: 23, minPotential: 70, position: 'All', club: 'All' })} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-accent transition-colors">
            <RefreshCw className="w-3 h-3" /> Reset Grid
          </button>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          <FilterGroup label="Positional Focus">
            <select value={filters.position} onChange={(e) => handleFilterChange('position', e.target.value)} className="w-full bg-slate-50 border-none px-4 py-3 rounded-xl text-xs font-black uppercase text-slate-700 outline-none focus:ring-2 focus:ring-accent/20 transition-all">
              <option value="All">All Disciplines</option>
              <option value="FW">Forwards</option>
              <option value="MF">Midfielders</option>
              <option value="DF">Defenders</option>
              <option value="GK">Goalkeepers</option>
            </select>
          </FilterGroup>

          <FilterGroup label="Club Membership">
            <select value={filters.club} onChange={(e) => handleFilterChange('club', e.target.value)} className="w-full bg-slate-50 border-none px-4 py-3 rounded-xl text-xs font-black uppercase text-slate-700 outline-none focus:ring-2 focus:ring-accent/20 transition-all">
              <option value="All">Global Database</option>
              {teams.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FilterGroup>

          <FilterGroup label={`Age Spectrum (${filters.minAge}-${filters.maxAge})`}>
            <div className="flex items-center gap-3">
              <input type="number" min="15" max="40" value={filters.minAge} onChange={(e) => handleFilterChange('minAge', parseInt(e.target.value))} className="w-full bg-slate-50 border-none px-4 py-3 rounded-xl text-xs font-black text-center text-slate-900 outline-none" />
              <span className="text-slate-300 font-black">-</span>
              <input type="number" min="15" max="40" value={filters.maxAge} onChange={(e) => handleFilterChange('maxAge', parseInt(e.target.value))} className="w-full bg-slate-50 border-none px-4 py-3 rounded-xl text-xs font-black text-center text-slate-900 outline-none" />
            </div>
          </FilterGroup>

          <FilterGroup label={`Threshold: ${filters.minPotential}+ POT`}>
            <input type="range" min="50" max="95" value={filters.minPotential} onChange={(e) => handleFilterChange('minPotential', parseInt(e.target.value))} className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-accent" />
          </FilterGroup>
        </div>
      </div>

      {/* Discovery Matrix: Scatter */}
      <div className="bg-slate-950 rounded-[2.5rem] border border-slate-800 p-8 shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div>
            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Potential Chart</h2>
            <p className="text-xs font-black text-white uppercase italic tracking-tighter">Age (X) vs. Predicted Potential (Y)</p>
          </div>
          <div className="flex items-center gap-4 bg-white/5 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accentShade" />
              <span className="text-[8px] font-black text-slate-400 uppercase">Elite Tier</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-600" />
              <span className="text-[8px] font-black text-slate-400 uppercase">Baseline</span>
            </div>
          </div>
        </div>
        <div className="h-[450px] relative z-10">
          <Scatter options={scatterOptions} data={scatterData} />
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">
          <MousePointer2 className="w-3 h-3" /> Hover segments for individual prospect identification
        </div>
      </div>

      {/* Secondary Analytics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left">
        <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-lg bg-blue-50">
              <Zap className="w-4 h-4 text-blue-600" />
            </div>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Development Gaps</h2>
          </div>
          <div className="h-64">
            <Bar data={positionComparisonData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { min: 40, ticks: { font: { weight: 'bold' } } }, x: { ticks: { font: { weight: 'black' } } } } }} />
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 rounded-lg bg-slate-900">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Team Analytics</h2>
          </div>
          <div className="h-64">
            <Bar data={clubPowerData} options={{ indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { min: 60, ticks: { font: { weight: 'bold' } } }, y: { ticks: { font: { weight: 'black' } } } } }} />
          </div>
        </div>
      </div>

      {/* Intelligence Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <InsightModule title="Peak Cluster" description="Position maintaining the highest theoretical growth velocity." value={positionComparisonData.labels[positionComparisonData.datasets[1].data.indexOf(Math.max(...positionComparisonData.datasets[1].data))] || 'N/A'} icon={Target} />
        <InsightModule title="Academy Alpha" description="Leading institutional contributor to the current elite filtered pool." value={clubPowerData.labels[0] || 'N/A'} icon={Award} />
        <InsightModule title="Gem Density" description="Proprietary count of outlier potential players in visibility." value={`${filteredPlayers.filter(p => (p.peak_potential || 0) >= 80).length} Prospects`} icon={Zap} />
      </div>
    </div>
  );
}

// Sub-components
function AnalyticsKPI({ label, value, icon: Icon, color }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-600',
    orange: 'bg-orange-50 border-orange-100 text-orange-600',
    slate: 'bg-slate-50 border-slate-100 text-slate-600'
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-accent transition-all text-left">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-2xl font-black text-slate-900 italic tracking-tighter">{value}</div>
    </div>
  );
}

function FilterGroup({ label, children }) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

function InsightModule({ title, description, value, icon: Icon }) {
  return (
    <div className="bg-slate-900 rounded-[2rem] p-6 text-white border border-slate-800 shadow-xl group hover:shadow-accent/10 transition-all">
      <div className="flex items-center justify-between mb-4">
        <Icon className="w-6 h-6 text-accent opacity-50 group-hover:opacity-100 transition-opacity" />
        <TrendingUp className="w-4 h-4 text-slate-700" />
      </div>
      <h3 className="text-[10px] font-black uppercase tracking-widest mb-1">{title}</h3>
      <p className="text-[11px] text-slate-500 font-bold mb-6 leading-relaxed uppercase italic">{description}</p>
      <div className="text-xl font-black text-white italic group-hover:text-accent transition-colors">{value}</div>
    </div>
  );
}

export default Analytics;