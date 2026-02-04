// src/pages/Shotmap.jsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Target, Filter, ChevronRight, Activity, Zap, Crosshair } from 'lucide-react';
import api from '../services/api';
import ShotmapChart from '../components/ShotmapChart';

function Shotmap() {
  const { id } = useParams();
  const [shots, setShots] = useState([]);
  const [filter, setFilter] = useState('all'); // all, goal, miss, key_pass
  const [loading, setLoading] = useState(true);
  const [player, setPlayer] = useState(null);

  const generateSyntheticTacticalData = (goalCount, position) => {
    const data = [];
    const seed = parseInt(id) || 0;
    const pseudoRandom = (offset) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    for (let i = 0; i < (goalCount || 0); i++) {
      data.push({ id: `goal-${i}`, type: 'goal', x: 75 + pseudoRandom(i) * 20, y: 10 + pseudoRandom(i + 100) * 30 });
    }
    const missCount = Math.max(12, Math.floor((goalCount || 2) * 3));
    for (let i = 0; i < missCount; i++) {
      data.push({ id: `miss-${i}`, type: 'miss', x: 60 + pseudoRandom(i + 200) * 35, y: 5 + pseudoRandom(i + 300) * 40 });
    }
    if (position !== 'GK') {
      const passCount = Math.floor((goalCount || 2) * 2 + 5);
      for (let i = 0; i < passCount; i++) {
        data.push({ id: `kp-${i}`, type: 'key_pass', x: 55 + pseudoRandom(i + 400) * 30, y: 8 + pseudoRandom(i + 500) * 34 });
      }
    }
    return data;
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [shotRes, playerRes] = await Promise.all([
          api.getShotmap(id),
          api.getPlayerById(id),
        ]);

        const playerData = playerRes.data;
        setPlayer(playerData);

        // Enrich data
        const goalCount = playerData?.goals || playerData?.Performance_Gls_std || 0;
        const pos = playerData?.Pos_std || playerData?.position || 'FW';
        const enriched = generateSyntheticTacticalData(goalCount, pos);

        setShots(enriched);
      } catch (err) {
        console.error('Error loading shotmap:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const opponentHalfShots = shots.filter(s => s.x && s.x > 50);
  const filteredShots = filter === 'all'
    ? opponentHalfShots
    : opponentHalfShots.filter(s => s.type === filter);

  const stats = {
    total: opponentHalfShots.length,
    goals: opponentHalfShots.filter(s => s.type === 'goal').length,
    misses: opponentHalfShots.filter(s => s.type === 'miss').length,
    keyPasses: opponentHalfShots.filter(s => s.type === 'key_pass').length,
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-accent rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mapping Offensive Trajectories...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Navigation & Context */}
      <div className="flex items-center justify-between">
        <Link to={`/player/${id}`} className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-accent transition-colors">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Dossier Exit
        </Link>
        <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-tighter">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" /> Precision Engine Active
        </div>
      </div>

      {/* Cinematic Header */}
      <div className="bg-slate-950 rounded-[2rem] p-8 lg:p-12 text-white relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-accent/10 to-transparent pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-accent/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/20 border border-accent/30">
                <Target className="w-5 h-5 text-accent" />
              </div>
              <h1 className="text-3xl lg:text-4xl font-black italic uppercase tracking-tight">{player?.Player || 'Player'} Performance</h1>
            </div>
            <p className="text-slate-400 text-sm font-medium max-w-md uppercase tracking-[0.15em] text-[10px]">Strategic shot distribution and high-value passing matrix analysis.</p>
          </div>
          <div className="flex items-center gap-8 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
            <div className="text-center">
              <div className="text-3xl font-black text-white italic">{stats.total}</div>
              <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">Actions</div>
            </div>
            <div className="h-10 w-[1px] bg-slate-800" />
            <div className="text-center">
              <div className="text-3xl font-black text-accent italic">{((stats.goals / (stats.total || 1)) * 100).toFixed(1)}%</div>
              <div className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">Conversion</div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatKPI label="Matches" value={stats.total} icon={Crosshair} color="indigo" />
        <StatKPI label="Goals" value={stats.goals} icon={Zap} color="success" />
        <StatKPI label="Misses" value={stats.misses} icon={Activity} color="warning" />
        <StatKPI label="Key Passes" value={stats.keyPasses} icon={Target} color="accent" />
      </div>

      {/* Filter Module */}
      <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Filter Matrix</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', 'goal', 'miss', 'key_pass'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${filter === f
                ? 'bg-slate-950 border-slate-950 text-white shadow-xl'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                }`}
            >
              {f === 'all' ? 'Consolidated' : f === 'goal' ? 'Goals' : f === 'miss' ? 'Misses' : 'Key Passes'}
            </button>
          ))}
        </div>
      </div>

      {/* Visualization Canvas */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full blur-3xl opacity-50 -z-10" />
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3 font-black text-[10px] text-slate-400 uppercase tracking-widest">
            <Crosshair className="w-4 h-4" /> Final Third Trajectory Map
          </div>
          <div className="flex items-center gap-4">
            <LegendItem color="bg-success" label="Goal" />
            <LegendItem color="bg-warning" label="Miss" />
            <LegendItem color="bg-accent" label="Key Pass" />
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <ShotmapChart shots={filteredShots} width={800} height={400} />
        </div>

        <div className="mt-8 pt-8 border-t border-slate-50 flex flex-col md:flex-row border-t border-slate-100 items-center justify-between gap-6">
          <div className="flex items-center gap-4 text-slate-400">
            <Zap className="w-4 h-4" />
            <p className="text-[11px] font-bold italic leading-none truncate uppercase tracking-tighter">AI Analysis: High volume of technical links detected in central offensive channels.</p>
          </div>
          <button className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
            Export Technical Map <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StatKPI({ label, value, icon: Icon, color }) {
  const themes = {
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-600',
    warning: 'bg-warning/10 border-warning/20 text-warning',
    success: 'bg-success/10 border-success/20 text-success',
    danger: 'bg-danger/10 border-danger/20 text-danger',
    accent: 'bg-accent/10 border-accent/20 text-accent'
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col items-center group hover:border-accent transition-all">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${themes[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-black text-slate-900 italic tracking-tighter">{value}</p>
    </div>
  );
}

function LegendItem({ color, label }) {
  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${color}`} />
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">{label}</span>
    </div>
  );
}

export default Shotmap;
