// src/utils/dataValidation.js

export const validatePlayerData = (player) => {
  if (!player) return null;
  
  // Ensure numeric values with proper defaults
  const current = parseFloat(player.current_rating) || 0;
  let peak = parseFloat(player.peak_potential) || 0;
  const matches = parseInt(player.matches) || 0;
  const minutes = parseInt(player.minutes) || 0;
  const goals = parseInt(player.goals) || 0;
  const assists = parseInt(player.assists) || 0;
  
  // Ensure peak potential is valid (50-100 range)
  if (peak < 50 && current > 0) peak = current + 10;
  if (peak > 100) peak = 100;
  
  // Fix: Current rating should not exceed peak potential
  const fixedCurrent = Math.min(current, peak);
  
  // Fix: Next season rating capped at peak potential
  const nextSeason = Math.min(fixedCurrent + 2, peak);
  
  // Fix: Development scores with intelligent defaults
  const mlDev = parseFloat(player.ml_development_score) || 
                Math.min(peak * 0.3 + fixedCurrent * 0.7, 95);
  
  const basePerf = parseFloat(player.base_performance_score) || 
                   Math.min(fixedCurrent * 0.9, peak * 0.8);
  
  const playingTime = parseFloat(player.playing_time_score) || 
                      Math.min((minutes / Math.max(matches * 60, 1)) * 100, 100);
  
  // Calculate goals per 90 if not provided
  const goalsPer90 = parseFloat(player['Per 90 Minutes_Gls']) || 
                     parseFloat(player.goals_per_90) || 
                     (matches > 0 ? (goals / (minutes / 90)) : 0);
  
  // Confidence based on sample size
  const confidence = player.confidence || 
                     (matches >= 20 ? 'High' : 
                      matches >= 10 ? 'Medium' : 
                      matches >= 5 ? 'Low' : 'Very Low');
  
  return {
    ...player,
    // Fixed ratings
    current_rating: fixedCurrent,
    CurrentRating: fixedCurrent,
    PerformanceScore: fixedCurrent,
    next_season_rating: nextSeason,
    peak_potential: peak,
    PredictedPotential: peak,
    
    // Development metrics
    ml_development_score: mlDev,
    base_performance_score: basePerf,
    playing_time_score: playingTime,
    confidence: confidence,
    
    // Stats
    matches_played_display: matches,
    low_sample_size: matches < 3,
    'Per 90 Minutes_Gls': goalsPer90,
    goals_per_90: goalsPer90,
    
    // Ensure other stats
    goals: goals,
    assists: assists,
    minutes: minutes,
    matches: matches,
    
    // Fallback values
    Age_std: player.Age_std || player.Age || 18,
    Player: player.Player || player.player_name || 'Unknown',
    Squad_std: player.Squad_std || player.club || 'N/A',
    Pos_std: player.Pos_std || player.position || 'Unknown',
    Season: player.Season || player.season || 'N/A'
  };
};

export const formatValue = (value, format = '0.1') => {
  if (value === null || value === undefined || value === '') return '0.0';
  const num = parseFloat(value);
  if (isNaN(num)) return '0.0';
  
  if (format === '0.0') return num.toFixed(0);
  if (format === '0.00') return num.toFixed(2);
  return num.toFixed(1);
};

export const getPlayerAge = (player) => {
  if (player.Age_std) return player.Age_std;
  if (player.Age) return player.Age;
  return 18;
};

export const checkDataIssues = (player) => {
  const issues = [];
  
  if (!player) return issues;
  
  const current = parseFloat(player.current_rating) || 0;
  const peak = parseFloat(player.peak_potential) || 0;
  const matches = parseInt(player.matches) || 0;
  
  if (current > peak && peak > 0) {
    issues.push(`Current rating (${current}) exceeds peak potential (${peak})`);
  }
  
  if (matches === 0 && (current > 0 || peak > 0)) {
    issues.push('Player has ratings but 0 matches played');
  }
  
  return issues;
};