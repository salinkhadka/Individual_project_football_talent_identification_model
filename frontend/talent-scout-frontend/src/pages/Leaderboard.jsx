// src/pages/Leaderboard.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Download, Trophy, Star, TrendingUp, Award, ChevronRight, SlidersHorizontal, RefreshCw } from 'lucide-react';
import axios from 'axios';
import PlayerCard from '../components/PlayerCard';

const API_URL = 'http://127.0.0.1:5000';

function Leaderboard() {
  const [players, setPlayers] = useState([]);
  const [filteredPlayers, setFilteredPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('All');
  const [minAge, setMinAge] = useState('');
  const [maxAge, setMaxAge] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => { loadPlayers(); }, []);
  useEffect(() => { if (players?.length > 0) filterPlayers(); }, [searchTerm, selectedPosition, minAge, maxAge, players]);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/top_players?n=100`);
      let data = response.data;
      if (typeof data === 'string') data = JSON.parse(data);
      const playersData = data?.players || [];
      setPlayers(playersData);
      setFilteredPlayers(playersData);
    } catch (error) {
      setError(error.response?.data?.error || error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterPlayers = () => {
    let filtered = [...players];
    if (searchTerm) {
      filtered = filtered.filter(p => p.Player?.toLowerCase().includes(searchTerm.toLowerCase()) || p.Squad_std?.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    if (selectedPosition !== 'All') filtered = filtered.filter(p => p.Pos_std?.includes(selectedPosition));
    if (minAge) filtered = filtered.filter(p => p.Age >= parseInt(minAge));
    if (maxAge) filtered = filtered.filter(p => p.Age <= parseInt(maxAge));
    setFilteredPlayers(filtered);
  };

  if (loading) return <div className="flex flex-col items-center justify-center h-96 gap-4"><div className="w-12 h-12 border-4 border-slate-200 border-t-accent rounded-full animate-spin" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Loading Top Players...</p></div>;

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
              <h1 className="text-3xl lg:text-4xl font-black italic uppercase tracking-tight">Global Leaderboard</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium max-w-md uppercase tracking-[0.15em] text-[10px]">Real-time audit of the top 100 high-potential profiles across the global network.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex items-center gap-6">
            <div className="text-center">
              <div className="text-4xl font-black text-white italic">{filteredPlayers.length}</div>
              <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">Total Players</div>
            </div>
            <div className="h-10 w-[1px] bg-slate-800" />
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1 justify-end">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-[10px] font-black text-success uppercase">Index Loaded</span>
              </div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter italic italic">System Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Console */}
      <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 italic">
              <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            </div>
            <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest">Filter Matrix</h2>
          </div>
          <button onClick={() => { setSearchTerm(''); setSelectedPosition('All'); setMinAge(''); setMaxAge(''); }} className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-accent transition-colors">
            <RefreshCw className="w-3 h-3" /> Reset Registry
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Profile Identity</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Simulate player search..." className="w-full bg-slate-50 border-none pl-12 pr-4 py-3 rounded-xl text-xs font-black uppercase text-slate-700 outline-none" />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tactical Position</label>
            <div className="flex flex-wrap gap-2">
              {['All', 'FW', 'MF', 'DF', 'GK'].map((pos) => (
                <button key={pos} onClick={() => setSelectedPosition(pos)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${selectedPosition === pos ? 'bg-slate-900 border-slate-900 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'}`}>
                  {pos}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Age Range</label>
            <div className="flex gap-3">
              <input type="number" placeholder="Min" value={minAge} onChange={(e) => setMinAge(e.target.value)} className="w-full bg-slate-50 border-none px-4 py-3 rounded-xl text-xs font-black text-center text-slate-900 outline-none" />
              <input type="number" placeholder="Max" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} className="w-full bg-slate-50 border-none px-4 py-3 rounded-xl text-xs font-black text-center text-slate-900 outline-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard Grid */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto text-left">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Rank</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Full Identity</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Affiliation</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Pos</th>
                <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center italic">Potential Rating</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Operation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredPlayers.map((player, index) => (
                <tr key={player.Rank || index} className="hover:bg-slate-50/80 transition-colors group cursor-pointer" onClick={() => setSelectedPlayer(player)}>
                  <td className="px-8 py-5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm italic ${index === 0 ? 'bg-warning text-white shadow-lg' :
                      index === 1 ? 'bg-slate-300 text-slate-700' :
                        index === 2 ? 'bg-orange-400 text-white' :
                          'bg-slate-100 text-slate-400'
                      }`}>
                      {player.Rank || index + 1}
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-sm font-black text-slate-900 italic tracking-tight">{player.Player || 'Unknown'}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5 tracking-tighter">Verified Prospect Profile</div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{player.Squad_std || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 uppercase italic">
                      {player.Pos_std || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-sm font-black text-accent italic tracking-tighter">{(player.PredictedPotential || 0).toFixed(1)}</span>
                      <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${Math.min(player.PredictedPotential || 0, 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="inline-flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase group-hover:text-accent transition-colors">
                      Deep Review <ChevronRight className="w-4 h-4" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedPlayer && <PlayerCard player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}
    </div>
  );
}

export default Leaderboard;