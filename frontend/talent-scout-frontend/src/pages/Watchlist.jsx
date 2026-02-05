// src/pages/Watchlist.jsx
import { useEffect, useState } from 'react';
import { Star, Trash2, Eye, Award, Zap, TrendingUp, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import PlayerCard from '../components/PlayerCard';

function Watchlist() {
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [removing, setRemoving] = useState(null);

  useEffect(() => { loadWatchlist(); }, []);

  const loadWatchlist = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getWatchlist();
      const mappedWatchlist = (response.data.watchlist || []).map(item => ({
        id: parseInt(item.player_id),
        Player: item.player_name,
        Squad_std: item.team,
        Pos_std: item.position,
        peak_potential: item.peak_potential,
        current_rating: item.current_rating || 0,
      }));
      setWatchlist(mappedWatchlist);
    } catch (err) { setError(err.response?.data?.error || err.message); }
    finally { setLoading(false); }
  };

  const handleRemove = async (playerId) => {
    if (!playerId) return;
    try {
      setRemoving(playerId);
      await api.removeFromWatchlist(playerId);
      setWatchlist(prev => prev.filter(p => p.id !== playerId));
    } catch (err) { console.error('Error removing:', err); }
    finally { setRemoving(null); }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="w-12 h-12 border-4 border-slate-200 border-t-accent rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Loading Scouting Shortlist...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cinematic Watchlist Header */}
      <div className="bg-slate-950 rounded-[2rem] p-8 lg:p-12 text-white relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-warning/5 to-transparent pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-warning/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-warning/20 border border-warning/30">
                <Star className="w-5 h-5 text-warning fill-warning/20" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-black italic uppercase tracking-tight">Scouting Shortlist</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium max-w-md uppercase tracking-[0.15em] text-[10px]">Private shortlist of high-potential prospects for ongoing monitoring.</p>
          </div>
          <div className="flex items-center gap-6 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
            <div className="text-center">
              <div className="text-4xl font-black text-white">{watchlist.length}</div>
              <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">Players Tracked</div>
            </div>
            <div className="h-10 w-[1px] bg-slate-800" />
            <div className="text-right">
              <div className="text-lg font-black text-warning">{(watchlist.reduce((sum, p) => sum + (p.peak_potential || 0), 0) / (watchlist.length || 1)).toFixed(1)}</div>
              <div className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">Average Potential</div>
            </div>
          </div>
        </div>
      </div>

      {watchlist.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-slate-200 p-20 text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 opacity-40">
            <Star className="w-10 h-10 text-slate-300" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Shortlist Deactivated</h2>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mb-8">Begin scouting the global registry and flag priority prospects to initialize your shortlist.</p>
          <Link to="/players" className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg">
            Open Database <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <WatchlistKPI label="Elite Prospects" value={watchlist.filter(p => (p.peak_potential || 0) >= 80).length} icon={Award} color="blue" />
            <WatchlistKPI label="Potential Growth" value={watchlist.filter(p => (p.peak_potential || 0) >= 70 && (p.peak_potential || 0) < 80).length} icon={Zap} color="orange" />
            <WatchlistKPI label="Portfolio Momentum" value="+2.4%" icon={TrendingUp} color="success" />
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto text-left">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Player Profile</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Club</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Pos</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Rating</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Potential Score</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {watchlist.map((player) => (
                    <tr key={player.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-white text-xs font-black group-hover:bg-accent transition-colors">
                            {player.Player?.[0]}
                          </div>
                          <div>
                            <div className="text-sm font-black text-slate-900 leading-tight">{player.Player}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter italic">Vetted Prospect</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-[10px] font-black text-slate-600 uppercase italic leading-tight">{player.Squad_std}</div>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 uppercase italic">
                          {player.Pos_std}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-center font-bold text-slate-900 text-sm">
                        {parseFloat(player.current_rating || 0).toFixed(1)}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex flex-col items-end gap-1.5">
                          <span className="text-sm font-black text-accent italic tracking-tighter">{parseFloat(player.peak_potential || 0).toFixed(1)}</span>
                          <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-accent" style={{ width: `${Math.min((player.peak_potential || 0), 100)}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center justify-end gap-2">
                          <Link to={`/player/${player.id}`} className="p-2 text-slate-400 hover:text-accent hover:bg-accent/5 rounded-xl transition-all">
                            <Eye className="w-4 h-4" />
                          </Link>
                          <button onClick={() => handleRemove(player.id)} disabled={removing === player.id} className="p-2 text-slate-400 hover:text-danger hover:bg-danger/5 rounded-xl transition-all">
                            {removing === player.id ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selectedPlayer && <PlayerCard player={selectedPlayer} onClose={() => setSelectedPlayer(null)} />}
    </div>
  );
}

function WatchlistKPI({ label, value, icon: Icon, color }) {
  const themes = {
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
    orange: 'bg-orange-50 border-orange-100 text-orange-600',
    success: 'bg-success/10 border-success/20 text-success'
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-warning/40 transition-all text-left">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${themes[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</div>
      <div className="text-2xl font-black text-slate-900 italic tracking-tighter">{value}</div>
    </div>
  );
}

export default Watchlist;