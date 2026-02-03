// src/pages/PlayerDetail.jsx - COMPLETE FIXED VERSION
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, TrendingUp, Award, Calendar, MapPin, Star, FileText, 
  Activity, Target, Users, ChevronRight, Download, RefreshCw,
  AlertCircle, BarChart3, Shield, Target as TargetIcon,
  Zap, Eye, BarChart2, TrendingDown, Percent, GitBranch,
  Award as AwardIcon, Trophy
} from 'lucide-react';
import api from '../services/api';
import PlayerProgressionChart from '../components/PlayerProgressionChart';
import DevelopmentTimeline from '../components/DevelopmentTimeline';
import { validatePlayerData, formatValue, getPlayerAge } from '../utils/dataValidation';

function PlayerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState(null);
  const [progression, setProgression] = useState([]);
  const [loading, setLoading] = useState(true);
  const [progressionLoading, setProgressionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [dataIssues, setDataIssues] = useState([]);
  const [similarPlayers, setSimilarPlayers] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [isComparing, setIsComparing] = useState(false);
  const [compareIds, setCompareIds] = useState([]);

  // Mounted ref for cleanup
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    loadPlayerData();
    checkWatchlist();
    
    return () => {
      isMounted.current = false;
    };
  }, [id]);

  const loadPlayerData = useCallback(async () => {
    if (!id || !isMounted.current) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Load player data
      const playerRes = await api.getPlayerById(id);
      
      if (!playerRes.data) {
        throw new Error('Player not found');
      }
      
      const validatedPlayer = validatePlayerData(playerRes.data);
      const issues = checkDataIssues(validatedPlayer);
      
      if (isMounted.current) {
        setPlayer(validatedPlayer);
        setDataIssues(issues);
      }
      
      // Load progression data
      if (validatedPlayer?.player_name || validatedPlayer?.Player) {
        try {
          setProgressionLoading(true);
          const progressionRes = await api.getPlayerProgression(
            validatedPlayer.player_name || validatedPlayer.Player
          );
          if (isMounted.current && progressionRes.data) {
            const validatedProgression = (progressionRes.data || []).map(p => validatePlayerData(p));
            setProgression(validatedProgression);
          }
        } catch (err) {
          console.warn('Progression data not available:', err);
        } finally {
          if (isMounted.current) {
            setProgressionLoading(false);
          }
        }
        
        // Load similar players
        await loadSimilarPlayers(validatedPlayer);
      }
      
    } catch (err) {
      console.error('Error loading player:', err);
      if (isMounted.current) {
        setError('Player not found or could not be loaded');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [id]);

  const loadSimilarPlayers = async (currentPlayer) => {
    try {
      setLoadingSimilar(true);
      const position = currentPlayer.Pos_std || currentPlayer.position;
      const response = await api.searchPlayers('', position);
      const allPlayers = response.data || [];
      
      // Filter and sort similar players
      const filtered = allPlayers
        .filter(p => p.id !== parseInt(id))
        .map(p => {
          const pPotential = parseFloat(p.peak_potential) || 0;
          const currentPotential = parseFloat(currentPlayer.peak_potential) || 0;
          const diff = Math.abs(pPotential - currentPotential);
          return { 
            ...p, 
            similarity: Math.max(0, 100 - (diff * 2)),
            diff: pPotential - currentPotential
          };
        })
        .filter(p => p.similarity > 70)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5);
      
      if (isMounted.current) {
        setSimilarPlayers(filtered);
      }
    } catch (err) {
      console.error('Error loading similar players:', err);
      if (isMounted.current) {
        setSimilarPlayers([]);
      }
    } finally {
      if (isMounted.current) {
        setLoadingSimilar(false);
      }
    }
  };

  const checkDataIssues = (playerData) => {
    const issues = [];
    if (!playerData) return issues;
    
    const current = parseFloat(playerData.current_rating) || 0;
    const peak = parseFloat(playerData.peak_potential) || 0;
    const matches = parseInt(playerData.matches) || 0;
    
    if (current > peak && peak > 0) {
      issues.push(`Current rating (${current}) exceeds peak potential (${peak})`);
    }
    
    if (matches === 0 && (current > 0 || peak > 0)) {
      issues.push('Player has ratings but 0 matches played');
    }
    
    return issues;
  };

  const checkWatchlist = async () => {
    try {
      const response = await api.getWatchlist();
      const watchlist = response.data.watchlist || [];
      const isInList = watchlist.some(p => String(p.player_id) === String(id));
      if (isMounted.current) {
        setIsInWatchlist(isInList);
      }
    } catch (err) {
      console.error('Error checking watchlist:', err);
    }
  };

  const toggleWatchlist = async () => {
    try {
      setWatchlistLoading(true);
      if (isInWatchlist) {
        await api.removeFromWatchlist(id);
        if (isMounted.current) {
          setIsInWatchlist(false);
        }
      } else {
        await api.addToWatchlist(id);
        if (isMounted.current) {
          setIsInWatchlist(true);
        }
      }
    } catch (err) {
      console.error('Error toggling watchlist:', err);
      alert('Failed to update watchlist');
    } finally {
      if (isMounted.current) {
        setWatchlistLoading(false);
      }
    }
  };

  const handleRecalculate = async () => {
    if (!window.confirm('Recalculate potential using latest model?')) return;
    
    try {
      await api.recalculatePotential(id);
      alert('Potential recalculated! Refreshing...');
      loadPlayerData();
    } catch (err) {
      console.error('Error recalculating:', err);
      alert('Failed to recalculate');
    }
  };

  const getGrowthRate = () => {
    if (progression.length < 2) {
      return { 
        rate: 'Insufficient Data', 
        color: 'gray', 
        icon: Eye
      };
    }
    
    const latest = progression[0]?.peak_potential || 0;
    const oldest = progression[progression.length - 1]?.peak_potential || 0;
    const change = latest - oldest;
    
    if (change > 5) return { 
      rate: 'Rapid Growth', 
      color: 'green', 
      icon: TrendingUp
    };
    if (change > 2) return { 
      rate: 'Steady Growth', 
      color: 'blue', 
      icon: BarChart2
    };
    if (change > 0) return { 
      rate: 'Slow Growth', 
      color: 'yellow', 
      icon: Activity
    };
    if (change < -2) return { 
      rate: 'Decline', 
      color: 'red', 
      icon: TrendingDown
    };
    return { 
      rate: 'Stable', 
      color: 'gray', 
      icon: Shield
    };
  };

  const getPositionIcon = (position) => {
    switch (position) {
      case 'FW': return TargetIcon;
      case 'MF': return Zap;
      case 'DF': return Shield;
      case 'GK': return AwardIcon;
      default: return AwardIcon;
    }
  };

  const getPositionColor = (position) => {
    switch (position) {
      case 'FW': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'MF': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'DF': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'GK': return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleAddToCompare = () => {
    const newCompareIds = [...compareIds, id].filter((v, i, a) => a.indexOf(v) === i);
    setCompareIds(newCompareIds);
    setIsComparing(true);
    
    if (newCompareIds.length >= 2) {
      navigate(`/compare?ids=${newCompareIds.join(',')}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading player profile...</p>
        </div>
      </div>
    );
  }

  if (error || !player) {
    return (
      <div className="text-center py-16 bg-white rounded-xl shadow-lg">
        <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Player not found</h2>
        <p className="text-gray-600 mb-6">The requested player could not be loaded</p>
        <Link
          to="/players"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Players
        </Link>
      </div>
    );
  }

  const growthRate = getGrowthRate();
  const PositionIconComponent = getPositionIcon(player.Pos_std || player.position);
  const positionColor = getPositionColor(player.Pos_std || player.position);

  return (
    <div className="space-y-8 pb-12">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/players"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium hover:underline"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Players
        </Link>
        <div className="flex gap-2">
          <button
            onClick={toggleWatchlist}
            disabled={watchlistLoading}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              isInWatchlist
                ? 'bg-yellow-100 text-yellow-800 border border-yellow-200 hover:bg-yellow-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {watchlistLoading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
            ) : (
              <Star className={`w-4 h-4 ${isInWatchlist ? 'fill-yellow-500' : ''}`} />
            )}
            {isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
          </button>
          <button
            onClick={handleAddToCompare}
            className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 font-medium transition-colors"
          >
            <Users className="w-4 h-4" />
            Compare
          </button>
          <button
            onClick={handleRecalculate}
            className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Recalculate
          </button>
        </div>
      </div>

      {/* Data Issue Warnings */}
      {dataIssues.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-yellow-800 mb-1">Data Quality Issues</h3>
              <ul className="list-disc list-inside text-sm text-yellow-700">
                {dataIssues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
              <p className="text-xs text-yellow-600 mt-2">
                Some metrics have been auto-calculated based on available data.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Player Header Card */}
      <div className="bg-gradient-to-r from-gray-900 to-blue-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-lg ${positionColor.split(' ')[1]}`}>
                <PositionIconComponent className="w-5 h-5" />
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${positionColor}`}>
                {player.Pos_std || player.position || 'Unknown'}
              </div>
              <div className="px-3 py-1 bg-white/20 rounded-full text-sm">
                Season: {player.Season || player.season || 'N/A'}
              </div>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-2">{player.Player || player.player_name}</h1>
            <div className="flex flex-wrap items-center gap-4 text-gray-300">
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                {player.Squad_std || player.club || 'N/A'}
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Age {getPlayerAge(player)}
              </span>
              <span className="flex items-center gap-2">
                <Award className="w-4 h-4" />
                {player.Nation_std || player.nation || 'N/A'}
              </span>
            </div>
          </div>
          <div className="text-center lg:text-right">
            <div className="text-5xl lg:text-6xl font-bold text-blue-300 drop-shadow-lg mb-1">
              {formatValue(player.peak_potential)}
            </div>
            <div className="text-gray-300 text-sm uppercase tracking-wider mb-4">Peak Potential</div>
            <div className="flex items-center justify-center lg:justify-end gap-3">
              <div className="text-center">
                <div className="text-xl font-bold text-white">{formatValue(player.current_rating)}</div>
                <div className="text-xs text-gray-300">Current</div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
              <div className="text-center">
                <div className="text-xl font-bold text-green-300">{formatValue(player.next_season_rating)}</div>
                <div className="text-xs text-gray-300">Next Season</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <StatItem label="Matches" value={player.matches_played_display || player.matches || 0} />
          <StatItem label="Goals" value={player.goals || 0} />
          <StatItem label="Assists" value={player.assists || 0} />
          <StatItem label="Minutes" value={player.minutes ? Math.round(player.minutes).toLocaleString() : 0} />
        </div>
      </div>

      {/* Growth Indicator */}
      <div className={`bg-${growthRate.color}-50 border border-${growthRate.color}-200 rounded-xl p-4`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <growthRate.icon className={`w-6 h-6 text-${growthRate.color}-600`} />
            <div>
              <h3 className="font-bold text-gray-900">Development Trajectory</h3>
              <p className="text-sm text-gray-600">{growthRate.rate}</p>
            </div>
          </div>
          <div className="text-center md:text-right">
            <div className="text-sm text-gray-600 mb-1">
              {progression.length} season{progression.length !== 1 ? 's' : ''} tracked
            </div>
            {progression.length > 1 && (
              <div className="text-lg font-bold text-gray-900">
                {((progression[0]?.peak_potential || 0) - (progression[progression.length - 1]?.peak_potential || 0)).toFixed(1)} pts growth
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex flex-wrap gap-4 md:gap-8">
          {['overview', 'performance', 'development', 'progression', 'similar'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-2 px-1 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab === 'overview' && 'Overview'}
              {tab === 'performance' && 'Performance'}
              {tab === 'development' && 'Development'}
              {tab === 'progression' && 'Progression'}
              {tab === 'similar' && 'Similar Players'}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <OverviewTab player={player} progression={progression} progressionLoading={progressionLoading} />
        )}
        
        {activeTab === 'performance' && (
          <PerformanceTab player={player} />
        )}
        
        {activeTab === 'development' && (
          <DevelopmentTab player={player} />
        )}
        
        {activeTab === 'progression' && (
          <ProgressionTab 
            player={player} 
            progression={progression} 
            loading={progressionLoading} 
          />
        )}
        
        {activeTab === 'similar' && (
          <SimilarPlayersTab 
            similarPlayers={similarPlayers} 
            loading={loadingSimilar} 
            currentPlayer={player}
          />
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          to={`/scouting-report/${id}`}
          className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow flex items-center gap-3 group"
        >
          <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Scouting Report</h3>
            <p className="text-sm text-gray-600">Detailed analysis and recommendations</p>
          </div>
        </Link>
        <Link
          to={`/shotmap/${id}`}
          className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow flex items-center gap-3 group"
        >
          <div className="p-2 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
            <Target className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Performance Analysis</h3>
            <p className="text-sm text-gray-600">Goal-scoring positions and efficiency</p>
          </div>
        </Link>
        <Link
          to={`/compare?ids=${id}`}
          className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-lg transition-shadow flex items-center gap-3 group"
        >
          <div className="p-2 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition-colors">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Compare Player</h3>
            <p className="text-sm text-gray-600">Side-by-side with other prospects</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

function StatItem({ label, value }) {
  return (
    <div className="text-center">
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-gray-300 text-xs uppercase tracking-wide mt-1">{label}</div>
    </div>
  );
}

function OverviewTab({ player, progression, progressionLoading }) {
  const calculateEfficiency = () => {
    if (!player.matches || player.matches === 0) return 0;
    const goals = player.goals || 0;
    const assists = player.assists || 0;
    return (goals + assists) / player.matches;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Performance Stats */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-600" />
          Performance Metrics
        </h2>
        <div className="space-y-4">
          <MetricRow 
            label="Goals per 90" 
            value={formatValue(player['Per 90 Minutes_Gls'] || player.goals_per_90, '0.00')}
            badge={player['Per 90 Minutes_Gls'] > 0.5 ? 'Excellent' : player['Per 90 Minutes_Gls'] > 0.2 ? 'Good' : 'Average'}
          />
          <MetricRow 
            label="Assists per 90" 
            value={formatValue(player['Per 90 Minutes_Ast'] || player.assists_per_90, '0.00')}
          />
          <MetricRow 
            label="Goal Contribution per Match" 
            value={calculateEfficiency().toFixed(2)}
          />
          <MetricRow 
            label="Minutes per Match" 
            value={player.matches > 0 ? Math.round((player.minutes || 0) / player.matches) : 0}
            unit="min"
          />
          <MetricRow 
            label="Starting Rate" 
            value={player.matches > 0 ? `${Math.round(((player.starts || 0) / player.matches) * 100)}%` : '0%'}
          />
          <MetricRow 
            label="Shot Accuracy" 
            value={player.shots && player.shots_on_target ? 
              `${Math.round((player.shots_on_target / player.shots) * 100)}%` : 'N/A'}
          />
        </div>
      </div>

      {/* Development Overview */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-600" />
          Development Overview
        </h2>
        <div className="space-y-4">
          <MetricRow 
            label="ML Development Score" 
            value={formatValue(player.ml_development_score)}
            badge={player.ml_development_score > 80 ? 'High' : player.ml_development_score > 70 ? 'Good' : 'Average'}
          />
          <MetricRow 
            label="Base Performance Score" 
            value={formatValue(player.base_performance_score)}
          />
          <MetricRow 
            label="Playing Time Score" 
            value={formatValue(player.playing_time_score)}
            badge={player.playing_time_score > 80 ? 'Excellent' : player.playing_time_score > 60 ? 'Good' : 'Limited'}
          />
          <MetricRow 
            label="Confidence Level" 
            value={player.confidence || 'Medium'}
            badge={player.confidence}
          />
          <MetricRow 
            label="Sample Size" 
            value={`${player.matches || 0} match${player.matches !== 1 ? 'es' : ''}`}
          />
          <MetricRow 
            label="Development Potential" 
            value={`${Math.round((player.peak_potential - player.current_rating))} pts`}
            badge={player.peak_potential - player.current_rating > 10 ? 'High' : 'Moderate'}
          />
        </div>
      </div>

      {/* Mini Progression Chart */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            Career Progression
          </h2>
          {progression.length > 0 && (
            <button
              onClick={() => setActiveTab('progression')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View Full Progression →
            </button>
          )}
        </div>
        {progressionLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              <p className="mt-4 text-gray-500">Loading progression data...</p>
            </div>
          </div>
        ) : progression.length > 0 ? (
          <PlayerProgressionChart 
            progression={progression.slice(0, 5)} 
            compact={true}
          />
        ) : (
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p>No progression data available</p>
            <p className="text-sm text-gray-400">This player has only one season of data</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PerformanceTab({ player }) {
  const isGK = (player.Pos_std || player.position) === 'GK';
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Offensive Stats */}
      {!isGK && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Offensive Performance</h2>
          <div className="space-y-4">
            <MetricRow label="Total Goals" value={player.goals || 0} />
            <MetricRow label="Total Assists" value={player.assists || 0} />
            <MetricRow label="Goal Contributions" value={(player.goals || 0) + (player.assists || 0)} />
            <MetricRow label="Goals per 90" value={formatValue(player.goals_per_90, '0.00')} />
            <MetricRow label="Assists per 90" value={formatValue(player.assists_per_90, '0.00')} />
            <MetricRow label="xG per 90" value={formatValue(player.xg_per_90, '0.00')} />
            <MetricRow label="xA per 90" value={formatValue(player.xa_per_90, '0.00')} />
          </div>
        </div>
      )}

      {/* GK Stats */}
      {isGK && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Goalkeeper Performance</h2>
          <div className="space-y-4">
            <MetricRow label="Save Percentage" value={formatValue(player.SavePercentage, '0.0') + '%'} />
            <MetricRow label="Clean Sheet %" value={formatValue(player.CleanSheetPercentage, '0.0') + '%'} />
            <MetricRow label="Goals Against per 90" value={formatValue(player.GoalsAgainstPer90, '0.00')} />
            <MetricRow label="Clean Sheets" value={player.clean_sheets || 0} />
            <MetricRow label="Goals Against" value={player.goals_against || 0} />
            <MetricRow label="Saves per 90" value={formatValue(player.saves_per_90, '0.00')} />
          </div>
        </div>
      )}

      {/* Playing Time */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Playing Time Analysis</h2>
        <div className="space-y-4">
          <MetricRow label="Total Matches" value={player.matches || 0} />
          <MetricRow label="Starts" value={player.starts || 0} />
          <MetricRow label="Total Minutes" value={player.minutes ? Math.round(player.minutes).toLocaleString() : 0} />
          <MetricRow label="Minutes per Match" value={
            player.matches > 0 ? Math.round((player.minutes || 0) / player.matches) : 0
          } />
          <MetricRow label="Start Percentage" value={
            player.matches > 0 ? `${Math.round(((player.starts || 0) / player.matches) * 100)}%` : '0%'
          } />
          <MetricRow label="90s Played" value={formatValue(player.nineties, '0.0')} />
        </div>
      </div>

      {/* Efficiency Metrics */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Efficiency Metrics</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <EfficiencyBox 
            value={player.matches > 0 ? ((player.goals || 0) / player.matches).toFixed(2) : '0.00'}
            label="Goals per Match"
            color="blue"
            icon={Target}
          />
          <EfficiencyBox 
            value={player.minutes > 0 ? Math.round(player.minutes / ((player.goals || 0) + (player.assists || 0) || 1)) : 0}
            label="Mins per Contribution"
            color="green"
            icon={Clock}
          />
          <EfficiencyBox 
            value={player.shots > 0 ? `${Math.round(((player.goals || 0) / player.shots) * 100)}%` : 'N/A'}
            label="Conversion Rate"
            color="purple"
            icon={Percent}
          />
          <EfficiencyBox 
            value={player.matches > 0 ? ((player.assists || 0) / player.matches).toFixed(2) : '0.00'}
            label="Assists per Match"
            color="orange"
            icon={GitBranch}
          />
        </div>
      </div>
    </div>
  );
}

function EfficiencyBox({ value, label, color, icon: Icon }) {
  const colorClasses = {
    blue: 'from-blue-50 to-blue-100 text-blue-600',
    green: 'from-green-50 to-green-100 text-green-600',
    purple: 'from-purple-50 to-purple-100 text-purple-600',
    orange: 'from-orange-50 to-orange-100 text-orange-600'
  };

  return (
    <div className={`text-center p-6 bg-gradient-to-br ${colorClasses[color]} rounded-xl`}>
      <Icon className="w-8 h-8 mx-auto mb-3 opacity-70" />
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  );
}

function DevelopmentTab({ player }) {
  const calculateDevelopmentScore = () => {
    const mlScore = player.ml_development_score || 0;
    const baseScore = player.base_performance_score || 0;
    const playingScore = player.playing_time_score || 0;
    return Math.round((mlScore * 0.4) + (baseScore * 0.3) + (playingScore * 0.3));
  };

  const devScore = calculateDevelopmentScore();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Development Factors */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Development Factors</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Overall Development Score</h3>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-blue-600">{devScore}</div>
              <div className="flex-1">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-blue-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${devScore}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="text-sm font-medium text-gray-600 mb-2">Component Scores</h3>
            <div className="space-y-3">
              <ScoreBar label="ML Development" value={player.ml_development_score} color="purple" />
              <ScoreBar label="Base Performance" value={player.base_performance_score} color="blue" />
              <ScoreBar label="Playing Time" value={player.playing_time_score} color="green" />
            </div>
          </div>
        </div>
      </div>

      {/* Age Context */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Age Context</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Current Age</span>
            <span className="font-bold text-gray-900">{getPlayerAge(player)} years</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Age Multiplier</span>
            <span className="font-bold text-blue-600">{formatValue(player.age_multiplier, '1.00')}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Age Bonus</span>
            <span className="font-bold text-green-600">{formatValue(player.age_bonus)}</span>
          </div>
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Development Stage</h3>
            <p className="text-gray-700">
              {getPlayerAge(player) < 18 ? 'Early Developer - High growth potential with proper development' : 
               getPlayerAge(player) < 20 ? 'Prime Development Phase - Critical years for skill development' : 
               'Late Developer - Focusing on consistency and refinement'}
            </p>
          </div>
        </div>
      </div>

      {/* Confidence & Sample */}
      <div className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Confidence & Sample Analysis</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <AnalysisBox 
            title={player.confidence || 'Medium'}
            description="Confidence Level"
            details={`Based on ${player.matches || 0} matches`}
            color="blue"
            icon={Shield}
          />
          
          <AnalysisBox 
            title={formatValue(player.sample_penalty)}
            description="Sample Penalty"
            details={player.matches < 10 ? 'Small sample size penalty applied' : 'Sufficient sample size'}
            color="yellow"
            icon={AlertCircle}
          />
          
          <AnalysisBox 
            title={formatValue(player.elite_bonus)}
            description="Elite Performance Bonus"
            details={player.elite_bonus > 0 ? 'Elite performance detected' : 'Standard performance'}
            color="green"
            icon={Trophy}
          />
        </div>
      </div>
    </div>
  );
}

function AnalysisBox({ title, description, details, color, icon: Icon }) {
  const colorClasses = {
    blue: 'from-blue-50 to-blue-100 text-blue-600',
    yellow: 'from-yellow-50 to-yellow-100 text-yellow-600',
    green: 'from-green-50 to-green-100 text-green-600'
  };

  return (
    <div className={`text-center p-6 bg-gradient-to-br ${colorClasses[color]} rounded-xl`}>
      <Icon className="w-8 h-8 mx-auto mb-3" />
      <div className="text-3xl font-bold mb-2">{title}</div>
      <div className="text-sm text-gray-600">{description}</div>
      <div className="text-xs text-gray-500 mt-2">{details}</div>
    </div>
  );
}

function ProgressionTab({ player, progression, loading }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="mt-4 text-gray-600">Loading progression data...</p>
        </div>
      </div>
    );
  }

  if (progression.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl shadow-lg">
        <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">No Progression Data</h3>
        <p className="text-gray-600 mb-6">This player has only one season of data</p>
        <p className="text-sm text-gray-500">
          Check back next season for progression tracking
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Full Progression Chart */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Career Development</h2>
          <button className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium">
            <Download className="w-4 h-4" />
            Export Data
          </button>
        </div>
        <PlayerProgressionChart progression={progression} />
      </div>

      {/* Development Timeline */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Season Timeline</h2>
        <DevelopmentTimeline progression={progression} />
      </div>

      {/* Progression Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-50 to-purple-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Season</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Age</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Club</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Matches</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Current</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Potential</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Δ Potential</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {progression.map((season, index) => {
              const prevPotential = progression[index + 1]?.peak_potential;
              const delta = prevPotential ? (season.peak_potential - prevPotential).toFixed(1) : '-';
              
              return (
                <tr key={season.season} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{season.season}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{getPlayerAge(season)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{season.club || season.Squad_std}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{season.matches}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="font-medium text-blue-600">{formatValue(season.current_rating)}</span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className="font-bold text-purple-600">{formatValue(season.peak_potential)}</span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    {delta !== '-' && (
                      <span className={`inline-flex items-center gap-1 font-medium ${
                        parseFloat(delta) > 0 ? 'text-green-600' : 
                        parseFloat(delta) < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {parseFloat(delta) > 0 ? <TrendingUp className="w-4 h-4" /> : 
                         parseFloat(delta) < 0 ? <TrendingDown className="w-4 h-4" /> : null}
                        {parseFloat(delta) > 0 ? '+' : ''}{delta}
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

function SimilarPlayersTab({ similarPlayers, loading, currentPlayer }) {
  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto" />
      </div>
    );
  }

  if (similarPlayers.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Similar Players</h2>
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p>No similar players found</p>
          <p className="text-sm text-gray-400 mt-1">
            Try searching for players with similar position and potential
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Similar Players</h2>
        <span className="text-sm text-gray-500">
          Based on position and potential (±5 points)
        </span>
      </div>
      
      <div className="space-y-4">
        {similarPlayers.map((p, index) => {
          const similarity = p.similarity || 0;
          const potentialDiff = (p.peak_potential || 0) - (currentPlayer.peak_potential || 0);
          
          return (
            <div key={p.id} className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg flex items-center justify-center">
                  <span className="font-bold text-blue-600">{index + 1}</span>
                </div>
                <div>
                  <div className="font-medium text-gray-900">{p.Player}</div>
                  <div className="text-sm text-gray-600 flex items-center gap-2">
                    <span>{p.Squad_std}</span>
                    <span>•</span>
                    <span>Age {p.Age_std || p.Age}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <div className="font-bold text-blue-600 text-lg">{formatValue(p.peak_potential)}</div>
                  <div className="text-sm text-gray-500">
                    {potentialDiff > 0 ? `+${potentialDiff.toFixed(1)}` : potentialDiff.toFixed(1)} vs current
                  </div>
                </div>
                
                <div className="w-24">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Similarity</span>
                    <span>{Math.round(similarity)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${similarity}%` }}
                    />
                  </div>
                </div>
                
                <Link
                  to={`/player/${p.id}`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  View
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricRow({ label, value, unit, badge }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-gray-600">{label}</span>
        {badge && (
          <span className={`px-2 py-0.5 text-xs rounded-full ${
            badge === 'Excellent' || badge === 'High' ? 'bg-green-100 text-green-800' :
            badge === 'Good' ? 'bg-blue-100 text-blue-800' :
            badge === 'Average' || badge === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
            badge === 'Limited' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {badge}
          </span>
        )}
      </div>
      <span className="font-bold text-gray-900">
        {value}{unit && <span className="text-gray-600 ml-1">{unit}</span>}
      </span>
    </div>
  );
}

function ScoreBar({ label, value, color }) {
  const score = parseFloat(value) || 0;
  const colorClasses = {
    purple: 'from-purple-500 to-pink-500',
    blue: 'from-blue-500 to-cyan-500',
    green: 'from-green-500 to-emerald-500'
  };
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium text-gray-900">{formatValue(score)}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full bg-gradient-to-r ${colorClasses[color]} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

// Add missing Clock icon component
function Clock(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export default PlayerDetail;