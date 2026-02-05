// src/pages/Home.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy, Users, Target, BarChart3,
  Search, Award, ArrowRight,
  Activity, Zap, Radar, Heart
} from 'lucide-react';
import api from '../services/api';

function Home() {
  const [stats, setStats] = useState(null);
  const [topPlayers, setTopPlayers] = useState([]);
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

      const sorted = [...allPlayers]
        .sort((a, b) => (b.peak_potential || 0) - (a.peak_potential || 0))
        .slice(0, 10);
      setTopPlayers(sorted);
    } catch (err) {
      console.error('Error loading home data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-200 border-t-accent rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-slate-100 rounded-full" />
            </div>
          </div>
          <p className="text-slate-500 font-bold text-xs uppercase tracking-widest animate-pulse">Initializing Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Cinematic Header & Hero Section Combined */}
      <div className="relative rounded-[2.5rem] overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/30 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]" />
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        </div>

        <div className="relative z-10 p-8 lg:p-12">
          {/* Top Bar inside Hero */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-accent/80">Live Scouting Intelligence</span>
              </div>
              <h1 className="text-4xl lg:text-5xl font-black text-white italic tracking-tighter uppercase leading-none">
                Scouting <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-indigo-400">Dashboard</span>
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="px-5 py-3 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 flex items-center gap-4">
                <div className="text-center">
                  <div className="text-xl font-black text-white">{stats?.total_players || 0}</div>
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Profiles</div>
                </div>
                <div className="h-8 w-[1px] bg-white/10" />
                <div className="text-center">
                  <div className="text-xl font-black text-accent">{(stats?.max_potential || 0).toFixed(1)}</div>
                  <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Peak Pot.</div>
                </div>
              </div>
              <button onClick={() => loadData()} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all text-white active:scale-95">
                <Activity className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Hero Content */}
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h2 className="text-2xl lg:text-3xl font-bold text-slate-200 leading-tight">
                Identifying the elite <span className="text-white underline decoration-accent decoration-4 underline-offset-4">U19 talents</span> across global football ecosystems.
              </h2>
              <p className="text-slate-400 text-sm lg:text-base max-w-lg leading-relaxed font-medium">
                Our proprietary analyzer utilizes multi-dimensional performance metrics to project
                future development trajectories with high reliability.
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <Link to="/players" className="group flex items-center gap-3 px-8 py-4 bg-accent hover:bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-xl shadow-accent/20 active:scale-95">
                  <Search className="w-4 h-4" />
                  Launch Scout Registry
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link to="/analytics" className="flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 font-black uppercase tracking-widest text-[11px] transition-all active:scale-95">
                  <BarChart3 className="w-4 h-4" />
                  Market Trends
                </Link>
              </div>
            </div>

            {/* Interactive Visual Element */}
            <div className="hidden lg:flex justify-center relative">
              <div className="w-72 h-72 rounded-[3rem] bg-gradient-to-br from-accent/20 to-indigo-500/10 border border-white/10 flex items-center justify-center relative group">
                <div className="absolute inset-4 border border-dashed border-white/5 rounded-[2.5rem] animate-[spin_20s_linear_infinite]" />
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-slate-900 rounded-3xl border border-white/10 flex flex-col items-center justify-center shadow-2xl rotate-12 group-hover:rotate-0 transition-transform duration-500">
                  <Zap className="w-6 h-6 text-warning mb-1" />
                  <span className="text-xs font-black text-white">ELITE</span>
                  <span className="text-[10px] text-slate-500 font-bold">{stats?.elite_count || 0}</span>
                </div>
                <div className="text-center space-y-2">
                  <Trophy className="w-12 h-12 text-accent mx-auto mb-4" />
                  <div className="text-5xl font-black text-white italic tracking-tighter">
                    {stats?.avg_potential?.toFixed(1) || '0.0'}
                  </div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">League Benchmark</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modern Action Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ActionTile
          title="Comparison Tool"
          desc="Tactical head-to-head analysis."
          icon={Radar}
          link="/compare"
          color="blue"
        />
        <ActionTile
          title="Shortlist"
          desc="Track identified priority targets."
          icon={Heart}
          link="/watchlist"
          color="rose"
        />
        <ActionTile
          title="Top 100"
          desc="The definitive elite rankings."
          icon={Award}
          link="/rankings"
          color="amber"
        />
        <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col justify-center shadow-sm">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Systems Status</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-success w-[94%]" />
            </div>
            <span className="text-[10px] font-black text-slate-900 italic">94% FIDELITY</span>
          </div>
        </div>
      </div>

      {/* Registry Preview Section */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-stretch">
        <div className="xl:col-span-2 space-y-6 flex flex-col min-w-0">
          <div className="flex items-center justify-between px-4">
            <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tight flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center text-white">
                <Users className="w-4 h-4" />
              </div>
              Elite Registry Preview
            </h3>
            <Link to="/players" className="text-[10px] font-black uppercase text-accent hover:underline flex items-center gap-2">
              View All Profiles <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden flex-1">
            <div className="overflow-x-auto min-w-0">
              <table className="w-full text-left table-fixed">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/3">Profile</th>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest w-1/4">Affiliation</th>
                    <th className="px-4 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center w-20">Pos</th>
                    <th className="px-6 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Potential Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {topPlayers.map((player, idx) => (
                    <tr key={player.id} className="hover:bg-slate-50/80 transition-all group cursor-pointer" onClick={() => window.open(`/player/${player.id}`, '_self')}>
                      <td className="px-6 py-4 truncate">
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-slate-950 flex items-center justify-center text-white text-[10px] font-black group-hover:bg-accent transition-colors">
                            {idx + 1}
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-black text-slate-900 group-hover:text-accent transition-colors truncate">{player.Player}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter truncate">Age {player.Age_std || player.Age} • {player.Nation_std}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-[10px] font-black text-slate-500 uppercase italic tracking-tight truncate">{player.Squad_std}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center">
                          <PositionBadge position={player.Pos_std} />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-end gap-1.5 min-w-0">
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <span className="text-sm font-black text-slate-900 italic tracking-tighter">{(player.peak_potential || 0).toFixed(1)}</span>
                            <span className="text-[10px] font-black text-success">
                              +{(player.peak_potential - player.current_rating).toFixed(1)}
                            </span>
                          </div>
                          <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden">
                            <div className="bg-accent h-full" style={{ width: `${(player.peak_potential / 100) * 100}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Prime Prospect Spotlight */}
        <div className="flex flex-col min-w-0">
          <div className="bg-slate-950 rounded-[2.5rem] p-8 text-white relative overflow-hidden h-full flex flex-col border border-slate-800 shadow-2xl group cursor-pointer" onClick={() => topPlayers[0] && window.open(`/player/${topPlayers[0].id}`, '_self')}>
            <div className="absolute top-0 right-0 w-48 h-48 bg-accent/20 rounded-full blur-[80px] group-hover:bg-accent/30 transition-all duration-700" />

            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2 bg-warning/20 rounded-lg border border-warning/30">
                  <Award className="w-4 h-4 text-warning" />
                </div>
                <h4 className="text-xs font-black uppercase tracking-[0.2em] italic text-warning">Prime Prospect Spotlight</h4>
              </div>

              {topPlayers[0] ? (
                <div className="space-y-6 flex-1 flex flex-col">
                  <div className="space-y-2">
                    <div className="text-4xl lg:text-5xl font-black italic tracking-tighter uppercase leading-none text-white group-hover:text-accent transition-colors">
                      {topPlayers[0].Player.split(' ').pop()}
                    </div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                      {topPlayers[0].Squad_std} • {topPlayers[0].Age_std || topPlayers[0].Age} Years
                    </div>
                  </div>

                  <div className="py-6 border-y border-white/5 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Potential Score</div>
                      <div className="text-4xl font-black text-accent italic">{(topPlayers[0].peak_potential || 0).toFixed(1)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Position</div>
                      <div className="text-xl font-black text-white italic">{topPlayers[0].Pos_std}</div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-slate-500">Recruitability Index</span>
                      <span className="text-success">HIGH</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-accent to-indigo-500" style={{ width: '88%' }} />
                    </div>
                  </div>

                  <div className="mt-auto pt-8">
                    <div className="inline-flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-widest group-hover:gap-4 transition-all">
                      View  Details <ArrowRight className="w-4 h-4 text-accent" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 text-slate-500">
                  <Users className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Registry Data...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
}

// Sub-components
function ActionTile({ title, desc, icon: Icon, link, color }) {
  const themes = {
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    rose: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20'
  };

  return (
    <Link to={link} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:border-accent group transition-all">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all group-hover:scale-110 ${themes[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1">{title}</h4>
      <p className="text-[11px] text-slate-500 leading-tight font-medium uppercase tracking-tighter">{desc}</p>
    </Link>
  );
}

function FidelityCard({ label, value }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] font-black uppercase italic tracking-widest">
        <span className="text-slate-500">{label}</span>
        <span className="text-white">{value}%</span>
      </div>
      <div className="h-1 bg-white/5 rounded-full overflow-hidden">
        <div className="h-full bg-white/20" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

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

export default Home;
