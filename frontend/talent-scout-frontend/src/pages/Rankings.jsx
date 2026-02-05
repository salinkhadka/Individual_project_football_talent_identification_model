// src/pages/Rankings.jsx
import { useState, useEffect } from 'react';
import { Trophy, Filter, Download, Target, TrendingUp, Users, Award, ChevronRight, ArrowUpDown, SlidersHorizontal, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function Rankings() {
  const [players, setPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('potential_desc');
  const [selectedPosition, setSelectedPosition] = useState('All');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [minPotential, setMinPotential] = useState('70');

  useEffect(() => { loadRankings(); }, []);
  useEffect(() => { applyFilters(); }, [players, sortBy, selectedPosition, minAge, maxAge, minPotential]);

  const loadRankings = async () => {
    try {
      setLoading(true);
      const response = await api.getPlayers(1, 500);
      const allPlayers = response.data.items || [];
      setPlayers(allPlayers);
    } catch (err) { console.error('Error loading rankings:', err); }
    finally { setLoading(false); }
  };

  const applyFilters = () => {
    let filtered = [...players];
    if (selectedPosition !== 'All') filtered = filtered.filter(p => p.Pos_std === selectedPosition);
    if (minAge) filtered = filtered.filter(p => (p.Age_std || p.Age) >= parseInt(minAge));
    if (maxAge) filtered = filtered.filter(p => (p.Age_std || p.Age) <= parseInt(maxAge));
    if (minPotential) filtered = filtered.filter(p => (p.peak_potential || 0) >= parseInt(minPotential));

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'potential_desc': return (b.peak_potential || 0) - (a.peak_potential || 0);
        case 'potential_asc': return (a.peak_potential || 0) - (b.peak_potential || 0);
        case 'current_desc': return (b.current_rating || 0) - (a.current_rating || 0);
        case 'growth_desc': return ((b.peak_potential || 0) - (b.current_rating || 0)) - ((a.peak_potential || 0) - (a.current_rating || 0));
        case 'age_asc': return (a.Age_std || a.Age || 0) - (b.Age_std || b.Age || 0);
        default: return 0;
      }
    });
    setFilteredPlayers(filtered.slice(0, 100));
  };

  const clearFilters = () => {
    setSelectedPosition('All'); setMinAge(''); setMaxAge(''); setMinPotential('70'); setSortBy('potential_desc');
  };

  if (loading) return <div className="flex flex-col items-center justify-center h-96 gap-4"><div className="w-12 h-12 border-4 border-slate-200 border-t-accent rounded-full animate-spin" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Indexing Elite Registry...</p></div>;

  return (
    <div className="space-y-6">
      {/* Cinematic Leaderboard Header */}
      <div className="bg-slate-950 rounded-[2rem] p-8 lg:p-12 text-white relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-warning/5 to-transparent pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-warning/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-warning/20 border border-warning/30">
                <Trophy className="w-5 h-5 text-warning" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-black italic uppercase tracking-tight">Top 100 Prospects</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium max-w-md uppercase tracking-[0.15em] text-[10px]">Verified ranking of the top 100 U19 prospects by potential score.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex items-center gap-6">
            <div className="text-center">
              <div className="text-4xl font-black text-white italic">100</div>
              <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">Tier-1 Slots</div>
            </div>
            <div className="h-10 w-[1px] bg-slate-800" />
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-warning/10 border border-warning/20 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse" />
                <span className="text-[10px] font-black text-warning uppercase tracking-tighter">Live Audit</span>
              </div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter italic italic">Global Consensus Index</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <RankKPI label="Top Potential" value={filteredPlayers[0]?.peak_potential?.toFixed(1) || '0.0'} icon={Target} color="blue" />
        <RankKPI label="Average Age" value={(filteredPlayers.reduce((sum, p) => sum + (p.Age_std || p.Age || 0), 0) / (filteredPlayers.length || 1)).toFixed(1)} icon={Users} color="orange" />
        <RankKPI label="Development Potential" value={(filteredPlayers.reduce((sum, p) => sum + ((p.peak_potential || 0) - (p.current_rating || 0)), 0) / (filteredPlayers.length || 1)).toFixed(1)} icon={TrendingUp} color="indigo" />
        <RankKPI label="Elite Prospects" value={filteredPlayers.filter(p => (p.peak_potential || 0) >= 80).length} icon={Award} color="warning" />
      </div>

      {/* Control Center */}
      <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 italic">
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            </div>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Filter Matrix</h2>
          </div>
          <button onClick={clearFilters} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-accent transition-colors">
            <RefreshCw className="w-3 h-3" /> Reset Grid
          </button>
        </div>

        <div className="grid md:grid-cols-4 gap-8">
          <FilterBlock label="Sort Logic">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full bg-slate-50 border-none px-4 py-3 rounded-xl text-xs font-black uppercase text-slate-700 outline-none">
              <option value="potential_desc">Top Potential ↓</option>
              <option value="potential_asc">Top Potential ↑</option>
              <option value="current_desc">Current Rating ↓</option>
              <option value="growth_desc">Potential Growth ↓</option>
              <option value="age_asc">Youngest Entry ↑</option>
            </select>
          </FilterBlock>

          <FilterBlock label="Tactical Role">
            <select value={selectedPosition} onChange={(e) => setSelectedPosition(e.target.value)} className="w-full bg-slate-50 border-none px-4 py-3 rounded-xl text-xs font-black uppercase text-slate-700 outline-none">
              <option value="All">All Positions</option>
              <option value="FW">Forwards</option>
              <option value="MF">Midfielders</option>
              <option value="DF">Defenders</option>
              <option value="GK">Goalkeepers</option>
            </select>
          </FilterBlock>

          <FilterBlock label="Age Spectrum">
            <div className="flex items-center gap-3">
              <input type="number" placeholder="Min" value={minAge} onChange={(e) => setMinAge(e.target.value)} className="w-full bg-slate-50 border-none px-4 py-3 rounded-xl text-xs font-black text-center text-slate-900 outline-none" />
              <input type="number" placeholder="Max" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} className="w-full bg-slate-50 border-none px-4 py-3 rounded-xl text-xs font-black text-center text-slate-900 outline-none" />
            </div>
          </FilterBlock>

          <FilterBlock label="Threshold">
            <div className="relative">
              <input type="number" value={minPotential} onChange={(e) => setMinPotential(e.target.value)} className="w-full bg-slate-50 border-none px-4 py-3 rounded-xl text-xs font-black text-slate-900 outline-none pr-12" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">POT</span>
            </div>
          </FilterBlock>
        </div>
      </div>

      {/* Rankings Registry */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto text-left">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Rank</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Player Profile</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Pos</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Club</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center italic">Potential Gap</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Potential Score</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredPlayers.map((player, index) => (
                <tr key={player.id} className="hover:bg-slate-50/80 transition-colors group cursor-pointer" onClick={() => window.open(`/player/${player.id}`, '_self')}>
                  <td className="px-8 py-5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm italic ${index === 0 ? 'bg-warning text-white shadow-lg shadow-warning/20' :
                      index === 1 ? 'bg-slate-300 text-slate-700' :
                        index === 2 ? 'bg-orange-400 text-white' :
                          'bg-slate-100 text-slate-400'
                      }`}>
                      {index + 1}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-sm font-black text-slate-900 italic tracking-tight">{player.Player}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-tighter">Verified Prospect</div>
                  </td>
                  <td className="px-6 py-5 text-center font-black text-slate-400 text-[10px] uppercase italic">
                    {player.Pos_std}
                  </td>
                  <td className="px-6 py-5 text-[10px] font-black text-slate-600 uppercase tracking-tighter truncate max-w-[150px]">
                    {player.Squad_std}
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="text-[10px] font-black text-success uppercase italic">
                      +{((player.peak_potential || 0) - (player.current_rating || 0)).toFixed(1)}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-sm font-black text-accent italic tracking-tighter">{(player.peak_potential || 0).toFixed(1)}</span>
                      <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${Math.min(player.peak_potential || 0, 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="inline-flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase group-hover:text-accent transition-colors">
                      View <ChevronRight className="w-4 h-4" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RankKPI({ label, value, icon: Icon, color }) {
  const themes = {
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
    orange: 'bg-orange-50 border-orange-100 text-orange-600',
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-600',
    warning: 'bg-warning/10 border-warning/20 text-warning'
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-accent/40 transition-all text-left">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${themes[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-2xl font-black text-slate-900 italic tracking-tighter">{value}</div>
    </div>
  );
}

function FilterBlock({ label, children }) {
  return (
    <div className="space-y-3">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

export default Rankings;