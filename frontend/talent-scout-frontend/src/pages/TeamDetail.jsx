// src/pages/TeamDetail.jsx
import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, Users, TrendingUp, Target, Activity, Zap, ChevronRight, BarChart3, Map as PitchIcon } from 'lucide-react';
import api from '../services/api';

function TeamDetail() {
  const { teamName } = useParams();
  const navigate = useNavigate();
  const [teamData, setTeamData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState('all');

  useEffect(() => { loadTeamData(); }, [teamName]);

  const loadTeamData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getTeamAnalytics(teamName);
      const data = response.data;
      const totalPlayers = data.players?.length || 0;
      const avgPotential = totalPlayers > 0 ? data.players.reduce((sum, p) => sum + (p.peak_potential || 0), 0) / totalPlayers : 0;
      const avgCurrent = totalPlayers > 0 ? data.players.reduce((sum, p) => sum + (p.current_rating || 0), 0) / totalPlayers : 0;
      const avgAge = totalPlayers > 0 ? data.players.reduce((sum, p) => sum + (p.Age_std || 0), 0) / totalPlayers : 0;
      setTeamData({ ...data, total_players: totalPlayers, avg_ratings: { peak_potential: avgPotential, current_rating: avgCurrent }, avg_age: avgAge });
    } catch (err) { setError(err.response?.data?.error || err.message); }
    finally { setLoading(false); }
  };

  if (loading) return <Loader />;
  if (error) return <ErrorView error={error} />;

  const filteredPlayers = selectedPosition === 'all' ? teamData.players : teamData.players.filter((p) => {
    const pos = p.Pos_std || '';
    if (selectedPosition === 'GK') return pos === 'GK';
    if (selectedPosition === 'DF') return pos.startsWith('DF');
    if (selectedPosition === 'MF') return pos.startsWith('MF');
    if (selectedPosition === 'FW') return pos.startsWith('FW');
    return false;
  });

  return (
    <div className="space-y-6">
      {/* Navigation & Context */}
      <div className="flex items-center justify-between">
        <Link to="/teams" className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-accent transition-colors">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back to Teams
        </Link>
        <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" /> Live Analysis Active
        </div>
      </div>

      {/* Cinematic Team Header */}
      <div className="bg-slate-950 rounded-[2rem] p-8 lg:p-12 text-white relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-accent/10 to-transparent pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-accent/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center justify-center">
                  <Shield className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl lg:text-5xl font-black italic uppercase tracking-tight text-white">{decodeURIComponent(teamName)}</h1>
                  <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] mt-1">Tactical Youth Architecture</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-8 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
              <div className="text-center">
                <div className="text-3xl font-black text-white italic">{teamData.total_players}</div>
                <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">Total Players</div>
              </div>
              <div className="h-10 w-[1px] bg-slate-800" />
              <div className="text-center">
                <div className="text-3xl font-black text-accent italic">{teamData.avg_ratings?.peak_potential.toFixed(1)}</div>
                <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">Avg Potential</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats Mapping */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatKPI label="Avg Age" value={`${teamData.avg_age.toFixed(1)}y`} icon={Activity} color="indigo" />
        <StatKPI label="Top Potential" value={teamData.top_prospects?.[0]?.peak_potential?.toFixed(1) || '0.0'} icon={Zap} color="warning" />
        <StatKPI label="Current Rating" value={teamData.avg_ratings?.current_rating.toFixed(1)} icon={Target} color="success" />
        <StatKPI label="Squad Gaps" value={Object.values(teamData.position_breakdown).filter(v => v === 0).length} icon={BarChart3} color="danger" />
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Tactical Pitch Visualizer */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <PitchIcon className="w-4 h-4 text-slate-400" />
                <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Team Formation</h2>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-50 rounded-full border border-slate-100">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter italic">Preset: 4-3-3 Standard</span>
              </div>
            </div>

            <div className="relative group">
              <FormationField
                selectedPosition={selectedPosition}
                onPositionClick={setSelectedPosition}
                positionBreakdown={teamData.position_breakdown}
              />
            </div>

            <div className="flex flex-wrap gap-2 justify-center mt-10">
              {['all', 'GK', 'DF', 'MF', 'FW'].map((pos) => (
                <button
                  key={pos}
                  onClick={() => setSelectedPosition(pos)}
                  className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${selectedPosition === pos
                    ? 'bg-slate-950 border-slate-950 text-white shadow-xl'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                >
                  {pos === 'all' ? 'All Units' : pos}
                  <span className={`ml-2 ${selectedPosition === pos ? 'text-accent' : 'text-slate-300'}`}>
                    ({pos !== 'all' ? teamData.position_breakdown[pos] || 0 : teamData.players.length})
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Intelligence */}
        <div className="lg:col-span-4 space-y-6">
          {/* Top Prospects Feed */}
          <div className="bg-slate-950 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] mb-8 text-slate-400">Top Prospects</h2>
            <div className="space-y-4">
              {teamData.top_prospects?.slice(0, 5).map((player, idx) => (
                <div
                  key={player.id}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all cursor-pointer group"
                  onClick={() => navigate(`/player/${player.id}`)}
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-[10px] font-black italic text-accent group-hover:scale-110 transition-transform">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black uppercase italic tracking-tight text-white truncate">{player.name}</p>
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{player.position}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-accent">{player.peak_potential.toFixed(1)}</p>
                    <p className="text-[7px] font-bold text-slate-500 uppercase tracking-tighter">POT</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tactical Recommendation */}
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-accent" />
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Coach Insight</span>
            </div>
            <p className="text-[11px] text-slate-500 font-bold leading-relaxed uppercase italic">
              {teamData.avg_ratings?.peak_potential > 75
                ? "Elite developmental setup detected. Focus on individual growth pathways for Tier-1 prospects."
                : "Structural rebuild recommended. Identify specific positional gaps in the technical depth matrix."}
            </p>
          </div>
        </div>
      </div>

      {/* Personnel Registry */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="w-4 h-4 text-slate-400" />
            <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
              {selectedPosition === 'all' ? 'Team Squad' : `${selectedPosition} Players`}
              <span className="ml-3 text-slate-300 font-medium">[{filteredPlayers.length} Units]</span>
            </h2>
          </div>
        </div>
        <div className="overflow-x-auto text-left">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Profile Identity</th>
                <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Role</th>
                <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Age</th>
                <th className="px-6 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">Current</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Potential Rating</th>
                <th className="px-8 py-5 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredPlayers.map((player) => (
                <tr
                  key={player.id}
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  onClick={() => navigate(`/player/${player.id}`)}
                >
                  <td className="px-8 py-5">
                    <div className="text-sm font-black text-slate-900 italic tracking-tight uppercase leading-none">{player.Player}</div>
                    <div className="text-[8px] font-black text-slate-400 uppercase mt-1 tracking-widest italic">Verified Squad Entry</div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-[9px] font-black text-slate-600 uppercase italic">
                      {player.Pos_std || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-center text-[10px] font-black text-slate-600 italic">{player.Age_std ?? 'N/A'}y</td>
                  <td className="px-6 py-5 text-center text-[10px] font-black text-indigo-600 italic tracking-tighter">{(player.current_rating || 0).toFixed(1)}</td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-sm font-black text-accent italic tracking-tighter">{(player.peak_potential || 0).toFixed(1)}</span>
                      <div className="w-20 h-1 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-accent" style={{ width: `${Math.min(player.peak_potential || 0, 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 group-hover:text-accent transition-colors">
                      Profile <ChevronRight className="w-4 h-4" />
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

// ---------- Visual Logic Components ----------
function FormationField({ selectedPosition, onPositionClick, positionBreakdown }) {
  const positions = [
    { id: 'gk', type: 'GK', x: 10, y: 50, label: 'GK' },
    { id: 'df1', type: 'DF', x: 25, y: 20, label: 'DF' },
    { id: 'df2', type: 'DF', x: 25, y: 40, label: 'DF' },
    { id: 'df3', type: 'DF', x: 25, y: 60, label: 'DF' },
    { id: 'df4', type: 'DF', x: 25, y: 80, label: 'DF' },
    { id: 'mf1', type: 'MF', x: 50, y: 30, label: 'MF' },
    { id: 'mf2', type: 'MF', x: 50, y: 50, label: 'MF' },
    { id: 'mf3', type: 'MF', x: 50, y: 70, label: 'MF' },
    { id: 'fw1', type: 'FW', x: 75, y: 30, label: 'FW' },
    { id: 'fw2', type: 'FW', x: 75, y: 50, label: 'FW' },
    { id: 'fw3', type: 'FW', x: 75, y: 70, label: 'FW' },
  ];

  const width = 800;
  const height = 400;
  const scaleX = (x) => (x / 100) * width;
  const scaleY = (y) => (y / 100) * height;

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-4 border-slate-900/10">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full bg-[#2d5a27]">
        {/* Pitch Texture Patterns */}
        <defs>
          <pattern id="grass-pattern-team" x="0" y="0" width="80" height="400" patternUnits="userSpaceOnUse">
            <rect width="40" height="400" fill="#2d5a27" />
            <rect x="40" width="40" height="400" fill="#274e22" />
          </pattern>
        </defs>

        {/* Grass Stripes */}
        <rect width={width} height={height} fill="url(#grass-pattern-team)" />

        {/* Field Markings */}
        <rect x="10" y="10" width={width - 20} height={height - 20} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
        <line x1={width / 2} y1="10" x2={width / 2} y2={height - 10} stroke="rgba(255,255,255,0.4)" strokeWidth="3" />
        <circle cx={width / 2} cy={height / 2} r="60" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="3" />

        {/* Goal Boxes */}
        <rect x="10" y={(height - 160) / 2} width="60" height="160" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
        <rect x={width - 70} y={(height - 160) / 2} width="60" height="160" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />

        {positions.map((pos) => {
          const isSelected = selectedPosition === pos.type || selectedPosition === 'all';
          const count = positionBreakdown[pos.type] || 0;
          return (
            <g key={pos.id} onClick={() => onPositionClick(pos.type)} className="cursor-pointer group">
              <circle
                cx={scaleX(pos.x)}
                cy={scaleY(pos.y)}
                r={isSelected ? 26 : 20}
                fill={isSelected ? '#3B82F6' : 'rgba(0,0,0,0.3)'}
                stroke={isSelected ? '#fff' : 'rgba(255,255,255,0.2)'}
                strokeWidth={isSelected ? 4 : 2}
                className="transition-all duration-300 group-hover:r-28"
              />
              <text x={scaleX(pos.x)} y={scaleY(pos.y) + 4} textAnchor="middle" fill="white" fontSize="10" fontWeight="900" className="uppercase italic tracking-tighter">{pos.label}</text>
              {count > 0 && (
                <g>
                  <circle cx={scaleX(pos.x) + 15} cy={scaleY(pos.y) - 15} r="10" fill={isSelected ? '#10B981' : '#334155'} stroke="white" strokeWidth="2" />
                  <text x={scaleX(pos.x) + 15} y={scaleY(pos.y) - 11} textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">{count}</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function StatKPI({ label, value, icon: Icon, color }) {
  const themes = {
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-600',
    warning: 'bg-warning/10 border-warning/20 text-warning',
    success: 'bg-success/10 border-success/20 text-success',
    danger: 'bg-danger/10 border-danger/20 text-danger'
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col items-center group hover:border-accent/40 transition-all">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${themes[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-900 italic tracking-tighter">{value}</p>
    </div>
  );
}

function Loader() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-accent rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Loading Team Data...</p>
    </div>
  );
}

function ErrorView({ error }) {
  return (
    <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-200 shadow-sm">
      <Shield className="w-16 h-16 text-slate-200 mx-auto mb-6" />
      <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase italic tracking-tight">Signal Lost</h2>
      <p className="text-slate-500 text-sm max-w-sm mx-auto mb-8 uppercase font-bold">{error}</p>
      <Link to="/teams" className="inline-flex items-center gap-2 px-8 py-4 bg-slate-950 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">
        <ArrowLeft className="w-4 h-4" /> Re-Engage Registry
      </Link>
    </div>
  );
}

export default TeamDetail;