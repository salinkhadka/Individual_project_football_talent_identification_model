// src/pages/ComparePlayers.jsx
import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users, X, Plus, Search, AlertCircle, ArrowLeftRight,
  ChevronRight, Info, Zap, Shield, Target, Award,
  BarChart3, LayoutGrid, ArrowUpDown
} from 'lucide-react';
import api from '../services/api';
import CompareCharts from '../components/CompareCharts';
import CompareTable from '../components/CompareTable';

function ComparisonFeedback({ players }) {
  if (players.length < 2) return null;

  const positionCounts = players.reduce((acc, p) => {
    acc[p.Pos_std] = (acc[p.Pos_std] || 0) + 1;
    return acc;
  }, {});

  const positions = Object.keys(positionCounts);
  const uniquePositions = positions.length;

  const getMessage = () => {
    const hasPosition = (pos) => positionCounts[pos] > 0;

    // Single Position Logic
    if (uniquePositions === 1) {
      const pos = positions[0];
      const configs = {
        FW: { icon: Target, title: 'Attack Hierarchy', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', desc: 'Direct comparison of goal-scoring efficiency, shot volume, and final-third conversion rates.' },
        MF: { icon: Zap, title: 'Engine Room Metrics', color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', desc: 'Evaluation of distribution accuracy, progressive carries, and transition control efficiency.' },
        DF: { icon: Shield, title: 'Defensive Fortification', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', desc: 'Reliability analysis focusing on duel win rates, recovery volume, and structural discipline.' },
        GK: { icon: Award, title: 'Shot-Stopping Audit', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', desc: 'Save percentage consistency and distribution quality assessment under pressure.' }
      };
      return configs[pos] || configs.MF;
    }

    // Direct Attacking vs Creative Mix
    if (hasPosition('FW') && hasPosition('MF') && uniquePositions === 2) {
      return {
        icon: Target,
        title: 'Attacking Variance Study',
        color: 'text-orange-400',
        bg: 'bg-orange-500/5',
        border: 'border-orange-500/20',
        desc: 'Comparing Forwards with Midfielders. Note: Standard output metrics (Goals/xG) naturally skew toward Forwards. Weighted scouting should prioritize "Creative Volume" and "Progression" for Midfielders to maintain parity.'
      };
    }

    // Creative vs Defensive Mix
    if (hasPosition('MF') && hasPosition('DF') && uniquePositions === 2) {
      return {
        icon: Shield,
        title: 'Progression Matrix',
        color: 'text-indigo-400',
        bg: 'bg-indigo-500/5',
        border: 'border-indigo-500/20',
        desc: 'Analyzing the transition from Build-up (DF) to Progression (MF). Focus on "Retention Rates" for Defenders vs "Key Pass Volume" for Midfielders to evaluate distinct tactical impacts.'
      };
    }

    // General Hybrid Case
    return {
      icon: ArrowLeftRight,
      title: 'Hybrid Role Analysis',
      color: 'text-accent',
      bg: 'bg-accent/10',
      border: 'border-accent/20',
      desc: 'Analyzing disparate tactical roles. For cross-positional benchmarking, our "Potential Score" provides the most accurate performance-normalized index.'
    };
  };

  const config = getMessage();

  return (
    <div className={`${config.bg} ${config.border} border rounded-2xl p-6 mb-6 animate-in fade-in slide-in-from-top-4 duration-500`}>
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl bg-white/10 ${config.color}`}>
          <config.icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{config.title}</h3>
            <div className="h-4 w-[1px] bg-slate-200" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Positional Context Active</span>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed max-w-2xl">{config.desc}</p>
        </div>
      </div>
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
    // 1. Initial Load from LocalStorage
    const stored = localStorage.getItem('compare_pool');
    let pool = stored ? JSON.parse(stored) : [];

    // 2. Load from URL Params (if present, they take priority)
    const ids = searchParams.get('ids');
    if (ids) {
      const urlIds = ids.split(',').map(id => parseInt(id)).filter(id => !isNaN(id) && id > 0);
      if (urlIds.length > 0) {
        loadPlayersById(urlIds);
        return; // loadPlayersById will handle the update
      }
    }

    // 3. Fallback to pool if no URL ids
    if (pool.length > 0) {
      setSelectedPlayers(pool);
    }
  }, []);

  // Sync back to localStorage / URL on every change
  useEffect(() => {
    if (isManualUpdate.current) {
      const ids = selectedPlayers.map(p => p.id);
      if (ids.length > 0) {
        setSearchParams({ ids: ids.join(',') });
        localStorage.setItem('compare_pool', JSON.stringify(selectedPlayers));
      } else {
        setSearchParams({});
        localStorage.removeItem('compare_pool');
      }
      isManualUpdate.current = false;
    }
  }, [selectedPlayers]);

  const loadPlayersById = async (ids) => {
    try {
      setLoading(true); setError(null);
      const response = await api.comparePlayers({ player_ids: ids });
      const data = Array.isArray(response.data) ? response.data : response.data.players || [];
      const sorted = data.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
      setSelectedPlayers(sorted);
      // Also update localStorage to ensure full data sync
      localStorage.setItem('compare_pool', JSON.stringify(sorted));
    } catch (err) { setError('Failed to synchronize comparison registry.'); }
    finally { setLoading(false); }
  };

  const handleSearch = async (term) => {
    setSearchTerm(term);
    if (term.length < 2) { setSearchResults([]); return; }
    try {
      setSearching(true);
      const response = await api.searchPlayers(term);
      let results = response.data || [];
      if (positionFilter !== 'All') results = results.filter(p => p.Pos_std === positionFilter);
      setSearchResults(results);
    } catch (err) { setSearchResults([]); }
    finally { setSearching(false); }
  };

  const addPlayer = (player) => {
    if (selectedPlayers.length >= 4) return;
    if (selectedPlayers.find(p => p.id === player.id)) return;
    const newPlayers = [...selectedPlayers, player];
    setSelectedPlayers(newPlayers);
    setSearchTerm('');
    setSearchResults([]);
    isManualUpdate.current = true;
    setSearchParams({ ids: newPlayers.map(p => p.id).join(',') });
  };

  const removePlayer = (playerId) => {
    const updated = selectedPlayers.filter(p => p.id !== playerId);
    setSelectedPlayers(updated);
    isManualUpdate.current = true;
    if (updated.length > 0) setSearchParams({ ids: updated.map(p => p.id).join(',') });
    else setSearchParams({});
  };

  const formatValue = (val) => {
    if (val === null || val === undefined) return '0.0';
    return parseFloat(val).toFixed(1);
  };

  return (
    <div className="space-y-6">
      {/* Cinematic Header */}
      <div className="bg-slate-950 rounded-[2rem] p-8 lg:p-12 text-white relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-accent/5 to-transparent" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/20 border border-accent/30">
                <LayoutGrid className="w-5 h-5 text-accent" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-black italic uppercase tracking-tight">Player Comparison</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium max-w-md uppercase tracking-widest text-[10px]">Professional comparison tools for evaluating multiple prospects side-by-side.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex items-center gap-6">
            <div className="text-center">
              <div className="text-4xl font-black text-white">{selectedPlayers.length}<span className="text-slate-600">/4</span></div>
              <div className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em] mt-1">Slots Active</div>
            </div>
            <div className="h-10 w-[1px] bg-slate-800" />
            <div className="flex -space-x-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className={`w-10 h-10 rounded-full border-2 border-slate-900 flex items-center justify-center text-[10px] font-black ${i < selectedPlayers.length ? 'bg-accent text-white' : 'bg-slate-800 text-slate-600'}`}>
                  {i < selectedPlayers.length ? selectedPlayers[i].Player?.[0] : '?'}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Global Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm grid md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-4 relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-accent transition-colors" />
          <input
            type="text"
            placeholder="Search player to add..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            disabled={selectedPlayers.length >= 4}
            className="w-full bg-slate-50 border border-slate-200 pl-12 pr-4 py-3 rounded-xl text-sm font-bold focus:outline-none focus:border-accent focus:bg-white transition-all outline-none"
          />
          {searchResults.length > 0 && (
            <div className="absolute left-0 right-0 mt-3 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
              {searchResults.slice(0, 5).map(p => (
                <button key={p.id} onClick={() => addPlayer(p)} className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0 text-left">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-slate-400 uppercase w-8">{p.Pos_std}</span>
                    <div>
                      <div className="text-xs font-black text-slate-900">{p.Player}</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase">{p.Squad_std}</div>
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-slate-300" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="md:col-span-8 flex flex-wrap gap-2 items-center justify-end">
          {['FW', 'MF', 'DF', 'GK'].map(pos => (
            <button key={pos} onClick={() => setPositionFilter(pos)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${positionFilter === pos ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}>
              {pos}
            </button>
          ))}
          <button onClick={() => setPositionFilter('All')} className={`ml-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${positionFilter === 'All' ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500'}`}>All</button>
        </div>
      </div>

      <ComparisonFeedback players={selectedPlayers} />

      {/* Selected Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {selectedPlayers.map(p => (
          <div key={p.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-accent transition-all group relative">
            <button onClick={() => removePlayer(p.id)} className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:bg-danger/10 hover:text-danger transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="space-y-4 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-xs font-black text-slate-400 group-hover:bg-accent group-hover:text-white transition-all">
                  {p.Player?.[0]}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">{p.Player}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{p.Squad_std}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
                <div className="space-y-1">
                  <div className="text-[8px] font-black text-slate-400 uppercase">Potential</div>
                  <div className="text-sm font-black text-slate-900 italic tracking-tighter">{formatValue(p.peak_potential)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-[8px] font-black text-slate-400 uppercase">Performance</div>
                  <div className="text-sm font-black text-accent italic tracking-tighter">{formatValue(p.current_rating)}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
        {selectedPlayers.length < 4 && (
          <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-white hover:border-accent/40 transition-all">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3 group-hover:bg-accent group-hover:text-white transition-all">
              <Plus className="w-5 h-5 text-slate-400" />
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Awaiting Profile</span>
          </div>
        )}
      </div>

      {/* Advanced Visualization Engine */}
      {selectedPlayers.length >= 2 && (
        <div className="space-y-6 animate-in fade-in duration-700">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-left">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 rounded-lg bg-indigo-50">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Cross-Metric Distribution</h2>
            </div>
            <CompareCharts players={selectedPlayers} />
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-left">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 rounded-lg bg-emerald-50">
                <ArrowLeftRight className="w-5 h-5 text-emerald-600" />
              </div>
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Tactical Comparison</h2>
            </div>
            <CompareTable players={selectedPlayers} />
          </div>
        </div>
      )}

      {selectedPlayers.length < 2 && (
        <div className="bg-white rounded-[2rem] border border-slate-200 p-20 text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 opacity-40">
            <Users className="w-10 h-10 text-slate-300" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Registry Incomplete</h2>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">Select at least two prospect profiles to activate the comparison tool.</p>
        </div>
      )}
    </div>
  );
}

export default ComparePlayers;