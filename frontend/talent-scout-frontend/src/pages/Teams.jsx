// src/pages/Teams.jsx
import { useEffect, useState } from 'react';
import { Shield, Users, TrendingUp, Search, SlidersHorizontal, RefreshCw, ChevronRight, Zap, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function Teams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => { loadTeams(); }, []);

  const loadTeams = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getTeams();
      let teamsData = [];
      if (Array.isArray(response.data)) teamsData = response.data;
      else if (response.data.teams) teamsData = response.data.teams;
      else if (response.data.data) teamsData = response.data.data;
      setTeams(teamsData);
    } catch (err) { setError(err.response?.data?.error || err.message); }
    finally { setLoading(false); }
  };

  const filteredTeams = teams.filter(team => {
    const teamName = team.team || team.team_name || team.name || team.Squad_std || '';
    return teamName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-accent rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mapping Teams Database...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Cinematic Teams Header */}
      <div className="bg-slate-950 rounded-[2rem] p-8 lg:p-12 text-white relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30">
                <Shield className="w-5 h-5 text-indigo-400" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-black italic uppercase tracking-tight">Teams Directory</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium max-w-md uppercase tracking-[0.15em] text-[10px]">Strategic aggregation of youth development operations by club affiliation.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex items-center gap-6">
            <div className="text-center">
              <div className="text-4xl font-black text-white italic">{teams.length}</div>
              <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">Total Teams</div>
            </div>
            <div className="h-10 w-[1px] bg-slate-800" />
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1 justify-end">
                <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-[10px] font-black text-indigo-400 uppercase">Live Index</span>
              </div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter italic italic">System Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Module */}
      <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm flex flex-col md:flex-row items-center gap-6">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-accent transition-colors" />
          <input
            type="text"
            placeholder="Search teams..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border-none pl-12 pr-4 py-4 rounded-2xl text-xs font-black uppercase text-slate-700 outline-none focus:ring-2 focus:ring-accent/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-4">
          <button onClick={loadTeams} className="p-4 rounded-2xl bg-slate-50 text-slate-400 hover:text-accent hover:bg-white border-transparent hover:border-slate-200 border transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="h-10 w-[1px] bg-slate-200 hidden md:block" />
          <div className="flex items-center gap-2 bg-slate-50 px-6 py-4 rounded-2xl border border-transparent">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Filters Off</span>
          </div>
        </div>
      </div>

      {/* Teams Matrix Grid */}
      {filteredTeams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeams.map((team, index) => (
            <TeamCard
              key={team.team || team.team_name || team.name || index}
              team={team}
              onClick={() => navigate(`/team/${encodeURIComponent(team.team || team.team_name || team.name)}`)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-slate-200 p-20 text-center shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8 opacity-40">
            <Shield className="w-10 h-10 text-slate-300" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">No Teams Found</h2>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">No organizations match the current search parameters.</p>
        </div>
      )}
    </div>
  );
}

function TeamCard({ team, onClick }) {
  const teamName = team.team || team.team_name || team.name || team.Squad_std || 'Unknown Unit';
  const playerCount = team.player_count || team.total_players || 0;
  const avgPotential = team.avg_potential || team.average_potential || 0;
  const avgCurrent = team.avg_current || team.average_current || 0;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm hover:border-accent hover:shadow-xl transition-all duration-300 cursor-pointer group relative overflow-hidden text-left"
    >
      <div className="absolute -top-4 -right-4 w-24 h-24 bg-accent/5 rounded-full blur-2xl group-hover:bg-accent/10 transition-colors" />

      <div className="flex items-start justify-between mb-8 relative z-10">
        <div>
          <h3 className="text-xl font-black text-slate-900 mb-1 leading-tight uppercase italic break-words">{teamName}</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Team Profile</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center group-hover:bg-accent transition-colors shadow-lg">
          <Shield className="w-6 h-6 text-white" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-8 relative z-10">
        <Metric label="Players" value={playerCount} icon={Users} color="slate" />
        <Metric label="Potential" value={avgPotential.toFixed(1)} icon={TrendingUp} color="accent" />
        <Metric label="Current" value={avgCurrent.toFixed(1)} icon={Target} color="indigo" />
      </div>

      <div className="pt-6 border-t border-slate-50 flex items-center justify-between group-hover:border-accent/10 transition-colors relative z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-success" />
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Verified Ops</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 group-hover:text-accent transition-colors">
          View Analytics <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, icon: Icon, color }) {
  const colors = {
    slate: 'text-slate-900',
    accent: 'text-accent',
    indigo: 'text-indigo-600'
  };
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 opacity-40">
        <Icon className="w-3 h-3 text-slate-900" />
        <span className="text-[8px] font-black text-slate-900 uppercase tracking-tighter">{label}</span>
      </div>
      <div className={`text-base font-black italic tracking-tighter ${colors[color]}`}>{value}</div>
    </div>
  );
}

export default Teams;
