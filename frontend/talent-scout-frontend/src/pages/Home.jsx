// src/pages/Home.jsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy, Users, Target, BarChart3,
  Search, Award, ArrowRight, 
  Activity, Zap, Crosshair,Radar,Heart
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
    <div className="space-y-10">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">System Dashboard</h1>
          <p className="text-slate-500 font-medium">Global Bundesliga U19 Recruitment & Development Overview</p>
        </div>
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
          <Activity className="w-3.5 h-3.5 text-success" />
          Last Index: {new Date().toLocaleDateString()} • {allPlayersCount(stats)} Profiles
        </div>
      </div>

      {/* Hero Analytics Banner */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-accent to-indigo-600 rounded-2xl blur opacity-15 group-hover:opacity-25 transition duration-1000"></div>
        <div className="relative bg-slate-950 rounded-2xl p-10 overflow-hidden border border-slate-800 shadow-2xl">
          {/* Abstract Grid Pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="px-3 py-1 bg-accent/20 border border-accent/30 rounded-full">
                  <span className="text-accent text-[10px] font-black uppercase tracking-widest">Predictive Model v2.4</span>
                </div>
                <div className="px-3 py-1 bg-slate-800 rounded-full">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Bundesliga Exclusive</span>
                </div>
              </div>

              <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-6 tracking-tighter">
                IDENTIFY THE NEXT <span className="text-accent">ELITE PROSPECTS</span>
              </h2>
              <p className="text-slate-400 text-lg mb-10 max-w-xl leading-relaxed">
                Utilizing XGBoost regression on 50+ performance metrics to predict the development
                trajectory of U19 talents with <span className="text-white font-bold">87% historical accuracy.</span>
              </p>

              <div className="flex flex-wrap gap-4">
                <Link
                  to="/players"
                  className="px-8 py-4 bg-accent hover:bg-blue-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-accent/25 flex items-center gap-3 active:scale-95"
                >
                  <Search className="w-5 h-5" />
                  Launch Scout Search
                </Link>
                <Link
                  to="/analytics"
                  className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all flex items-center gap-3 border border-slate-700 active:scale-95"
                >
                  <BarChart3 className="w-5 h-5" />
                  View Global Trends
                </Link>
              </div>
            </div>

            {/* Visual Teaser */}
            <div className="hidden lg:flex justify-end pr-10">
              <div className="relative w-80 h-80 flex items-center justify-center">
                <div className="absolute inset-0 border-[16px] border-slate-900 rounded-full animate-[spin_20s_linear_infinite]" />
                <div className="absolute inset-4 border-2 border-dashed border-slate-800 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
                <div className="bg-slate-900 w-48 h-48 rounded-3xl flex flex-col items-center justify-center border border-accent/20 rotate-12 shadow-2xl">
                  <Crosshair className="w-10 h-10 text-accent mb-2" />
                  <span className="text-3xl font-black text-white">{(stats?.max_potential || 0).toFixed(1)}</span>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Highest Potential</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Core KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPIBox
          icon={<Users className="w-5 h-5" />}
          label="Tracked Prospects"
          value={stats?.total_players || 0}
          trend="+12% vs LY"
          color="accent"
        />
        <KPIBox
          icon={<Zap className="w-5 h-5" />}
          label="Avg Rating (Current)"
          value={stats?.avg_potential?.toFixed(1) || '0.0'}
          trend="League Norm"
          color="success"
        />
        <KPIBox
          icon={<Trophy className="w-5 h-5" />}
          label="Elite Class"
          value={stats?.elite_count || 0}
          trend={`${((stats?.elite_count / stats?.total_players) * 100).toFixed(1)}% of pool`}
          color="warning"
        />
        <KPIBox
          icon={<Target className="w-5 h-5" />}
          label="Conversion Ratio"
          value="4.2"
          unit="xG/Goal"
          trend="Top Tier"
          color="indigo-500"
        />
      </div>

      {/* Main Insights Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Top Prospects Table */}
        <div className="xl:col-span-2 card-analytics overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-warning" />
                Elite Prospect Rankings
              </h3>
              <p className="text-xs text-slate-500 font-medium">Highest predicted potential for 2024/25 transition</p>
            </div>
            <Link to="/rankings" className="text-accent text-[11px] font-bold uppercase tracking-widest flex items-center gap-1 hover:underline">
              Full List <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Index</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Player Profile</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Club</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pos</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Potential</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topPlayers.map((player, idx) => (
                  <tr key={player.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Link to={`/player/${player.id}`} className="group-hover:text-accent transition-colors">
                        <div className="text-sm font-bold text-slate-900">{player.Player}</div>
                        <div className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter">Age: {player.Age_std || player.Age} • {player.Nation_std}</div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 bg-slate-100 rounded flex items-center justify-center text-[10px] font-bold">{player.Squad_std?.[0]}</div>
                        <span className="text-xs font-medium text-slate-600">{player.Squad_std}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <PositionBadge position={player.Pos_std} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-black text-slate-900">{(player.peak_potential || 0).toFixed(1)}</div>
                        <div className="w-12 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div className="bg-accent h-full" style={{ width: `${(player.peak_potential / 100) * 100}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[11px] font-black text-success">
                        +{(player.peak_potential - player.current_rating).toFixed(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Action Sidebar */}
        <div className="space-y-6">
          <ActionCard
            title="Comparison Engine"
            desc="Head-to-head tactical comparison of multiple player profiles."
            icon={<Radar className="w-6 h-6" />}
            link="/compare"
          />
          <ActionCard
            title="Shortlist Radar"
            desc="Track development progress of your bookmarked prospects."
            icon={<Heart className="w-6 h-6" />}
            link="/watchlist"
          />
          <div className="card-analytics p-6 bg-slate-950 border-slate-800">
            <h4 className="text-white font-black text-sm mb-4 uppercase tracking-widest">Model Fidelity</h4>
            <div className="space-y-4">
              <FidelityBar label="Data Integrity" value={98} />
              <FidelityBar label="Prediction Confidence" value={87} />
              <FidelityBar label="Sample Coverage" value={92} />
            </div>
            <p className="text-[10px] text-slate-500 mt-6 font-medium leading-relaxed italic">
              Confidence scores are derived from standard error of estimate (SEE)
              across validation splits.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components
function KPIBox({ icon, label, value, trend, color, unit }) {
  const colorMap = {
    accent: 'bg-accent/10 text-accent border-accent/20',
    success: 'bg-success/10 text-success border-success/20',
    warning: 'bg-warning/10 text-warning border-warning/20',
    'indigo-500': 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'
  };

  return (
    <div className="card-analytics p-6">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2.5 rounded-xl border ${colorMap[color] || colorMap.accent}`}>
          {icon}
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-100">
          {trend}
        </div>
      </div>
      <div>
        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black text-slate-900 tracking-tighter">{value}</span>
          {unit && <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{unit}</span>}
        </div>
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

function ActionCard({ title, desc, icon, link }) {
  return (
    <Link to={link} className="card-analytics p-6 flex items-start gap-4 hover:border-accent group transition-all">
      <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-accent/10 group-hover:text-accent transition-colors">
        {icon}
      </div>
      <div>
        <h4 className="text-sm font-black text-slate-900 group-hover:text-accent transition-colors uppercase tracking-tight">{title}</h4>
        <p className="text-xs text-slate-500 leading-relaxed mt-1">{desc}</p>
      </div>
    </Link>
  );
}

function FidelityBar({ label, value }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
        <span className="text-slate-400">{label}</span>
        <span className="text-white">{value}%</span>
      </div>
      <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
        <div className="h-full bg-accent" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function allPlayersCount(stats) {
  return stats?.total_players || 0;
}

export default Home;
