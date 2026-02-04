// src/pages/ScoutingReport.jsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Download, TrendingUp, TrendingDown, Users, Target, FileText,
  AlertCircle, CheckCircle, XCircle, Award, Calendar, Activity,
  ChevronRight, Zap, Shield, ExternalLink, ArrowUpDown
} from 'lucide-react';
import api from '../services/api';
import PlayerProgressionChart from '../components/PlayerProgressionChart';

function ScoutingReport() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { loadReport(); }, [id]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await api.getScoutingReport(id);
      setReport(response.data);
    } catch (err) { setError('Failed to retrieve intelligence report.'); }
    finally { setLoading(false); }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await api.exportScoutingReport(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `scout-report-${report?.player?.name || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) { alert('Export operation failed.'); }
    finally { setExporting(false); }
  };

  if (loading) return <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4"><div className="w-12 h-12 border-4 border-slate-200 border-t-accent rounded-full animate-spin" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Loading Report...</p></div>;
  if (error || !report) return <div className="text-center py-20"><AlertCircle className="w-16 h-16 text-slate-200 mx-auto mb-6" /><h2 className="text-xl font-black text-slate-900 mb-2">Player Not Found</h2><Link to={`/player/${id}`} className="text-accent text-[10px] font-black uppercase tracking-widest">Back to Profile</Link></div>;

  const { player, ratings, performance, growth, analysis, tier, recommendation, scout_notes, similar_players, season_change } = report;

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <Link to={`/player/${id}`} className="group flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
          <div className="p-2 rounded-lg bg-white border border-slate-200 group-hover:border-slate-300">
            <ArrowLeft className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest">Back to Profile</span>
        </Link>
        <div className="flex items-center gap-3">
          {report.progression?.length > 1 && (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={id}
                onChange={(e) => navigate(`/scouting-report/${e.target.value}`)}
                className="bg-transparent text-[10px] font-black uppercase tracking-widest text-slate-900 outline-none cursor-pointer"
              >
                {report.progression.sort((a, b) => b.Season.localeCompare(a.Season)).map(p => (
                  <option key={p.id} value={p.id}>
                    Report: {p.Season}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button onClick={handleExport} disabled={exporting} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all">
            {exporting ? <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent" /> : <Download className="w-4 h-4" />}
            Export Dossier (PDF)
          </button>
        </div>
      </div>

      {/* Cinematic Identity Header */}
      <div className="bg-slate-950 rounded-[2rem] p-8 lg:p-12 text-white relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-accent/10 to-transparent pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row justify-between gap-12">
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] border ${tier.color === 'gold' ? 'bg-warning/10 border-warning/20 text-warning' : 'bg-slate-800 border-slate-700 text-slate-300'}`}>
                {tier.name} Tier
              </span>
              <div className="h-4 w-[1px] bg-slate-800" />
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Scouting Feed</span>
              </div>
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl lg:text-6xl font-black tracking-tight leading-none italic uppercase">{player.name}</h1>
              <div className="flex flex-wrap items-center gap-6">
                <IdentityPill icon={Award} label={player.team} />
                <IdentityPill icon={Target} label={player.position} />
                <IdentityPill icon={Activity} label={player.age ? `${player.age} Years` : 'Age N/A'} />
                {player.seasons_count > 1 && (
                  <IdentityPill icon={Calendar} label={`${player.seasons_count} Seasons Tracked`} />
                )}
                {player.is_best_potential && (
                  <IdentityPill icon={Award} label="Best Performance Profile" />
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center bg-white/5 border border-white/10 rounded-[2rem] p-8 backdrop-blur-md min-w-[280px]">
            <div className="text-[10px] font-black text-accent uppercase tracking-[0.3em] mb-4">Potential Analysis</div>
            <div className="text-7xl lg:text-8xl font-black text-white leading-none tracking-tighter mb-4">{ratings.peak_potential.toFixed(1)}</div>
            <div className="grid grid-cols-2 gap-8 w-full border-t border-white/10 pt-6">
              <div className="text-center">
                <div className="text-sm font-black text-slate-400 italic">{(ratings.current || 0).toFixed(1)}</div>
                <div className="text-[8px] font-black uppercase text-slate-600 mt-1">Current</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-black text-success italic">{(ratings.next_season || 0).toFixed(1)}</div>
                <div className="text-[8px] font-black uppercase text-slate-600 mt-1">Projection</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Intelligence Feed */}
      <div className="grid lg:grid-cols-12 gap-6 text-left">
        {/* Main Analysis Column */}
        <div className="lg:col-span-8 space-y-6">
          {/* Partial Season Warning */}
          {player.current_season?.startsWith('2025') && (
            <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-6 flex items-start gap-4 shadow-sm">
              <div className="p-3 bg-amber-100 rounded-xl text-amber-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-900 uppercase tracking-tight">Data Quality Warning: Partial Cycle Active</h3>
                <p className="text-xs text-amber-700 font-medium mt-1 leading-relaxed">
                  The <span className="font-bold">{player.current_season}</span> season data is currently in progress.
                  Because match volume is lower than full historical cycles, the machine learning predictions may show increased volatility.
                  Switch to a previous season using the selector above for a verified, full-sample assessment.
                </p>
              </div>
            </div>
          )}

          {/* Tactical Trend Alert */}
          {season_change?.available && (
            <div className={`rounded-3xl p-8 border ${season_change.rating_change >= 0 ? 'bg-success/10 border-success/20 group' : 'bg-danger/10 border-danger/20'}`}>
              <div className="flex items-start gap-6">
                <div className={`p-4 rounded-2xl ${season_change.rating_change >= 0 ? 'bg-success text-white' : 'bg-danger text-white'}`}>
                  {season_change.rating_change >= 0 ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                </div>
                <div className="flex-1">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Performance Trend</h3>
                  <div className="text-xl font-black text-slate-900 mb-6 italic uppercase tracking-tight">{season_change.trend_label}</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <TrendMetric label="Rating Delta" value={`${season_change.rating_change > 0 ? '+' : ''}${season_change.rating_change.toFixed(1)}`} />
                    <TrendMetric label="Total Matches" value={`${season_change.matches_change > 0 ? '+' : ''}${season_change.matches_change}`} />
                    <TrendMetric label="Goals Change" value={`${season_change.goals_change > 0 ? '+' : ''}${season_change.goals_change} GLS`} />
                    <TrendMetric label="Efficiency" value={`${season_change.goals_per_match_change.toFixed(2)}`} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Scout Recommendation */}
          <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden group">
            <Zap className="absolute -top-10 -right-10 w-40 h-40 text-accent opacity-5 group-hover:opacity-10 transition-opacity" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <Target className="w-5 h-5 text-accent" />
                <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Scout Pro Recommendation</h2>
              </div>
              <p className="text-2xl font-black italic uppercase leading-tight tracking-tight mb-4">{recommendation}</p>
              <p className="text-slate-400 text-sm leading-relaxed italic">"{scout_notes}"</p>
            </div>
          </div>

          {/* Strengths / Weaknesses / Focus */}
          <div className="grid md:grid-cols-3 gap-6">
            <AnalysisList title="Technical Strengths" icon={CheckCircle} items={analysis.strengths} color="text-success" bg="bg-success/5" border="border-success/10" dot="✓" />
            <AnalysisList title="Critical Concerns" icon={XCircle} items={analysis.weaknesses} color="text-danger" bg="bg-danger/5" border="border-danger/10" dot="✗" />
            <AnalysisList title="Development Focus" icon={Zap} items={analysis.development_areas} color="text-accent" bg="bg-accent/5" border="border-accent/10" dot="→" />
          </div>

          {/* Multi-Season Progression Graph */}
          {report.progression?.length > 1 && (
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-900 italic uppercase">Performance History</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Growth Tracking Across All Seasons</p>
                </div>
                <div className="bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Season Archive</span>
                </div>
              </div>
              <div className="h-[300px]">
                <PlayerProgressionChart progression={report.progression} compact={true} />
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Data Column */}
        <div className="lg:col-span-4 space-y-6">
          <DataBlock title="Growth Velocity" icon={TrendingUp}>
            <div className="space-y-4">
              <DataRow label="Current Status" value={growth.growth_rate} highlight />
              <DataRow label="Quarterly Proj." value={`+${growth.short_term.toFixed(1)}`} />
              <DataRow label="Career Proj." value={`+${growth.long_term.toFixed(1)}`} />
            </div>
          </DataBlock>

          <DataBlock title="Session Stats" icon={Award}>
            <div className="space-y-4">
              <DataRow label="Season Matches" value={performance.matches} />
              <DataRow label="Season Goals" value={`${performance.goals}`} />
              <DataRow label="Goals per 90" value={performance.goals_per_match.toFixed(2)} highlight />
            </div>
          </DataBlock>

          {report.progression?.length > 1 && (
            <DataBlock title="Career Totals" icon={Activity}>
              <div className="space-y-4">
                <DataRow label="Total Career Matches" value={performance.total_matches} highlight />
                <DataRow label="Total Career Goals" value={performance.total_goals} highlight />
                <DataRow label="Avg Potential" value={(report.progression.reduce((acc, p) => acc + (p.peak_potential || 0), 0) / report.progression.length).toFixed(1)} />
              </div>
            </DataBlock>
          )}

          {/* Similar Profiles */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-4 h-4 text-slate-400" />
              <h3 className="text-[10px] font-black uppercase tracking-widest"> Similar Players</h3>
            </div>
            <div className="space-y-4">
              {similar_players.slice(0, 4).map(p => (
                <Link key={p.id} to={`/player/${p.id}`} className="group flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                  <div>
                    <div className="text-xs font-black text-slate-900 leading-none">{p.name}</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase mt-1">{p.team}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-accent">{p.similarity_score.toFixed(0)}%</div>
                    <div className="text-[8px] font-black text-slate-400 uppercase">Match</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components
function IdentityPill({ icon: Icon, label }) {
  return (
    <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md border border-white/10">
      <Icon className="w-3.5 h-3.5 text-accent" />
      <span className="text-[10px] font-black uppercase tracking-widest leading-none">{label}</span>
    </div>
  );
}

function TrendMetric({ label, value }) {
  return (
    <div className="p-3 bg-white/50 rounded-xl">
      <div className="text-[8px] font-black text-slate-500 uppercase mb-1">{label}</div>
      <div className="text-lg font-black text-slate-900 italic tracking-tighter">{value}</div>
    </div>
  );
}

function AnalysisList({ title, icon: Icon, items, color, bg, border, dot }) {
  return (
    <div className={`rounded-2xl border ${bg} ${border} p-6 h-full`}>
      <div className="flex items-center gap-3 mb-4">
        <Icon className={`w-4 h-4 ${color}`} />
        <h3 className={`text-[10px] font-black uppercase tracking-widest ${color}`}>{title}</h3>
      </div>
      <ul className="space-y-3">
        {items.map((it, idx) => (
          <li key={idx} className="flex gap-2 text-[11px] font-bold text-slate-600 leading-snug">
            <span className={color}>{dot}</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DataBlock({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <Icon className="w-4 h-4 text-slate-400" />
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function DataRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <span className={`text-sm font-black italic ${highlight ? 'text-accent' : 'text-slate-900'}`}>{value}</span>
    </div>
  );
}

export default ScoutingReport;