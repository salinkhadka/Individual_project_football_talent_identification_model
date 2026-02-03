// src/pages/ScoutingReport.jsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, TrendingUp, TrendingDown, Users, Target, FileText, AlertCircle, CheckCircle, XCircle, Award, Calendar, Activity } from 'lucide-react';
import api from '../services/api';

function ScoutingReport() {
  const { id } = useParams();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadReport();
  }, [id]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await api.getScoutingReport(id);
      setReport(response.data);
      setError(null);
    } catch (err) {
      console.error('Error loading scouting report:', err);
      setError('Failed to load scouting report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const response = await api.exportScoutingReport(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `scouting-report-${report?.player?.name || id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting report:', err);
      alert('Failed to export report');
    } finally {
      setExporting(false);
    }
  };

  const calculateAge = (birthYear) => {
    const currentYear = new Date().getFullYear();
    return currentYear - birthYear;
  };

  const getTierColor = (color) => {
    const colors = {
      gold: 'from-yellow-400 to-yellow-600',
      silver: 'from-gray-300 to-gray-500',
      bronze: 'from-orange-400 to-orange-600',
      blue: 'from-blue-400 to-blue-600',
      green: 'from-green-400 to-green-600',
      purple: 'from-purple-400 to-purple-600'
    };
    return colors[color] || 'from-gray-400 to-gray-600';
  };

  const getRecommendationStyle = (recommendation) => {
    if (recommendation?.includes('PRIORITY')) {
      return 'bg-red-50 border-red-500 text-red-900';
    } else if (recommendation?.includes('RECOMMEND')) {
      return 'bg-green-50 border-green-500 text-green-900';
    } else if (recommendation?.includes('MONITOR')) {
      return 'bg-yellow-50 border-yellow-500 text-yellow-900';
    }
    return 'bg-blue-50 border-blue-500 text-blue-900';
  };

  const getGrowthRateColor = (rate) => {
    const rates = {
      rapid: 'text-green-600 bg-green-50',
      moderate: 'text-yellow-600 bg-yellow-50',
      slow: 'text-orange-600 bg-orange-50',
      plateau: 'text-red-600 bg-red-50'
    };
    return rates[rate?.toLowerCase()] || 'text-gray-600 bg-gray-50';
  };

  const getSeasonChangeStyle = (trend) => {
    const styles = {
      significant_improvement: {
        bg: 'bg-gradient-to-r from-green-50 to-emerald-50',
        border: 'border-green-500',
        text: 'text-green-900',
        icon: TrendingUp,
        iconColor: 'text-green-600'
      },
      improvement: {
        bg: 'bg-gradient-to-r from-blue-50 to-cyan-50',
        border: 'border-blue-400',
        text: 'text-blue-900',
        icon: TrendingUp,
        iconColor: 'text-blue-600'
      },
      stable: {
        bg: 'bg-gray-50',
        border: 'border-gray-400',
        text: 'text-gray-900',
        icon: Activity,
        iconColor: 'text-gray-600'
      },
      decline: {
        bg: 'bg-gradient-to-r from-orange-50 to-yellow-50',
        border: 'border-orange-400',
        text: 'text-orange-900',
        icon: TrendingDown,
        iconColor: 'text-orange-600'
      },
      significant_decline: {
        bg: 'bg-gradient-to-r from-red-50 to-pink-50',
        border: 'border-red-500',
        text: 'text-red-900',
        icon: TrendingDown,
        iconColor: 'text-red-600'
      }
    };
    return styles[trend] || styles.stable;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading scouting report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Report not found</h2>
        <p className="text-gray-600 mb-6">{error || 'Unable to load scouting report'}</p>
        <Link
          to={`/player/${id}`}
          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Player Profile
        </Link>
      </div>
    );
  }

  const { player, ratings, performance, growth, analysis, tier, recommendation, scout_notes, similar_players, season_change } = report;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          to={`/player/${id}`}
          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Player Profile
        </Link>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50"
        >
          {exporting ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Export Report
        </button>
      </div>

      {/* Player Header */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold">{player.name}</h1>
              <span className={`px-4 py-2 rounded-lg text-sm font-bold bg-gradient-to-r ${getTierColor(tier.color)} shadow-lg`}>
                {tier.name}
              </span>
            </div>
            <div className="flex items-center gap-4 text-purple-100 flex-wrap">
              <span className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                <Award className="w-4 h-4" />
                {player.team}
              </span>
              <span className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                {player.position}
              </span>
              <span className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                <Calendar className="w-4 h-4" />
                Age {calculateAge(player.age)}
              </span>
              <span className="flex items-center gap-2 bg-white/20 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                {player.nation}
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-6xl font-bold text-yellow-300 drop-shadow-lg">
              {ratings.peak_potential.toFixed(1)}
            </div>
            <div className="text-purple-100 text-sm mt-1 font-semibold uppercase tracking-wider">Peak Potential</div>
          </div>
        </div>

        {/* Ratings Bar */}
        <div className="grid grid-cols-3 gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{ratings.current.toFixed(1)}</div>
            <div className="text-purple-200 text-sm">Current Rating</div>
          </div>
          <div className="text-center border-l border-r border-white/20">
            <div className="text-2xl font-bold text-green-300">{ratings.next_season.toFixed(1)}</div>
            <div className="text-purple-200 text-sm">Next Season</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-300">{ratings.peak_potential.toFixed(1)}</div>
            <div className="text-purple-200 text-sm">Peak</div>
          </div>
        </div>
      </div>

      {/* Season Change Alert - NEW */}
      {season_change?.available && (
        <div className={`border-l-4 p-6 rounded-lg shadow-lg ${getSeasonChangeStyle(season_change.trend).bg} ${getSeasonChangeStyle(season_change.trend).border}`}>
          <div className="flex items-start gap-4">
            {(() => {
              const Icon = getSeasonChangeStyle(season_change.trend).icon;
              return <Icon className={`w-8 h-8 mt-0.5 flex-shrink-0 ${getSeasonChangeStyle(season_change.trend).iconColor}`} />;
            })()}
            <div className="flex-1">
              <h3 className={`font-bold text-xl mb-2 ${getSeasonChangeStyle(season_change.trend).text}`}>
                Season-over-Season: {season_change.trend_label}
              </h3>
              <p className={`text-sm mb-3 ${getSeasonChangeStyle(season_change.trend).text} opacity-80`}>
                {season_change.previous_season} → {season_change.current_season}
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white/50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 font-medium mb-1">Rating Change</div>
                  <div className={`text-2xl font-bold ${season_change.rating_change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {season_change.rating_change > 0 ? '+' : ''}{season_change.rating_change.toFixed(1)}
                  </div>
                </div>
                
                <div className="bg-white/50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 font-medium mb-1">Goals Change</div>
                  <div className={`text-2xl font-bold ${season_change.goals_change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {season_change.goals_change > 0 ? '+' : ''}{season_change.goals_change}
                  </div>
                </div>
                
                <div className="bg-white/50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 font-medium mb-1">Matches Change</div>
                  <div className={`text-2xl font-bold ${season_change.matches_change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {season_change.matches_change > 0 ? '+' : ''}{season_change.matches_change}
                  </div>
                </div>
                
                <div className="bg-white/50 rounded-lg p-3">
                  <div className="text-xs text-gray-600 font-medium mb-1">Goals/Match Δ</div>
                  <div className={`text-2xl font-bold ${season_change.goals_per_match_change >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {season_change.goals_per_match_change > 0 ? '+' : ''}{season_change.goals_per_match_change.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendation Alert */}
      <div className={`border-l-4 p-4 rounded-lg ${getRecommendationStyle(recommendation)}`}>
        <div className="flex items-start gap-3">
          <Target className="w-6 h-6 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-lg mb-1">Scout Recommendation</h3>
            <p className="font-medium">{recommendation}</p>
          </div>
        </div>
      </div>

      {/* Growth & Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Growth Trajectory */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Growth Trajectory
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600 font-medium">Growth Rate</span>
              <span className={`px-3 py-1 rounded-full text-sm font-bold uppercase ${getGrowthRateColor(growth.growth_rate)}`}>
                {growth.growth_rate}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <span className="text-gray-600 font-medium">Short-term Projection</span>
              <span className="text-2xl font-bold text-blue-600">+{growth.short_term.toFixed(1)}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <span className="text-gray-600 font-medium">Long-term Projection</span>
              <span className="text-2xl font-bold text-purple-600">+{growth.long_term.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* Performance Stats */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-green-600" />
            Performance Stats
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600 font-medium">Matches Played</span>
              <span className="text-2xl font-bold text-gray-900">{performance.matches}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <span className="text-gray-600 font-medium">Total Goals</span>
              <span className="text-2xl font-bold text-orange-600">{performance.goals}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <span className="text-gray-600 font-medium">Goals per Match</span>
              <span className="text-2xl font-bold text-green-600">{performance.goals_per_match.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Strengths */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Strengths
          </h2>
          <ul className="space-y-2">
            {analysis.strengths.map((strength, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-700">
                <span className="text-green-500 mt-1">✓</span>
                <span>{strength}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Weaknesses */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            Areas of Concern
          </h2>
          <ul className="space-y-2">
            {analysis.weaknesses.map((weakness, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-700">
                <span className="text-red-500 mt-1">✗</span>
                <span>{weakness}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Development Areas */}
        <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Development Focus
          </h2>
          <ul className="space-y-2">
            {analysis.development_areas.map((area, idx) => (
              <li key={idx} className="flex items-start gap-2 text-gray-700">
                <span className="text-blue-500 mt-1">→</span>
                <span>{area}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Scout Notes */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-600" />
          Scout Notes
        </h2>
        <p className="text-gray-700 leading-relaxed">{scout_notes}</p>
      </div>

      {/* Similar Players */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-600" />
          Similar Players
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-gray-600 font-semibold">Player</th>
                <th className="text-left py-3 px-4 text-gray-600 font-semibold">Team</th>
                <th className="text-left py-3 px-4 text-gray-600 font-semibold">Position</th>
                <th className="text-left py-3 px-4 text-gray-600 font-semibold">Age</th>
                <th className="text-center py-3 px-4 text-gray-600 font-semibold">Current</th>
                <th className="text-center py-3 px-4 text-gray-600 font-semibold">Potential</th>
                <th className="text-center py-3 px-4 text-gray-600 font-semibold">Similarity</th>
                <th className="text-center py-3 px-4 text-gray-600 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {similar_players
                .filter((p, idx, arr) => arr.findIndex(x => x.id === p.id) === idx)
                .filter(p => p.id !== parseInt(id))
                .slice(0, 5)
                .map((player) => (
                  <tr key={player.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-900">{player.name}</td>
                    <td className="py-3 px-4 text-gray-600">{player.team}</td>
                    <td className="py-3 px-4 text-gray-600">{player.position}</td>
                    <td className="py-3 px-4 text-gray-600">{calculateAge(player.age)}</td>
                    <td className="py-3 px-4 text-center font-semibold text-blue-600">{player.current_rating.toFixed(1)}</td>
                    <td className="py-3 px-4 text-center font-semibold text-purple-600">{player.peak_potential.toFixed(1)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        {player.similarity_score.toFixed(0)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Link
                        to={`/player/${player.id}`}
                        className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                      >
                        View
                      </Link>
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

export default ScoutingReport;