"""
ML-First Performance Calculator - HYBRID SYSTEM with Confidence Weighting
================================================================================
Hybrid: 70% Rules + 30% ML with Confidence-Weighted Performance
Fixes: Correct goals per 90 + Incomplete season handling
UPDATED: Shows top 100 prospects and top 25 per position
FIXED: Handle duplicate 'Rank' column insertion
"""

import pandas as pd
import numpy as np
from typing import Dict, Tuple, List
import joblib
import os
import math


class HybridPerformanceCalculator:
    """
    HYBRID performance calculator with confidence weighting for incomplete seasons.
    Fixes goals per 90 calculation and handles partial seasons properly.
    """
    
    def __init__(self, model_path: str = None, scaler_path: str = None):
        # Load ML model and scaler
        self.model = None
        self.scaler = None
        self.feature_names = []
        
        if model_path and os.path.exists(model_path):
            try:
                self.model = joblib.load(model_path)
                print(f"✓ ML model loaded from {model_path}")
            except Exception as e:
                print(f"⚠️  ML model failed to load: {e}")
        
        if scaler_path and os.path.exists(scaler_path):
            try:
                self.scaler = joblib.load(scaler_path)
                print(f"✓ Scaler loaded from {scaler_path}")
            except Exception as e:
                print(f"⚠️  Scaler failed to load: {e}")
        
        # Load feature names if available
        feature_names_path = model_path.replace('.pkl', '_feature_names.txt') if model_path else None
        if feature_names_path and os.path.exists(feature_names_path):
            with open(feature_names_path, 'r') as f:
                self.feature_names = [line.strip() for line in f]
            print(f"✓ Feature names loaded: {len(self.feature_names)} features")
        
        # REALISTIC Bundesliga U19 Benchmarks (based on actual data)
        self.elite_benchmarks = {
            'FW': {
                'goals': 0.65,  # 90th percentile
                'xg': 0.60,
                'xa': 0.25,
                'full_season_matches': 22  # Typical full season
            },
            'MF': {
                'goals': 0.25,
                'xg': 0.22,
                'xa': 0.30,
                'full_season_matches': 24
            },
            'DF': {
                'goals': 0.10,
                'xg': 0.08,
                'xa': 0.15,
                'full_season_matches': 24
            },
            'GK': {
                'save_pct': 78,
                'cs_pct': 35,
                'ga90': 0.8,
                'full_season_matches': 22
            }
        }
        
        # Performance score caps
        self.performance_caps = {
            'FW': 85,
            'MF': 83,
            'DF': 80,
            'GK': 82
        }
    
    def calculate_per90_stats(self, row: pd.Series) -> Dict:
        """
        CORRECTLY calculate per90 statistics.
        Fixes the goals per 90 calculation issue.
        """
        minutes = row.get('Minutes', 0)
        goals = row.get('Goals', 0)
        assists = row.get('Assists', 0)
        
        # Calculate nineties (full 90-minute games)
        nineties = minutes / 90.0 if minutes > 0 else 0
        
        # Per 90 stats
        goals_per_90 = goals / nineties if nineties > 0 else 0
        assists_per_90 = assists / nineties if nineties > 0 else 0
        
        # Get or estimate xG/xA per 90
        xg_per_90 = row.get('xGPer90', 0)
        xa_per_90 = row.get('xAPer90', 0)
        
        # If xG/xA are 0, estimate from goals/assists (for non-GK only)
        if xg_per_90 == 0 and goals_per_90 > 0 and row.get('Position', 'FW') != 'GK':
            xg_per_90 = goals_per_90 * 0.75  # Conservative estimate
        if xa_per_90 == 0 and assists_per_90 > 0 and row.get('Position', 'FW') != 'GK':
            xa_per_90 = assists_per_90 * 0.75
        
        # Also calculate matches per 90 for verification
        matches = row.get('Matches', 0)
        minutes_per_match = minutes / matches if matches > 0 else 0
        
        return {
            'goals_per_90': goals_per_90,
            'assists_per_90': assists_per_90,
            'xg_per_90': xg_per_90,
            'xa_per_90': xa_per_90,
            'nineties': nineties,
            'minutes_per_match': minutes_per_match,
            'matches': matches
        }
    
    def calculate_confidence_weight(self, matches: int, minutes: int, position: str) -> Tuple[float, str]:
        """
        Calculate confidence weight based on sample size.
        Returns: (weight 0-1, confidence_level)
        """
        # Get expected full season matches for position
        full_season = self.elite_benchmarks.get(position, {}).get('full_season_matches', 22)
        
        # Calculate match completeness
        match_completeness = matches / full_season if full_season > 0 else 0
        
        # Calculate minute completeness (at least 60 minutes per match expected)
        expected_minutes = matches * 60
        minute_completeness = min(minutes / expected_minutes, 1.5) if expected_minutes > 0 else 0
        
        # Combined completeness
        completeness = (match_completeness * 0.6) + (minute_completeness * 0.4)
        
        # Determine confidence level and weight
        if matches >= 20 and minutes >= 1500:
            confidence = "Very High"
            weight = 1.0  # Full trust in data
        elif matches >= 15 and minutes >= 1000:
            confidence = "High"
            weight = 0.85  # High trust
        elif matches >= 10 and minutes >= 600:
            confidence = "Medium"
            weight = 0.70  # Moderate trust
        elif matches >= 5 and minutes >= 300:
            confidence = "Low"
            weight = 0.50  # Limited trust
        else:
            confidence = "Very Low"
            weight = 0.30  # Very limited trust
        
        # Adjust weight based on completeness
        adjusted_weight = weight * completeness
        
        return min(max(adjusted_weight, 0.1), 1.0), confidence
    
    def calculate_base_performance(self, row: pd.Series, per90_stats: Dict) -> float:
        """
        Calculate base performance score without confidence weighting.
        """
        position = row.get('Position', 'FW')
        
        if position == 'GK':
            return self._calculate_gk_performance(row)
        
        goals_per_90 = per90_stats['goals_per_90']
        xg_per_90 = per90_stats['xg_per_90']
        xa_per_90 = per90_stats['xa_per_90']
        goals = row.get('Goals', 0)
        
        # Get benchmarks
        bench = self.elite_benchmarks.get(position, self.elite_benchmarks['FW'])
        
        # Calculate component scores
        if position == 'FW':
            # Weights: Goals 45%, xG 35%, xA 20%
            goal_ratio = min(goals_per_90 / bench['goals'], 1.5)
            xg_ratio = min(xg_per_90 / bench['xg'], 1.5)
            xa_ratio = min(xa_per_90 / bench['xa'], 1.5)
            
            goal_score = goal_ratio * 45
            xg_score = xg_ratio * 35
            xa_score = xa_ratio * 20
            
            base_score = goal_score + xg_score + xa_score
            
        elif position == 'MF':
            # Weights: xA 40%, Goals 35%, xG 25%
            goal_ratio = min(goals_per_90 / bench['goals'], 1.5)
            xg_ratio = min(xg_per_90 / bench['xg'], 1.5)
            xa_ratio = min(xa_per_90 / bench['xa'], 1.5)
            
            goal_score = goal_ratio * 35
            xg_score = xg_ratio * 25
            xa_score = xa_ratio * 40
            
            base_score = goal_score + xg_score + xa_score
            
        else:  # DF
            # Weights: xA 45%, Goals 30%, xG 25%
            goal_ratio = min(goals_per_90 / bench['goals'], 2.0)
            xg_ratio = min(xg_per_90 / bench['xg'], 1.5)
            xa_ratio = min(xa_per_90 / bench['xa'], 1.5)
            
            goal_score = goal_ratio * 30
            xg_score = xg_ratio * 25
            xa_score = xa_ratio * 45
            
            base_score = goal_score + xg_score + xa_score
        
        # Volume bonus (for high total goals)
        volume_bonus = self._calculate_volume_bonus(goals, position)
        base_score += volume_bonus
        
        # Efficiency bonus
        efficiency_bonus = self._calculate_efficiency_bonus(goals_per_90, position)
        base_score += efficiency_bonus
        
        # Apply position cap
        position_cap = self.performance_caps.get(position, 85)
        base_score = min(base_score, position_cap)
        
        return base_score
    
    def calculate_confidence_weighted_performance(self, row: pd.Series) -> Tuple[float, float, str]:
        """
        Calculate confidence-weighted performance score.
        Returns: (weighted_score, base_score, confidence_level)
        """
        # Calculate per90 stats
        per90_stats = self.calculate_per90_stats(row)
        
        # Calculate base performance
        base_score = self.calculate_base_performance(row, per90_stats)
        
        # Calculate confidence weight
        matches = row.get('Matches', 0)
        minutes = row.get('Minutes', 0)
        position = row.get('Position', 'FW')
        
        confidence_weight, confidence_level = self.calculate_confidence_weight(matches, minutes, position)
        
        # Calculate baseline expectation (prior)
        baseline = self._calculate_baseline_expectation(row)
        
        # Apply confidence weighting: weighted_score = (confidence * base_score) + ((1 - confidence) * baseline)
        weighted_score = (confidence_weight * base_score) + ((1 - confidence_weight) * baseline)
        
        # Ensure realistic bounds
        weighted_score = min(max(weighted_score, 30), 100)
        
        return weighted_score, base_score, confidence_level
    
    def _calculate_baseline_expectation(self, row: pd.Series) -> float:
        """
        Calculate baseline expectation (prior) for incomplete seasons.
        Based on position, age, and historical averages.
        """
        position = row.get('Position', 'FW')
        age = row.get('Age', 18)
        matches = row.get('Matches', 0)
        
        # Position baselines (average Bundesliga U19 player)
        position_baselines = {
            'FW': 65,
            'MF': 63,
            'DF': 60,
            'GK': 62
        }
        
        baseline = position_baselines.get(position, 65)
        
        # Age adjustment (younger players have higher potential baseline)
        if age <= 16:
            baseline += 10
        elif age <= 17:
            baseline += 7
        elif age <= 18:
            baseline += 5
        elif age <= 19:
            baseline += 3
        elif age <= 20:
            baseline += 1
        
        # If player has some matches, slightly adjust based on performance hints
        if matches > 0:
            goals = row.get('Goals', 0)
            goals_per_match = goals / matches if matches > 0 else 0
            
            if position == 'FW':
                if goals_per_match > 0.3:  # Shows some scoring ability
                    baseline += 5
            elif position == 'MF':
                if goals_per_match > 0.15:
                    baseline += 4
            elif position == 'DF':
                if goals_per_match > 0.08:
                    baseline += 6
        
        return min(max(baseline, 40), 80)
    
    def extract_ml_features(self, row: pd.Series) -> np.ndarray:
        """Extract features for ML model prediction."""
        features = []
        
        # Basic stats
        features.append(row.get('Age', 18))
        features.append(row.get('Matches', 0))
        features.append(row.get('Starts', 0))
        features.append(row.get('Minutes', 0))
        features.append(row.get('Goals', 0))
        
        # Calculate correct GoalsPer90
        minutes = row.get('Minutes', 0)
        goals = row.get('Goals', 0)
        goals_per_90 = (goals / minutes * 90) if minutes > 0 else 0
        features.append(goals_per_90)
        
        features.append(row.get('Assists', 0))
        
        # Calculate AssistsPer90
        assists = row.get('Assists', 0)
        assists_per_90 = (assists / minutes * 90) if minutes > 0 else 0
        features.append(assists_per_90)
        
        # xG and xA (convert per90 to total if needed)
        xg_per_90 = row.get('xGPer90', 0)
        xa_per_90 = row.get('xAPer90', 0)
        xg_total = (xg_per_90 * minutes / 90) if minutes > 0 else 0
        xa_total = (xa_per_90 * minutes / 90) if minutes > 0 else 0
        features.append(xg_total)
        features.append(xa_total)
        
        # Advanced stats (with defaults)
        features.append(row.get('Shots', 0))
        features.append(row.get('ShotsOnTarget', 0))
        features.append(row.get('PassesCompleted', 0))
        features.append(row.get('PassCompletionPct', 75))
        features.append(row.get('ProgressivePasses', 0))
        features.append(row.get('Tackles', 0))
        features.append(row.get('Interceptions', 0))
        features.append(row.get('DribblesCompleted', 0))
        features.append(row.get('Touches', 0))
        
        # Engineered features
        features.append(minutes / row.get('Matches', 1) if row.get('Matches', 0) > 0 else 0)
        features.append(goals / row.get('Matches', 1) if row.get('Matches', 0) > 0 else 0)
        features.append(row.get('Starts', 0) / row.get('Matches', 1) if row.get('Matches', 0) > 0 else 0)
        features.append(row.get('PassCompletionPct', 75) / 100.0)
        features.append(goals + assists)
        features.append(row.get('Tackles', 0) + row.get('Interceptions', 0))
        features.append(0)  # PhysicalityScore placeholder
        features.append(minutes / (row.get('Matches', 1) * 90) if row.get('Matches', 0) > 0 else 0)
        features.append(max(0, 25 - row.get('Age', 18)) / 10)
        features.append(0)  # PositionAdjustedRating placeholder
        
        # Position encoding
        position = row.get('Position', 'FW')
        if position == 'FW':
            features.extend([1, 0, 0])
        elif position == 'MF':
            features.extend([0, 1, 0])
        elif position == 'DF':
            features.extend([0, 0, 1])
        else:
            features.extend([0, 0, 0])
        
        # Ensure correct number of features
        if len(features) > 20:
            features = features[:20]
        elif len(features) < 20:
            features.extend([0] * (20 - len(features)))
        
        return np.array(features).reshape(1, -1)
    
    def predict_development_potential(self, row: pd.Series) -> float:
        """Use ML model to predict development potential."""
        if self.model is None or self.scaler is None:
            return self._fallback_development_potential(row)
        
        try:
            features = self.extract_ml_features(row)
            features_scaled = self.scaler.transform(features)
            prediction = self.model.predict(features_scaled)[0]
            return float(np.clip(prediction, 0, 100))
        except Exception as e:
            print(f"⚠️  ML prediction failed: {e}")
            return self._fallback_development_potential(row)
    
    def _fallback_development_potential(self, row: pd.Series) -> float:
        """Fallback when ML model fails."""
        age = row.get('Age', 18)
        matches = row.get('Matches', 0)
        minutes = row.get('Minutes', 0)
        
        if age <= 16:
            age_score = 85
        elif age <= 17:
            age_score = 80
        elif age <= 18:
            age_score = 75
        elif age <= 19:
            age_score = 70
        elif age <= 20:
            age_score = 65
        else:
            age_score = 60
        
        if matches >= 20 and minutes >= 1500:
            consistency_bonus = 10
        elif matches >= 15 and minutes >= 1000:
            consistency_bonus = 7
        elif matches >= 10 and minutes >= 600:
            consistency_bonus = 4
        elif matches >= 5 and minutes >= 300:
            consistency_bonus = 2
        else:
            consistency_bonus = 0
        
        total = age_score + consistency_bonus
        return min(total, 100)
    
    def _calculate_gk_performance(self, row: pd.Series) -> float:
        """Calculate GK performance."""
        save_pct = row.get('SavePercentage', 70.0)
        cs_pct = row.get('CleanSheetPercentage', 20.0)
        ga90 = row.get('GoalsAgainstPer90', 1.5)
        minutes = row.get('Minutes', 0)
        
        if minutes < 180:
            return 40  # Minimum baseline for GK with some minutes
        
        bench = self.elite_benchmarks['GK']
        
        save_score = min((save_pct - 65) / (bench['save_pct'] - 65) * 40, 50)
        save_score = max(save_score, 0)
        
        cs_score = min((cs_pct - 20) / (bench['cs_pct'] - 20) * 30, 40)
        cs_score = max(cs_score, 0)
        
        ga_score = max((1.5 - ga90) / (1.5 - bench['ga90']) * 30, 0)
        ga_score = min(ga_score, 40)
        
        base_score = 30 + save_score + cs_score + ga_score
        
        if minutes >= 1800:
            base_score += 5
        elif minutes >= 900:
            base_score += 3
        
        return min(max(base_score, 40), self.performance_caps['GK'])
    
    def _calculate_volume_bonus(self, goals: int, position: str) -> float:
        """Bonus for high goal volume."""
        if position == 'FW':
            if goals >= 25:
                return 8
            elif goals >= 20:
                return 6
            elif goals >= 15:
                return 4
            elif goals >= 10:
                return 2
            elif goals >= 5:
                return 1
        elif position == 'MF':
            if goals >= 12:
                return 6
            elif goals >= 8:
                return 4
            elif goals >= 5:
                return 2
        elif position == 'DF':
            if goals >= 8:
                return 8
            elif goals >= 5:
                return 5
            elif goals >= 3:
                return 3
        return 0
    
    def _calculate_efficiency_bonus(self, goals_per_90: float, position: str) -> float:
        """Bonus for high efficiency."""
        if position == 'FW':
            if goals_per_90 > 1.0:
                return 5
            elif goals_per_90 > 0.8:
                return 3
            elif goals_per_90 > 0.6:
                return 1
        elif position == 'MF':
            if goals_per_90 > 0.4:
                return 4
            elif goals_per_90 > 0.3:
                return 2
        elif position == 'DF':
            if goals_per_90 > 0.2:
                return 5
            elif goals_per_90 > 0.15:
                return 3
        return 0
    
    def calculate_potential(self, row: pd.Series) -> Dict:
        """
        Calculate HYBRID potential with confidence weighting.
        Returns comprehensive player evaluation.
        """
        # Get ML development potential (30% weight)
        ml_development = self.predict_development_potential(row)
        
        # Get confidence-weighted performance (70% weight)
        weighted_performance, base_performance, confidence = self.calculate_confidence_weighted_performance(row)
        
        # Calculate correct per90 stats for output
        per90_stats = self.calculate_per90_stats(row)
        
        # HYBRID calculation: 70% performance + 30% ML development
        hybrid_potential = (weighted_performance * 0.70) + (ml_development * 0.30)
        
        # Adjust for incomplete seasons (additional penalty for very small samples)
        matches = row.get('Matches', 0)
        sample_penalty = 0
        if matches < 5:
            sample_penalty = -8
            hybrid_potential -= 8
        elif matches < 10:
            sample_penalty = -4
            hybrid_potential -= 4
        elif matches < 15:
            sample_penalty = -2
            hybrid_potential -= 2
        
        # Elite goal scorer bonus (only with sufficient sample)
        elite_bonus = 0
        if matches >= 10:
            elite_bonus = self._calculate_elite_bonus(row, weighted_performance)
            hybrid_potential += elite_bonus
        
        # Apply soft caps
        position = row.get('Position', 'FW')
        if position == 'FW':
            soft_cap = 95
        elif position == 'MF':
            soft_cap = 93
        elif position == 'DF':
            soft_cap = 92
        else:
            soft_cap = 90
        
        if hybrid_potential > soft_cap:
            excess = hybrid_potential - soft_cap
            hybrid_potential = soft_cap + (excess * 0.3)
        
        # Final bounds
        final_potential = min(max(hybrid_potential, 30), 100)
        final_potential = round(final_potential, 1)
        
        # Generate tags
        tags = self._generate_tags(row, weighted_performance, final_potential, ml_development, confidence, matches)
        
        # Calculate age bonus for display
        age_bonus = self._calculate_age_bonus(row.get('Age', 18))
        
        # Calculate playing time score
        playing_time_score = self._calculate_playing_time_score(row)
        
        return {
            'PredictedPotential': final_potential,
            'PerformanceScore': round(weighted_performance, 1),
            'BasePerformanceScore': round(base_performance, 1),
            'MLDevelopmentScore': round(ml_development, 1),
            'PlayingTimeScore': playing_time_score,
            'GoalsPer90': round(per90_stats['goals_per_90'], 3),
            'xGPer90': round(per90_stats['xg_per_90'], 3),
            'xAPer90': round(per90_stats['xa_per_90'], 3),
            'AgeMultiplier': 1.0 + (age_bonus / 100),
            'AgeBonus': age_bonus,
            'Confidence': confidence,
            'EliteBonus': elite_bonus,
            'SamplePenalty': sample_penalty,
            'Tags': tags,
            'Matches': matches,
            'Minutes': row.get('Minutes', 0),
            'ConfidenceWeight': self.calculate_confidence_weight(matches, row.get('Minutes', 0), position)[0]
        }
    
    def _calculate_playing_time_score(self, row: pd.Series) -> float:
        """Calculate playing time score based on minutes and matches."""
        minutes = row.get('Minutes', 0)
        matches = row.get('Matches', 0)
        starts = row.get('Starts', 0)
        
        if matches == 0:
            return 0
        
        # Minutes per match score (max 60)
        avg_minutes = minutes / matches
        if avg_minutes >= 80:
            minutes_score = 60
        elif avg_minutes >= 70:
            minutes_score = 50
        elif avg_minutes >= 60:
            minutes_score = 40
        elif avg_minutes >= 45:
            minutes_score = 30
        elif avg_minutes >= 30:
            minutes_score = 20
        elif avg_minutes >= 15:
            minutes_score = 10
        else:
            minutes_score = 5
        
        # Starts percentage score (max 40)
        start_pct = (starts / matches) * 100 if matches > 0 else 0
        if start_pct >= 90:
            start_score = 40
        elif start_pct >= 75:
            start_score = 30
        elif start_pct >= 50:
            start_score = 20
        elif start_pct >= 25:
            start_score = 10
        else:
            start_score = 5
        
        total_score = minutes_score + start_score
        
        return min(total_score, 100)
    
    def _calculate_elite_bonus(self, row: pd.Series, performance: float) -> float:
        """Bonus for elite performances."""
        goals = row.get('Goals', 0)
        position = row.get('Position', 'FW')
        matches = row.get('Matches', 0)
        
        # Only give elite bonus with sufficient sample
        if matches < 10:
            return 0
        
        if position == 'FW':
            if goals >= 25 and performance >= 75:
                return 6
            elif goals >= 20 and performance >= 70:
                return 4
            elif goals >= 15 and performance >= 65:
                return 3
        elif position == 'MF':
            if goals >= 12 and performance >= 70:
                return 4
            elif goals >= 8 and performance >= 65:
                return 2
        elif position == 'DF':
            if goals >= 8 and performance >= 65:
                return 5
            elif goals >= 5 and performance >= 60:
                return 3
        
        return 0
    
    def _calculate_age_bonus(self, age: int) -> float:
        """Calculate age bonus for display."""
        if age <= 16:
            return 10
        elif age <= 17:
            return 8
        elif age <= 18:
            return 6
        elif age <= 19:
            return 4
        elif age <= 20:
            return 2
        else:
            return 0
    
    def _generate_tags(self, row: pd.Series, performance: float, potential: float, 
                      ml_development: float, confidence: str, matches: int) -> str:
        """Generate tags for player."""
        tags = []
        
        position = row.get('Position', 'FW')
        goals = row.get('Goals', 0)
        age = row.get('Age', 18)
        
        # Sample size warning for low matches
        if matches < 10:
            tags.append("SMALL SAMPLE")
        
        # Potential tags
        if potential >= 90:
            tags.append("ELITE PROSPECT")
        elif potential >= 85:
            tags.append("TOP PROSPECT")
        elif potential >= 80:
            tags.append("PROMISING")
        
        # Performance tags (only if sufficient sample)
        if matches >= 10:
            if performance >= 80:
                tags.append("HIGH PERFORMER")
            elif performance >= 70:
                tags.append("SOLID PERFORMER")
        
        # Goal scoring tags (only if sufficient sample)
        if matches >= 8 and position != 'GK':
            if position == 'FW':
                if goals >= 20:
                    tags.append("PROLIFIC")
                elif goals >= 15:
                    tags.append("GOAL SCORER")
                elif goals >= 10:
                    tags.append("GOAL THREAT")
            elif position == 'MF':
                if goals >= 10:
                    tags.append("GOAL-SCORING MF")
                elif goals >= 5:
                    tags.append("ATTACKING MF")
            elif position == 'DF':
                if goals >= 5:
                    tags.append("GOAL-SCORING DF")
        
        # GK specific tags
        if position == 'GK' and matches >= 5:
            save_pct = row.get('SavePercentage', 70)
            cs_pct = row.get('CleanSheetPercentage', 20)
            if save_pct >= 80:
                tags.append("EXCELLENT SAVER")
            elif save_pct >= 75:
                tags.append("GOOD SAVER")
            if cs_pct >= 35:
                tags.append("CLEAN SHEET SPECIALIST")
            elif cs_pct >= 25:
                tags.append("SOLID DEFENDER")
        
        # ML development tags
        if ml_development >= 80:
            tags.append("HIGH DEVELOPMENT")
        elif ml_development >= 70:
            tags.append("GOOD DEVELOPMENT")
        
        # Age tags
        if age <= 17 and matches >= 5:
            tags.append("YOUNG TALENT")
        elif age <= 16 and matches >= 3:
            tags.append("WONDERKID")
        
        # Confidence tags
        if confidence == "Very Low" and matches < 5:
            tags.append("EARLY OBSERVATION")
        
        if not tags:
            tags.append("DEVELOPING")
        
        return ' | '.join(tags)


def calculate_all_potentials_hybrid(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate potentials using HYBRID system with confidence weighting.
    Returns DataFrame with ALL player potentials (not just top 100).
    """
    print("\n🎯 Calculating HYBRID potentials with Confidence Weighting...")
    print("   • 70%: Confidence-weighted performance")
    print("   • 30%: ML development potential")
    print("   • Fix: Correct goals per 90 calculation")
    print("   • Fix: Incomplete season handling")
    
    # Default model paths
    model_path = os.path.join('saved_models', 'youth_potential_model.pkl')
    scaler_path = os.path.join('saved_models', 'feature_scaler.pkl')
    
    calculator = HybridPerformanceCalculator(model_path, scaler_path)
    
    results = []
    total_players = len(df)
    
    print(f"Processing {total_players} players...")
    
    for idx, row in df.iterrows():
        if idx % 500 == 0 and idx > 0:
            print(f"  Processed {idx}/{total_players} players...")
        
        result = calculator.calculate_potential(row)
        results.append(result)
    
    result_df = pd.DataFrame(results)
    
    # Merge results - check if columns already exist
    for col in result_df.columns:
        if col in df.columns and col not in ['Player', 'Season', 'Club', 'Position']:
            # Remove existing column before adding new one
            df = df.drop(columns=[col])
        df[col] = result_df[col]
    
    print(f"\n✅ Hybrid potentials calculated")
    print(f"   • Total players processed: {len(df)}")
    
    # Filter for players with at least some minutes
    df_valid = df[df['Minutes'] >= 180].copy()
    print(f"   • Players with sufficient minutes (≥180): {len(df_valid)}")
    
    # Get top 100 prospects - FIX: Remove existing 'Rank' column if it exists
    if 'Rank' in df_valid.columns:
        df_valid = df_valid.drop(columns=['Rank'])
    
    df_top_100 = df_valid.sort_values('PredictedPotential', ascending=False).head(100).copy()
    df_top_100.insert(0, 'Rank', range(1, len(df_top_100) + 1))
    
    print(f"   • Top 100 prospects identified")
    
    # Get top 25 per position
    positions = ['FW', 'MF', 'DF', 'GK']
    position_data = {}
    
    for position in positions:
        pos_players = df_valid[df_valid['Position'] == position].copy()
        if len(pos_players) > 0:
            # Remove existing position rank column if it exists
            rank_col = f'{position}_Rank'
            if rank_col in pos_players.columns:
                pos_players = pos_players.drop(columns=[rank_col])
            
            pos_top_25 = pos_players.sort_values('PredictedPotential', ascending=False).head(25).copy()
            pos_top_25.insert(0, rank_col, range(1, len(pos_top_25) + 1))
            position_data[position] = pos_top_25
            print(f"   • Top 25 {position}: {len(pos_top_25)} players")
    
    # Distribution analysis for top 100
    print(f"\n📊 Top 100 Potential Distribution:")
    tiers = [
        ('95+', 95, 100),
        ('90-95', 90, 95),
        ('85-90', 85, 90),
        ('80-85', 80, 85),
        ('75-80', 75, 80),
        ('70-75', 70, 75),
        ('< 70', 0, 70)
    ]
    
    for label, low, high in tiers:
        if high == 100:
            count = (df_top_100['PredictedPotential'] >= low).sum()
        else:
            count = ((df_top_100['PredictedPotential'] >= low) & (df_top_100['PredictedPotential'] < high)).sum()
        
        pct = (count / len(df_top_100)) * 100 if len(df_top_100) > 0 else 0
        print(f"   • {label}: {count} players ({pct:.1f}%)")
    
    return df, df_top_100, position_data


def get_player_progression(df: pd.DataFrame) -> pd.DataFrame:
    """
    Get player progression across seasons (up to 24-25 season).
    Shows potential change from previous season.
    """
    print("\n📈 Calculating player progression across seasons...")
    
    # Filter seasons up to 24-25 (ignore 25-26)
    valid_seasons = [season for season in df['Season'].unique() if '25-26' not in str(season)]
    df_filtered = df[df['Season'].isin(valid_seasons)].copy()
    
    # Sort by player and season order
    df_filtered = df_filtered.sort_values(['Player', 'SeasonOrder'])
    
    # Group by player and calculate progression
    progression_data = []
    
    for player_name, player_group in df_filtered.groupby('Player'):
        player_group = player_group.sort_values('SeasonOrder')
        
        if len(player_group) > 1:
            for i in range(len(player_group)):
                current_season = player_group.iloc[i]
                
                # Get previous season data if available
                prev_potential = None
                potential_change = None
                
                if i > 0:
                    prev_season = player_group.iloc[i-1]
                    prev_potential = prev_season['PredictedPotential']
                    potential_change = current_season['PredictedPotential'] - prev_potential
                
                progression_data.append({
                    'Player': player_name,
                    'Season': current_season['Season'],
                    'SeasonOrder': current_season['SeasonOrder'],
                    'Age': int(current_season['Age']),
                    'Position': current_season.get('Position', 'Unknown'),
                    'Club': current_season.get('Club', 'Unknown'),
                    'Matches': int(current_season['Matches']),
                    'Minutes': int(current_season['Minutes']),
                    'Goals': int(current_season.get('Goals', 0)),
                    'GoalsPer90': round(current_season.get('GoalsPer90', 0), 2),
                    'PredictedPotential': round(current_season['PredictedPotential'], 1),
                    'PerformanceScore': round(current_season.get('PerformanceScore', 0), 1),
                    'Confidence': current_season.get('Confidence', 'Unknown'),
                    'PreviousPotential': round(prev_potential, 1) if prev_potential is not None else None,
                    'PotentialChange': round(potential_change, 1) if potential_change is not None else None,
                    'IsLatestSeason': current_season.get('IsLatestSeason', False)
                })
    
    progression_df = pd.DataFrame(progression_data)
    
    print(f"✅ Player progression calculated for {len(progression_df)} player-seasons")
    print(f"   • Multi-season players: {progression_df['Player'].nunique()}")
    
    return progression_df


def validate_distribution_hybrid(df: pd.DataFrame, season_label: str = "All Seasons") -> bool:
    """Validate distribution for hybrid system."""
    print(f"\n{'='*60}")
    print(f"📊 HYBRID SYSTEM VALIDATION - {season_label}")
    print(f"{'='*60}")
    
    # Check for proper goals per 90 calculation
    print("\n🔍 Goals per 90 Verification:")
    for idx, row in df.head(5).iterrows():
        goals = row.get('Goals', 0)
        minutes = row.get('Minutes', 0)
        calculated_gp90 = (goals / minutes * 90) if minutes > 0 else 0
        reported_gp90 = row.get('GoalsPer90', 0)
        
        if abs(calculated_gp90 - reported_gp90) > 0.01:
            print(f"   ⚠️  Mismatch for {row['Player']}: ")
            print(f"      Calculated: {calculated_gp90:.3f}, Reported: {reported_gp90:.3f}")
        else:
            print(f"   ✓ {row['Player']}: {calculated_gp90:.3f} G/90 ✓")
    
    # Show top prospects by matches
    print(f"\n🏆 Top Prospects by Sample Size:")
    
    # Full season players (20+ matches)
    full_season = df[df['Matches'] >= 20].head(5)
    if len(full_season) > 0:
        print(f"   Full Season (20+ matches):")
        for _, row in full_season.iterrows():
            print(f"      • {row['Player']}: {row['PredictedPotential']:.1f} ({row['Matches']} matches)")
    
    # Partial season players (10-19 matches)
    partial_season = df[(df['Matches'] >= 10) & (df['Matches'] < 20)].head(5)
    if len(partial_season) > 0:
        print(f"   Partial Season (10-19 matches):")
        for _, row in partial_season.iterrows():
            print(f"      • {row['Player']}: {row['PredictedPotential']:.1f} ({row['Matches']} matches)")
    
    # Small sample players (<10 matches)
    small_sample = df[df['Matches'] < 10].head(5)
    if len(small_sample) > 0:
        print(f"   Small Sample (<10 matches):")
        for _, row in small_sample.iterrows():
            print(f"      • {row['Player']}: {row['PredictedPotential']:.1f} ({row['Matches']} matches)")
            if 'SMALL SAMPLE' in row['Tags']:
                print(f"        ⚠️  Tagged: SMALL SAMPLE")
    
    return True


def export_top_prospects_comprehensive(df_all: pd.DataFrame, df_top_100: pd.DataFrame, 
                                      position_data: dict, progression_df: pd.DataFrame, 
                                      output_path: str = None) -> str:
    """
    Export comprehensive analysis to Excel.
    Includes: Top 100, Top 25 per position, All Seasons data, Player Progression.
    """
    if output_path is None:
        output_path = os.path.join('outputs', 'bundesliga_comprehensive_analysis.xlsx')
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    print(f"\n💾 Exporting comprehensive analysis to Excel...")
    
    # Create Excel writer
    with pd.ExcelWriter(output_path, engine='openpyxl') as writer:
        # Sheet 1: Top 100 Prospects
        print("  📊 Creating Sheet 1: Top 100 Prospects...")
        top_100_cols = [
            'Rank', 'Player', 'Age', 'Position', 'Club', 'Season',
            'PredictedPotential', 'PerformanceScore', 'PlayingTimeScore',
            'Confidence', 'Tags', 'AgeMultiplier', 'AgeBonus', 'EliteBonus', 'SamplePenalty',
            'Matches', 'Goals', 'Assists', 'GoalsPer90', 'xGPer90', 'xAPer90', 'Minutes'
        ]
        
        # Add GK-specific columns if available
        if 'SavePercentage' in df_top_100.columns:
            top_100_cols.extend(['SavePercentage', 'CleanSheetPercentage', 'GoalsAgainstPer90'])
        
        # Filter to available columns
        available_cols = [col for col in top_100_cols if col in df_top_100.columns]
        df_top_100[available_cols].to_excel(writer, sheet_name='Top 100 Prospects', index=False)
        
        # Sheet 2-5: Top 25 by Position (FW, MF, DF, GK)
        positions = ['FW', 'MF', 'DF', 'GK']
        for position in positions:
            print(f"  📊 Creating Sheet: Top 25 {position}...")
            if position in position_data:
                pos_df = position_data[position]
                
                # Select columns for position sheet
                pos_cols = [
                    f'{position}_Rank', 'Player', 'Age', 'Club', 'Season',
                    'PredictedPotential', 'PerformanceScore', 'PlayingTimeScore',
                    'Confidence', 'Tags', 'Matches', 'Minutes'
                ]
                
                # Add position-specific stats
                if position != 'GK':
                    pos_cols.extend(['Goals', 'Assists', 'GoalsPer90', 'xGPer90', 'xAPer90'])
                else:
                    pos_cols.extend(['SavePercentage', 'CleanSheetPercentage', 'GoalsAgainstPer90'])
                
                available_pos_cols = [col for col in pos_cols if col in pos_df.columns]
                sheet_name = f'Top 25 {position}'
                # Truncate sheet name if too long
                if len(sheet_name) > 31:
                    sheet_name = sheet_name[:31]
                pos_df[available_pos_cols].to_excel(writer, sheet_name=sheet_name, index=False)
            else:
                print(f"  ⚠️  No data for position: {position}")
        
        # Sheet 6: All Seasons Data
        print("  📊 Creating Sheet 6: All Seasons Data...")
        all_seasons_cols = [
            'Player', 'Season', 'SeasonOrder', 'IsLatestSeason', 'Age', 'Position', 'Club',
            'PredictedPotential', 'PerformanceScore', 'PlayingTimeScore',
            'Confidence', 'Tags', 'AgeMultiplier', 'AgeBonus',
            'Matches', 'Starts', 'Minutes', 'Goals', 'Assists', 
            'GoalsPer90', 'xGPer90', 'xAPer90'
        ]
        
        # Add GK-specific columns
        if 'SavePercentage' in df_all.columns:
            all_seasons_cols.extend(['SavePercentage', 'CleanSheetPercentage', 'GoalsAgainstPer90'])
        
        available_all_cols = [col for col in all_seasons_cols if col in df_all.columns]
        
        df_all_sorted = df_all.sort_values(['Player', 'SeasonOrder'], ascending=[True, False])
        df_all_sorted[available_all_cols].to_excel(writer, sheet_name='All Seasons Data', index=False)
        
        # Sheet 7: Player Progression
        print("  📊 Creating Sheet 7: Player Progression...")
        if len(progression_df) > 0:
            progression_cols = [
                'Player', 'Season', 'Age', 'Position', 'Club',
                'PredictedPotential', 'PerformanceScore', 'Confidence',
                'PreviousPotential', 'PotentialChange',
                'Matches', 'Minutes', 'Goals', 'GoalsPer90',
                'IsLatestSeason'
            ]
            
            available_prog_cols = [col for col in progression_cols if col in progression_df.columns]
            progression_df[available_prog_cols].to_excel(writer, sheet_name='Player Progression', index=False)
        else:
            print("  ⚠️  No progression data available")
        
        # Sheet 8: Summary Statistics
        print("  📊 Creating Sheet 8: Summary Statistics...")
        summary_data = []
        
        # Overall summary
        summary_data.append({
            'Metric': 'Total Players Analyzed',
            'Value': len(df_all),
            'Details': 'All player-season combinations'
        })
        
        summary_data.append({
            'Metric': 'Unique Players',
            'Value': df_all['Player'].nunique(),
            'Details': 'Players across all seasons'
        })
        
        summary_data.append({
            'Metric': 'Multi-Season Players',
            'Value': (df_all.groupby('Player')['Season'].nunique() > 1).sum(),
            'Details': 'Players with data in multiple seasons'
        })
        
        # Position distribution
        position_counts = df_all['Position'].value_counts()
        for position, count in position_counts.items():
            summary_data.append({
                'Metric': f'{position} Players',
                'Value': count,
                'Details': f'{position} position players'
            })
        
        # Potential distribution
        potential_ranges = [
            ('90+ Elite', 90, 101),
            ('85-89 Top', 85, 90),
            ('80-84 Promising', 80, 85),
            ('75-79 Good', 75, 80),
            ('70-74 Average', 70, 75),
            ('<70 Developing', 0, 70)
        ]
        
        for label, low, high in potential_ranges:
            if high == 101:
                count = (df_all['PredictedPotential'] >= low).sum()
            else:
                count = ((df_all['PredictedPotential'] >= low) & (df_all['PredictedPotential'] < high)).sum()
            
            summary_data.append({
                'Metric': f'Potential {label}',
                'Value': count,
                'Details': f'Players with potential {label}'
            })
        
        # GK-specific summary
        if 'GK' in df_all['Position'].values:
            gk_df = df_all[df_all['Position'] == 'GK']
            if len(gk_df) > 0:
                summary_data.append({
                    'Metric': 'Top GK Potential',
                    'Value': round(gk_df['PredictedPotential'].max(), 1),
                    'Details': 'Highest potential among goalkeepers'
                })
                
                summary_data.append({
                    'Metric': 'Avg GK Save %',
                    'Value': round(gk_df['SavePercentage'].mean(), 1),
                    'Details': 'Average save percentage for goalkeepers'
                })
        
        summary_df = pd.DataFrame(summary_data)
        summary_df.to_excel(writer, sheet_name='Summary Statistics', index=False)
        
        # Sheet 9: Season Comparison
        print("  📊 Creating Sheet 9: Season Comparison...")
        season_stats = []
        
        for season in sorted(df_all['Season'].unique()):
            season_df = df_all[df_all['Season'] == season]
            
            season_stats.append({
                'Season': season,
                'Players': len(season_df),
                'Avg Potential': round(season_df['PredictedPotential'].mean(), 1),
                'Max Potential': round(season_df['PredictedPotential'].max(), 1),
                'Avg Age': round(season_df['Age'].mean(), 1),
                'Avg Matches': round(season_df['Matches'].mean(), 1),
                'Total Goals': int(season_df['Goals'].sum()),
                'Elite Players (90+)': (season_df['PredictedPotential'] >= 90).sum(),
                'Top Prospects (85+)': (season_df['PredictedPotential'] >= 85).sum()
            })
        
        season_df = pd.DataFrame(season_stats)
        season_df.to_excel(writer, sheet_name='Season Comparison', index=False)
    
    print(f"\n✅ Comprehensive analysis exported: {output_path}")
    print(f"   • Sheet 1: Top 100 Prospects")
    print(f"   • Sheet 2-5: Top 25 by Position (FW, MF, DF, GK)")
    print(f"   • Sheet 6: All Seasons Data")
    print(f"   • Sheet 7: Player Progression (with potential changes)")
    print(f"   • Sheet 8: Summary Statistics")
    print(f"   • Sheet 9: Season Comparison")
    
    return output_path