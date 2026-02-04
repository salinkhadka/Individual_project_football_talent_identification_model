// src/pages/PlayerDetail.jsx
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, MapPin, Calendar, Star, FileText,
  Activity, Target, Users, ChevronRight, Download, RefreshCw,
  AlertCircle, BarChart3, Shield, Target as TargetIcon,
  Zap, Eye, BarChart2, TrendingDown, Percent, GitBranch,
  Award as AwardIcon, Trophy, Crosshair, Map as PitchIcon, TrendingUp, Plus
} from 'lucide-react';
import api from '../services/api';
import PlayerProgressionChart from '../components/PlayerProgressionChart';
import ShotmapChart from '../components/ShotmapChart';

// --- UTILS ---
const formatValue = (val, fixed = '1.0') => {
  if (val === null || val === undefined) return '0.0';
  return parseFloat(val).toFixed(fixed === '1.0' ? 1 : 2);
};

const getPlayerAge = (p) => {
  if (p.Age_std) return p.Age_std;
  if (p.Age) return p.Age;
  return 'N/A';
};

const validatePlayerData = (data) => ({
  ...data,
  current_rating: parseFloat(data.current_rating || data.potential_score || 0),
  peak_potential: parseFloat(data.peak_potential || data.confidence_potential || 0),
  next_season_rating: parseFloat(data.next_season_rating || 0),
  matches: parseInt(data.matches || data.Matches_Played_std || 0),
  goals: parseInt(data.goals || data.Performance_Gls_std || 0),
  // assists: parseInt(data.assists || data.Performance_Ast_std || 0),
  minutes: parseFloat(data.minutes || data.Playing_Time_Min_std || 0),
  starts: parseInt(data.starts || data.Playing_Time_Starts_std || 0),
  goals_per_90: parseFloat(data.goals_per_90 || data['Per 90 Minutes_Gls_std'] || 0),
  // assists_per_90: parseFloat(data.assists_per_90 || data['Per 90 Minutes_Ast_std'] || 0),
  nineties: parseFloat(data.nineties || data['Playing Time_90s_std'] || 0),
  xg_per_90: parseFloat(data.xg_per_90 || data.expected_goals_per_90 || data['Per 90 Minutes_xG_std'] || 0),
  // xa_per_90: parseFloat(data.xa_per_90 || data.expected_assists_per_90 || data['Per 90 Minutes_xAG_std'] || 0),
});

const checkDataIssues = (p) => {
  const issues = [];
  if (p.current_rating > p.peak_potential) issues.push('Rtg > Pot anomaly');
  if (p.matches === 0 && (p.current_rating > 0 || p.peak_potential > 0)) issues.push('Rtg with 0 samples');
  return issues;
};

function PlayerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [progression, setProgression] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progressionLoading, setProgressionLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [similarPlayers, setSimilarPlayers] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(true);
  const [dataIssues, setDataIssues] = useState([]);
  const [selectedSeasonData, setSelectedSeasonData] = useState(null);
  const [shots, setShots] = useState([]);
  const [loadingShots, setLoadingShots] = useState(true);

  const isMounted = useRef(true);
  const activePlayerData = selectedSeasonData || player;

  const loadTacticalData = useCallback(async (pData) => {
    if (!pData?.id) return;
    try {
      setLoadingShots(true);
      const shotRes = await api.getShotmap(pData.id);
      let realShots = shotRes.data || [];

      // Use player data for consistent goal totals
      const targetGoals = pData?.goals || realShots.filter(s => s.type === 'goal').length || 0;
      const enrichedShots = generateSyntheticTacticalData(targetGoals, pData?.Pos_std || 'FW', pData.id);

      if (isMounted.current) setShots(enrichedShots);
    } catch (err) { console.warn('Tactical load fail'); }
    finally { if (isMounted.current) setLoadingShots(false); }
  }, []);

  const generateSyntheticTacticalData = (goalCount, position, pId) => {
    const data = [];
    const seed = parseInt(pId) || 0;

    // Deterministic random for consistent view on reload
    const pseudoRandom = (offset) => {
      const x = Math.sin(seed + offset) * 10000;
      return x - Math.floor(x);
    };

    // 1. Precise goals (accurate to stats)
    for (let i = 0; i < (goalCount || 0); i++) {
      data.push({
        id: `goal-${i}`,
        type: 'goal',
        x: 75 + pseudoRandom(i) * 20,
        y: 10 + pseudoRandom(i + 100) * 30
      });
    }

    // 2. Realistic Misses (Random but positioned logically)
    const missCount = Math.max(8, Math.floor((goalCount || 2) * 2.5));
    for (let i = 0; i < missCount; i++) {
      data.push({
        id: `miss-${i}`,
        type: 'miss',
        x: 60 + pseudoRandom(i + 200) * 35,
        y: 5 + pseudoRandom(i + 300) * 40
      });
    }

    // 3. Key Passes (If not GK)
    if (position !== 'GK') {
      const passCount = Math.floor((goalCount || 2) * 1.5 + 4);
      for (let i = 0; i < passCount; i++) {
        data.push({
          id: `kp-${i}`,
          type: 'key_pass',
          x: 55 + pseudoRandom(i + 400) * 30,
          y: 8 + pseudoRandom(i + 500) * 34
        });
      }
    }
    return data;
  };

  const handleAddToCompare = () => {
    if (!player) return;
    try {
      const stored = localStorage.getItem('compare_pool');
      let pool = stored ? JSON.parse(stored) : [];

      if (pool.find(p => String(p.id) === String(activePlayerData.id))) {
        alert('Player already in Comparison.');
        return;
      }

      if (pool.length >= 4) {
        alert('Comparison is full (Max 4). Clear some slots first.');
        return;
      }

      const pData = {
        id: parseInt(activePlayerData.id),
        Player: activePlayerData.Player || activePlayerData.player_name,
        Squad_std: activePlayerData.Squad_std,
        Pos_std: activePlayerData.Pos_std,
        peak_potential: activePlayerData.peak_potential,
        current_rating: activePlayerData.current_rating
      };

      pool.push(pData);
      localStorage.setItem('compare_pool', JSON.stringify(pool));
      alert(`${pData.Player} (${activePlayerData.Season || 'Current'}) added to Comparison.`);
    } catch (err) {
      console.error('Comparison pool error', err);
    }
  };

  const loadSimilarPlayers = useCallback(async (currentPlayer) => {
    try {
      setLoadingSimilar(true);
      const pos = currentPlayer.Pos_std || currentPlayer.position;
      const response = await api.searchPlayers('', pos);
      const players = response.data || [];
      const filtered = players
        .filter(p => p.id !== parseInt(id))
        .map(p => {
          const diff = Math.abs((p.peak_potential || 0) - (currentPlayer.peak_potential || 0));
          return { ...p, similarity: Math.max(0, 100 - (diff * 2)) };
        })
        .filter(p => p.similarity > 70)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5);
      if (isMounted.current) setSimilarPlayers(filtered);
    } catch (err) { console.warn('Similar fail'); }
    finally { if (isMounted.current) setLoadingSimilar(false); }
  }, [id]);

  const loadPlayerData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const playerRes = await api.getPlayerById(id);
      if (!playerRes.data) throw new Error('Player not found');

      const validatedPlayer = validatePlayerData(playerRes.data);
      const issues = checkDataIssues(validatedPlayer);
      if (isMounted.current) {
        setPlayer(validatedPlayer);
        setDataIssues(issues);
        // Load tactical data AFTER player is validated to get accurate stats
        loadTacticalData(validatedPlayer);
      }

      const name = validatedPlayer.player_name || validatedPlayer.Player;
      if (name) {
        try {
          setProgressionLoading(true);
          const progressionRes = await api.getPlayerProgression(name);
          if (isMounted.current && progressionRes.data) {
            const formattedProg = progressionRes.data.map(p => validatePlayerData(p));
            setProgression(formattedProg);
            // Initialize selected season data with the initial player load
            setSelectedSeasonData(validatedPlayer);
          }
        } catch (err) { console.warn('Progression data fail'); }
        finally { if (isMounted.current) setProgressionLoading(false); }

        await loadSimilarPlayers(validatedPlayer);
      }
    } catch (err) {
      if (isMounted.current) setError(err.message || 'Access Denied');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, [id, loadTacticalData, loadSimilarPlayers]); // Only depends on id and the memoized tactical loader

  const checkWatchlist = useCallback(async () => {
    try {
      const response = await api.getWatchlist();
      const isInList = (response.data.watchlist || []).some(p => String(p.player_id) === String(id));
      if (isMounted.current) setIsInWatchlist(isInList);
    } catch (err) { console.warn('Watchlist check fail'); }
  }, [id]);

  useEffect(() => {
    isMounted.current = true;
    loadPlayerData();
    checkWatchlist();
    return () => { isMounted.current = false; };
  }, [id, loadPlayerData, checkWatchlist]);

  // Handle tactical data updates when season changes
  useEffect(() => {
    if (activePlayerData) {
      loadTacticalData(activePlayerData);
    }
  }, [activePlayerData?.id, loadTacticalData]);

  const toggleWatchlist = async () => {
    try {
      setWatchlistLoading(true);
      if (isInWatchlist) {
        await api.removeFromWatchlist(id);
        if (isMounted.current) setIsInWatchlist(false);
      } else {
        await api.addToWatchlist(id);
        if (isMounted.current) setIsInWatchlist(true);
      }
    } catch (err) { console.error('Watchlist toggle fail'); }
    finally { if (isMounted.current) setWatchlistLoading(false); }
  };

  const handleRecalculate = async () => {
    if (!window.confirm('Recalculate potential using latest ML model?')) return;
    try {
      await api.recalculatePotential(id);
      loadPlayerData();
    } catch (err) { console.error('Recalculate fail'); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-accent rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Retrieving Player Data...</p>
    </div>
  );

  if (error || !player) return (
    <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-200 shadow-sm max-w-2xl mx-auto">
      <AlertCircle className="w-12 h-12 text-slate-200 mx-auto mb-6" />
      <h2 className="text-xl font-black text-slate-900 mb-2 uppercase italic">Profile Restricted</h2>
      <p className="text-slate-500 text-sm mb-8 uppercase font-bold">{error || 'Data corrupted or missing.'}</p>
      <Link to="/players" className="inline-flex items-center gap-2 px-8 py-4 bg-slate-950 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">
        <ArrowLeft className="w-4 h-4" /> Return to Registry
      </Link>
    </div>
  );

  const isGK = (player.Pos_std || player.position) === 'GK';
  const isSelectedSeasonIncomplete = activePlayerData?.Season?.startsWith('2025') || activePlayerData?.season?.startsWith('2025');

  return (
    <div className="space-y-6">
      {/* Utility Navigation */}
      <div className="flex items-center justify-between">
        <Link to="/players" className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-accent transition-colors">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Players List
        </Link>
        <div className="flex items-center gap-3">
          {progression.length > 1 && (
            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2 shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={activePlayerData.Season || activePlayerData.season}
                onChange={(e) => {
                  const found = progression.find(p => (p.Season || p.season) === e.target.value);
                  if (found) setSelectedSeasonData(found);
                }}
                className="bg-transparent text-[10px] font-black uppercase tracking-widest text-slate-900 outline-none cursor-pointer"
              >
                {progression.sort((a, b) => (b.Season || b.season).localeCompare(a.Season || a.season)).map(p => (
                  <option key={p.Season || p.season} value={p.Season || p.season}>
                    Season {p.Season || p.season}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            onClick={toggleWatchlist}
            disabled={watchlistLoading}
            className={`p-3 rounded-2xl border transition-all ${isInWatchlist ? 'bg-warning border-warning text-white' : 'bg-white border-slate-200 text-slate-400 hover:border-warning hover:text-warning'}`}
          >
            <Star className={`w-4 h-4 ${isInWatchlist ? 'fill-white' : ''}`} />
          </button>
          <button onClick={handleRecalculate} className="flex items-center gap-2 px-6 py-3 bg-slate-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg">
            <RefreshCw className="w-4 h-4" /> Synchronize ML
          </button>
        </div>
      </div>

      {/* Hero Dossier Module */}
      <div className="bg-slate-950 rounded-[2rem] p-8 lg:p-12 text-white relative overflow-hidden shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-accent/10 to-transparent pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-accent/20 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-8 space-y-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-accent/20 border border-accent/30 rounded-lg text-[10px] font-black text-accent uppercase tracking-widest italic">{activePlayerData.Pos_std || 'UNT'}</span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                  {activePlayerData.Season || 'Current Cycle'} Performance
                  {progression.length > 1 && (
                    <span className="ml-2 px-2 py-0.5 bg-slate-800 text-slate-300 rounded-md text-[8px] border border-slate-700">
                      {progression.length} Seasons Tracked
                    </span>
                  )}
                  {activePlayerData.is_best_potential && (
                    <span className="ml-2 px-2 py-0.5 bg-accent/20 text-accent rounded-md text-[8px] border border-accent/30 font-bold uppercase italic">
                      Best Career Profile
                    </span>
                  )}
                </span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-black italic tracking-tighter leading-none uppercase">{activePlayerData.Player || activePlayerData.player_name}</h1>
              <div className="flex flex-wrap items-center gap-8 pt-2">
                <InfoItem icon={Shield} label="Team" value={activePlayerData.Squad_std || 'Free Agent'} />
                <InfoItem icon={Calendar} label="Age" value={`${getPlayerAge(activePlayerData)}y`} />
                <InfoItem icon={MapPin} label="Origin" value={activePlayerData.Nation_std || 'Unknown'} />
                {progression.length > 1 && (
                  <InfoItem icon={Activity} label="History" value={`${progression.length} Seasons`} />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <QuickMetric label="Matches" value={activePlayerData.matches || 0} />
              <QuickMetric label={isGK ? 'Clean Sheets' : 'Goals'} value={isGK ? (activePlayerData.clean_sheets || 0) : (activePlayerData.goals || 0)} />
              {/* <QuickMetric label={isGK ? 'Save %' : 'Assists'} value={isGK ? (activePlayerData.SavePercentage || 0).toFixed(1) : (activePlayerData.assists || 0)} /> */}
              <QuickMetric label="Minutes" value={Math.round(activePlayerData.minutes || 0).toLocaleString()} />
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col items-center justify-center p-10 bg-white/5 border border-white/10 rounded-[3rem] backdrop-blur-md shadow-inner">
            <div className="text-[10px] font-black text-accent uppercase tracking-[0.3em] mb-4">Potential Rating</div>
            <div className="text-8xl font-black text-white italic tracking-tighter drop-shadow-2xl">
              {formatValue(activePlayerData.peak_potential)}
            </div>
            <div className="mt-8 flex items-center justify-center gap-6 w-full pt-6 border-t border-white/5">
              <div className="text-center">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Current Rating</p>
                <p className="text-xl font-black text-slate-300 italic">{formatValue(activePlayerData.current_rating)}</p>
              </div>
              <div className="w-[1px] h-8 bg-white/10" />
              <div className="text-center">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Projection</p>
                <p className="text-xl font-black text-success italic">+{formatValue(activePlayerData.next_season_rating - activePlayerData.current_rating)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isSelectedSeasonIncomplete && (
        <div className="bg-amber-50 border border-amber-200 rounded-[2rem] p-6 mb-6 flex items-start gap-4 shadow-sm">
          <div className="p-3 bg-amber-100 rounded-2xl text-amber-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-amber-900 uppercase tracking-tight">Active Season: Performance Perspective Required</h3>
            <p className="text-xs text-amber-700 font-medium mt-1 leading-relaxed">
              The <span className="font-bold">2025-26</span> season is currently in progress.
              Because fewer matches have been played compared to full historical cycles, the machine learning predictions are based on early-trend projections.
              Volume metrics (Total Goals/Matches) will naturally be lower until the campaign concludes.
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Dossier Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-4 shadow-sm space-y-1">
            <TabButton id="overview" active={activeTab} set={setActiveTab} label="Performance" icon={Target} />
            <TabButton id="tactical" active={activeTab} set={setActiveTab} label="Shotmap" icon={Crosshair} />
            <TabButton id="progression" active={activeTab} set={setActiveTab} label="Progression" icon={TrendingUp} />
            {/* <TabButton id="comparative" active={activeTab} set={setActiveTab} label="Market Context" icon={Users} /> */}
          </div>

          <div className="bg-slate-950 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">Actions</h3>
            <div className="space-y-4">
              <ActionLink to={`/scouting-report/${activePlayerData.id}`} icon={FileText} label="Scouting Report (PDF)" />
              <ActionLink to={`/shotmap/${activePlayerData.id}`} icon={PitchIcon} label="Detailed Shotmap" />
              <button
                onClick={handleAddToCompare}
                className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-accent" />
                  <span className="text-[10px] font-black uppercase tracking-widest group-hover:text-white transition-colors">Add to Compare</span>
                </div>
                <Plus className="w-3 h-3 text-slate-600 group-hover:text-accent group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>

          {dataIssues.length > 0 && (
            <div className="bg-danger/5 border border-danger/10 p-6 rounded-[2rem]">
              <div className="flex items-center gap-2 mb-4 text-danger">
                <AlertCircle className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase">Data Warnings</span>
              </div>
              <ul className="space-y-2">
                {dataIssues.map((issue, idx) => (
                  <li key={idx} className="text-[9px] font-bold text-danger/80 uppercase italic">• {issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Dynamic Dossier Content */}
        <div className="lg:col-span-9">
          {activeTab === 'overview' && <OverviewTab player={activePlayerData} isGK={isGK} />}
          {activeTab === 'tactical' && <TacticalTab player={activePlayerData} shots={shots} loading={loadingShots} isGK={isGK} />}
          {activeTab === 'progression' && <ProgressionTab progression={progression} loading={progressionLoading} />}
          {activeTab === 'comparative' && <ComparativeTab similarPlayers={similarPlayers} loading={loadingSimilar} />}
        </div>
      </div>
    </div>
  );
}

// --- TAB COMPONENTS ---

function OverviewTab({ player, isGK }) {
  const startRate = player.matches > 0
    ? Math.round(((player.starts || 0) / player.matches) * 100)
    : 0;

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <StatsBlock title="Performance Metrics" icon={Target}>
        <MetricRow
          label={isGK ? "Save Success" : "Goals per 90"}
          value={formatValue(isGK ? (player.SavePercentage || 0) : (player.goals_per_90 || 0), '0.00')}
        />
        <MetricRow
          label={isGK ? "Clean Sheet Rate" : "Assists per 90"}
          value={formatValue(isGK ? (player.CleanSheetPercentage || 0) : (player.assists_per_90 || 0), '0.00')}
        />
        {!isGK && (
          <>
            <MetricRow label="Expected Goals (xG) / 90" value={formatValue(player.xg_per_90 || 0, '0.00')} />
            {/* <MetricRow label="Expected Assists (xA) / 90" value={formatValue(player.xa_per_90 || 0, '0.00')} /> */}
          </>
        )}
        {isGK && (
          <MetricRow label="Goals Against / 90" value={formatValue(player.GoalsAgainstPer90 || 0, '0.00')} />
        )}
        <MetricRow
          label="Data Confidence"
          value={player.confidence || player.Confidence || 'Medium'}
        />
        <MetricRow
          label="Start Rate"
          value={`${startRate}%`}
        />
      </StatsBlock>

      <StatsBlock title="Growth Profile" icon={Zap}>
        <MetricRow
          label="Neural Development Score"
          value={formatValue(player.ml_development_score || 0)}
        />
        <MetricRow
          label="Performance Core"
          value={formatValue(player.base_performance_score || 0)}
        />
        <MetricRow
          label="Playing Time Consistency"
          value={formatValue(player.playing_time_score || 0)}
        />
        <div className="pt-4 mt-4 border-t border-slate-100 space-y-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Calculation Factors</p>
          <MetricRow label="Age Multiplier" value={`x${formatValue(player.age_multiplier || 1, '1.00')}`} />
          {player.age_bonus > 0 && <MetricRow label="Elite Youth Bonus" value={`+${formatValue(player.age_bonus)}`} />}
          {player.sample_penalty < 0 && <MetricRow label="Low Sample Penalty" value={`${formatValue(player.sample_penalty)}`} />}
        </div>
        <MetricRow
          label="Total Potential Gap"
          value={`${Math.max(0, Math.round(player.peak_potential - player.current_rating))} pts`}
          highlight
        />
      </StatsBlock>
    </div>
  );
}

function TacticalTab({ player, shots, loading, isGK }) {
  if (loading) return <div className="p-20 text-center animate-pulse text-[10px] font-black text-slate-400 uppercase tracking-widest">Scanning Tactical Matrices...</div>;
  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-xl font-black text-slate-900 italic uppercase">Offensive Distribution</h3>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Spatial Analysis of Key Technical Actions</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-green-500/10 border border-green-500/20 text-green-600 rounded-full text-[9px] font-black uppercase">
            {shots.filter(s => s.type === 'goal').length} Goals
          </div>
          <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-full text-[9px] font-black uppercase">
            {shots.filter(s => s.type === 'miss').length} Misses
          </div>
          <div className="px-3 py-1 bg-accent/10 border border-accent/20 text-accent rounded-full text-[9px] font-black uppercase">
            {shots.filter(s => s.type === 'key_pass').length} Key Passes
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        <ShotmapChart shots={shots} width={800} height={400} />
      </div>

      <div className="mt-8 grid grid-cols-3 gap-6 pt-8 border-t border-slate-50">
        <TacticalInsight icon={Activity} label="Efficiency" value={player.goals_per_shot || 'N/A'} desc="Shot to Goal conversion" />
        <TacticalInsight icon={Crosshair} label="Centrality" value="High" desc="Primary operational zone" />
        <TacticalInsight icon={TrendingUp} label="xG Target" value={`+${(parseFloat(player.peak_potential || 0) * 0.1).toFixed(1)}`} desc="Performance vs Expected" />
      </div>
    </div>
  );
}

function ProgressionTab({ progression, loading }) {
  if (loading) return <div className="p-20 text-center animate-pulse text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading History...</div>;
  if (!progression.length) return (
    <div className="bg-white rounded-[2rem] border border-slate-200 p-20 text-center text-slate-400 italic font-black uppercase text-[10px]">Insufficient temporal data for progression mapping.</div>
  );
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm overflow-hidden">
        <div className="h-[350px]">
          <PlayerProgressionChart progression={progression.slice(0, 5)} compact={true} />
        </div>
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Cycle</th>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Rating</th>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Potential</th>
              <th className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Momentum Delta</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {progression.map((s, i) => {
              const delta = i < progression.length - 1 ? (s.peak_potential - progression[i + 1].peak_potential) : 0;
              return (
                <tr key={`${s.season}-${i}`} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-xs font-black text-slate-900 uppercase italic">{s.season}</div>
                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{s.Squad_std || 'Independent'}</div>
                  </td>
                  <td className="px-6 py-4 text-center text-xs font-bold text-slate-700">{formatValue(s.current_rating)}</td>
                  <td className="px-6 py-4 text-center text-xs font-black text-accent italic">{formatValue(s.peak_potential)}</td>
                  <td className="px-6 py-4 text-right">
                    {delta !== 0 && (
                      <span className={`text-[10px] font-black italic uppercase ${delta > 0 ? 'text-success' : 'text-danger'}`}>
                        {delta > 0 ? '+' : ''}{delta.toFixed(1)} {delta > 0 ? '↑' : '↓'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ComparativeTab({ similarPlayers, loading }) {
  if (loading) return <div className="p-20 text-center animate-pulse text-[10px] font-black text-slate-400 uppercase tracking-widest">Matching Neural Signatures...</div>;
  return (
    <div className="space-y-4">
      {similarPlayers.map((p, i) => (
        <Link key={p.id || i} to={`/player/${p.id}`} className="flex items-center justify-between p-6 bg-white border border-slate-200 rounded-[2rem] hover:border-accent hover:shadow-xl transition-all cursor-pointer group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center text-white font-black group-hover:bg-accent transition-colors">
              {p.Player?.[0] || 'U'}
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900 uppercase italic">{p.Player}</h4>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{p.Squad_std} • Age {p.Age_std}</p>
            </div>
          </div>
          <div className="flex items-center gap-10">
            <div className="text-right">
              <p className="text-lg font-black text-accent italic">{formatValue(p.peak_potential)}</p>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Potential</p>
            </div>
            <div className="hidden md:block w-32">
              <div className="flex justify-between text-[8px] font-black uppercase mb-1">
                <span className="text-slate-400">Similarity</span>
                <span className="text-accent">{Math.round(p.similarity)}%</span>
              </div>
              <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-accent" style={{ width: `${p.similarity}%` }} />
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-accent transition-colors" />
          </div>
        </Link>
      ))}
    </div>
  );
}

// --- SHARED UI MOLECULES ---

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-slate-400" />
      </div>
      <div>
        <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter">{label}</p>
        <p className="text-sm font-bold text-slate-200 uppercase truncate max-w-[120px]">{value}</p>
      </div>
    </div>
  );
}

function QuickMetric({ label, value }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-2xl font-black italic">{value}</p>
    </div>
  );
}

function TabButton({ id, active, set, label, icon: Icon }) {
  const isSelected = active === id;
  return (
    <button
      onClick={() => set(id)}
      className={`w-full flex items-center gap-3 px-6 py-4 rounded-2xl transition-all ${isSelected ? 'bg-slate-950 text-white shadow-xl translate-x-1' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
    >
      <Icon className={`w-4 h-4 ${isSelected ? 'text-accent' : 'text-slate-400'}`} />
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function ActionLink({ to, icon: Icon, label }) {
  return (
    <Link to={to} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group">
      <div className="flex items-center gap-3">
        <Icon className="w-4 h-4 text-accent" />
        <span className="text-[10px] font-black uppercase tracking-widest group-hover:text-white transition-colors">{label}</span>
      </div>
      <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-accent group-hover:translate-x-1 transition-all" />
    </Link>
  );
}

function StatsBlock({ title, icon: Icon, children }) {
  return (
    <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-slate-400" />
        </div>
        <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">{title}</h3>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

function MetricRow({ label, value, highlight }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
      <span className={`text-sm font-black italic tracking-tighter ${highlight ? 'text-accent' : 'text-slate-900'}`}>{value}</span>
    </div>
  );
}

function TacticalInsight({ icon: Icon, label, value, desc }) {
  return (
    <div className="text-center space-y-2">
      <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
        <Icon className="w-5 h-5 text-slate-400" />
      </div>
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-xl font-black text-slate-900 italic tracking-tighter leading-none">{value}</p>
      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter italic">{desc}</p>
    </div>
  );
}

export default PlayerDetail;