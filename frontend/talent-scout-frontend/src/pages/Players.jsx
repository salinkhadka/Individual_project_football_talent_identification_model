// src/pages/Players.jsx
import { useState, useEffect, useMemo } from 'react';
import {
  Filter, Download, Target, TrendingUp, Users,
  Award, Star, Search, SlidersHorizontal, ChevronDown,
  ArrowUpDown, ExternalLink, Zap
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';

function Players() {
  const [players, setPlayers] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggleWatchlistLoading, setToggleWatchlistLoading] = useState(null);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('potential_desc');
  const [selectedPosition, setSelectedPosition] = useState('All');
  const [minPotential, setMinPotential] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [playersRes, watchlistRes] = await Promise.all([
        api.getPlayers(1, 1000),
        api.getWatchlist().catch(() => ({ data: { watchlist: [] } }))
      ]);
      setPlayers(playersRes.data.items || []);
      setWatchlist(watchlistRes.data.watchlist || []);
    } catch (err) {
      console.error('Error loading players:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredPlayers = useMemo(() => {
    let result = [...players];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.Player?.toLowerCase().includes(q) ||
        p.Squad_std?.toLowerCase().includes(q)
      );
    }

    // Position
    if (selectedPosition !== 'All') {
      result = result.filter(p => p.Pos_std === selectedPosition);
    }

    // Potential
    if (minPotential > 0) {
      result = result.filter(p => (p.peak_potential || 0) >= minPotential);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'potential_desc': return (b.peak_potential || 0) - (a.peak_potential || 0);
        case 'potential_asc': return (a.peak_potential || 0) - (b.peak_potential || 0);
        case 'current_desc': return (b.current_rating || 0) - (a.current_rating || 0);
        case 'growth_desc': return ((b.peak_potential || 0) - (b.current_rating || 0)) - ((a.peak_potential || 0) - (a.current_rating || 0));
        case 'age_asc': return (a.Age_std || a.Age || 0) - (b.Age_std || b.Age || 0);
        case 'name_asc': return a.Player?.localeCompare(b.Player);
        default: return 0;
      }
    });

    return result;
  }, [players, searchQuery, sortBy, selectedPosition, minPotential]);

  const toggleWatchlist = async (playerId, e) => {
    e.stopPropagation();
    const isInWatchlist = watchlist.some(p => String(p.player_id) === String(playerId));
    try {
      setToggleWatchlistLoading(playerId);
      if (isInWatchlist) {
        await api.removeFromWatchlist(playerId);
        setWatchlist(prev => prev.filter(p => String(p.player_id) !== String(playerId)));
      } else {
        await api.addToWatchlist(playerId);
        const response = await api.getWatchlist();
        setWatchlist(response.data.watchlist || []);
      }
    } catch (err) {
      console.error('Error toggling watchlist:', err);
    } finally {
      setToggleWatchlistLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-accent rounded-full animate-spin" />
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Hydrating Database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-accent" />
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Prospect Intelligence</h1>
          </div>
          <p className="text-slate-500 text-sm font-medium">Global U19 Scouting Database • {players.length} Verified Profiles</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {/* CSV Export Logic */ }}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-widest transition-all"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
          <div className="h-8 w-[1px] bg-slate-200 hidden md:block" />
          <div className="bg-accent/10 border border-accent/20 px-3 py-1.5 rounded-lg">
            <span className="text-accent text-[11px] font-black uppercase tracking-widest">
              Live Index: Active
            </span>
          </div>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by player name or club..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-white pl-12 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:border-accent transition-all placeholder:text-slate-600"
            />
          </div>

          {/* Main Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold transition-all border ${showFilters ? 'bg-accent text-white border-accent' : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
            >
              <Filter className="w-4 h-4" /> Filters {selectedPosition !== 'All' && '• 1'}
            </button>
            <div className="relative group">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none bg-slate-900 border border-slate-800 text-white pl-6 pr-10 py-3 rounded-xl text-sm font-bold focus:outline-none hover:bg-slate-800 cursor-pointer transition-all"
              >
                <option value="potential_desc">Top Potential ↓</option>
                <option value="current_desc">Current Performance ↓</option>
                <option value="growth_desc">Highest Growth ↓</option>
                <option value="age_asc">Youngest First ↑</option>
                <option value="name_asc">A-Z</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Expandable Advanced Filters */}
        {showFilters && (
          <div className="pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-300">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Positional Grade</label>
              <div className="flex flex-wrap gap-2">
                {['All', 'FW', 'MF', 'DF', 'GK'].map(pos => (
                  <button
                    key={pos}
                    onClick={() => setSelectedPosition(pos)}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border ${selectedPosition === pos ? 'bg-accent/20 border-accent/40 text-white' : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                  >
                    {pos}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">Potential Floor (Min: {minPotential})</label>
              <input
                type="range"
                min="0"
                max="95"
                step="5"
                value={minPotential}
                onChange={(e) => setMinPotential(parseInt(e.target.value))}
                className="w-full accent-accent h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-600">
                <span>0 PTS</span>
                <span>40 PTS</span>
                <span>80 PTS</span>
                <span>ELITE</span>
              </div>
            </div>

            <div className="flex items-end flex-wrap gap-2">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedPosition('All');
                  setMinPotential(0);
                  setSortBy('potential_desc');
                }}
                className="px-4 py-2 text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Results Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex items-center justify-between">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {filteredPlayers.length} matches found matching your criteria
          </span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest tracking-tighter">Real-time Data Active</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 inline-table w-full md:table">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-12">#</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Player Analysis</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Team Profile</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pos</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rating</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Potential</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Growth</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-24 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPlayers.length > 0 ? (
                filteredPlayers.map((player, idx) => {
                  const isInWatchlist = watchlist.some(w => String(w.player_id) === String(player.id));
                  const isToggling = toggleWatchlistLoading === player.id;
                  const growth = (player.peak_potential || 0) - (player.current_rating || 0);

                  return (
                    <tr
                      key={player.id}
                      className="hover:bg-slate-50/50 transition-all cursor-pointer group"
                      onClick={() => window.open(`/player/${player.id}`, '_self')}
                    >
                      <td className="px-6 py-5">
                        <span className="text-xs font-bold text-slate-400">{(idx + 1).toString().padStart(2, '0')}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => toggleWatchlist(player.id, e)}
                            disabled={isToggling}
                            className="focus:outline-none"
                          >
                            {isToggling ? (
                              <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Star className={`w-4 h-4 transition-all ${isInWatchlist ? 'fill-warning text-warning' : 'text-slate-200 group-hover:text-slate-300'}`} />
                            )}
                          </button>
                          <div>
                            <div className="text-sm font-black text-slate-900 leading-tight group-hover:text-accent transition-colors">{player.Player}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Age: {player.Age_std || player.Age} • {player.Nation_std}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 bg-slate-900 rounded text-white text-[9px] font-bold flex items-center justify-center">
                            {player.Squad_std?.[0]}
                          </div>
                          <span className="text-xs font-bold text-slate-700">{player.Squad_std}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <PositionBadge position={player.Pos_std} />
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-bold text-slate-900">{(player.current_rating || 0).toFixed(1)}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-black text-accent w-8">{(player.peak_potential || 0).toFixed(1)}</span>
                          <div className="flex-1 min-w-[60px] max-w-[100px] h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                            <div
                              className={`h-full transition-all duration-1000 ${player.peak_potential >= 80 ? 'bg-success' :
                                  player.peak_potential >= 70 ? 'bg-accent' :
                                    'bg-slate-400'
                                }`}
                              style={{ width: `${(player.peak_potential / 100) * 100}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className={`w-3 h-3 ${growth > 5 ? 'text-success' : 'text-slate-400'}`} />
                          <span className={`text-[11px] font-black ${growth > 5 ? 'text-success' : 'text-slate-600'}`}>
                            +{growth.toFixed(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right whitespace-nowrap">
                        <Link
                          to={`/player/${player.id}`}
                          className="p-2 hover:bg-slate-100 rounded-lg inline-block transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-4 h-4 text-slate-400 hover:text-accent transition-colors" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <Target className="w-12 h-12" />
                      <p className="text-sm font-black uppercase tracking-widest">No Prospects Found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Teaser */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-center">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
            Displaying high-confidence verified profiles only. For deep-tail historical data, contact system admin.
          </p>
        </div>
      </div>
    </div>
  );
}

// Sub-components
function PositionBadge({ position }) {
  const config = {
    FW: 'text-orange-600 bg-orange-50 border-orange-100',
    MF: 'text-indigo-600 bg-indigo-50 border-indigo-100',
    DF: 'text-blue-600 bg-blue-50 border-blue-100',
    GK: 'text-emerald-600 bg-emerald-50 border-emerald-100'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border ${config[position] || 'text-slate-500 bg-slate-50 border-slate-100'}`}>
      {position}
    </span>
  );
}

export default Players;
