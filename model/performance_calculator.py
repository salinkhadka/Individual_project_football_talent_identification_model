"""
ML-First Performance Calculator - ACADEMIC THESIS VERSION - FIXED
==================================================================
FIXED ISSUES:
1. Fixed scaler loading with joblib (not pickle)
2. ML model is PRIMARY predictor (not heuristic override)
3. xG/xA are first-class features (practical, per-90)
4. Goal bonuses reduced and capped (no instability)
"""

import pandas as pd
import numpy as np
from typing import Dict, Optional
import joblib  # CHANGED: Using joblib instead of pickle
import os


class MLFirstEvaluator:
    """
    ML-first evaluation system with bounded heuristic adjustments.
    
    Architecture:
    1. ML Model predicts base potential (60-100 range)
    2. Small adjustments for:
       - Age bonus (±3)
       - Confidence penalty (±2)
    3. Total adjustment capped at ±5
    """
    
    def __init__(self, model_path: str = None, scaler_path: str = None):
        """
        Initialize with trained ML model.
        
        Args:
            model_path: Path to trained XGBoost model
            scaler_path: Path to fitted scaler
        """
        self.model = None
        self.scaler = None
        
        # Load ML artifacts
        if model_path and os.path.exists(model_path):
            try:
                # CHANGED: Use joblib.load instead of pickle
                self.model = joblib.load(model_path)
                print(f"✓ ML model loaded from {model_path}")
            except Exception as e:
                print(f"⚠️  ML model failed to load: {e}")
                print("   Using fallback heuristic only")
        else:
            print("⚠️  ML model not found - using fallback heuristic")
        
        if scaler_path and os.path.exists(scaler_path):
            try:
                # CHANGED: Use joblib.load instead of pickle
                self.scaler = joblib.load(scaler_path)
                print(f"✓ Scaler loaded from {scaler_path}")
            except Exception as e:
                print(f"⚠️  Scaler failed to load: {e}")
                print("   Will scale features manually")
        else:
            print("⚠️  Scaler not found")
        
        # FIXED: Reduced goal multipliers (academic justification below)
        self.position_goal_multiplier = {
            'FW': 1.0,   # Baseline (unchanged)
            'MF': 1.15,  # REDUCED from 1.4 → 1.15 (15% bonus, not 40%)
            'DF': 1.25,  # REDUCED from 2.0 → 1.25 (25% bonus, not 100%)
            'GK': 1.30   # REDUCED from 3.0 → 1.30 (30% bonus, not 200%)
        }
        
        # ML feature list (must match training)
        self.ml_features = [
            # Basic stats
            'Age', 'Matches', 'Minutes', 'Goals', 'Assists',
            
            # Rate-based (key predictors) - xG/xA are PRIMARY
            'GoalsPer90', 'AssistsPer90', 'xGPer90', 'xAPer90',
            
            # Expected vs Actual
            'xG', 'xA',
            
            # Advanced metrics
            'ShotsPer90', 'KeyPassesPer90', 'DribblesPer90',
            'TacklesPer90', 'ProgressivePassesPer90',
            
            # Encoded position (one-hot or ordinal)
            'Position_FW', 'Position_MF', 'Position_DF', 'Position_GK'
        ]
        
        # Confidence adjustments (small, bounded)
        self.confidence_adjustment = {
            'Very High': +2,
            'High': +1,
            'Medium': 0,
            'Low': -1,
            'No Data': -2
        }
    
    def calculate_performance_score(self, row: pd.Series) -> float:
        """
        EXPLANATORY metric only - NOT used for final ranking.
        
        This is for scouting reports and interpretation.
        
        Args:
            row: Player data
            
        Returns:
            Performance score (0-100, explanatory only)
        """
        position = row.get('Position', 'MF')
        
        if position == 'GK':
            return self._calculate_gk_performance(row)
        
        # Outfield performance (rate-based) - xG/xA as PRIMARY
        goals_per_90 = row.get('GoalsPer90', 0)
        xg_per_90 = row.get('xGPer90', 0)
        xa_per_90 = row.get('xAPer90', 0)
        minutes = row.get('Minutes', 0)
        
        if minutes < 90:
            return 0
        
        # Position benchmarks (elite level ≈ 85 score)
        # CHANGED: xG/xA weight increased, goal weight decreased
        benchmarks = {
            'FW': {'xg': 0.50, 'xa': 0.25, 'goals': 0.60},
            'MF': {'xg': 0.20, 'xa': 0.30, 'goals': 0.25},
            'DF': {'xg': 0.06, 'xa': 0.12, 'goals': 0.08}
        }
        
        bench = benchmarks.get(position, benchmarks['MF'])
        
        # FIXED: Goal multiplier applied with DIMINISHING RETURNS
        goal_mult = self.position_goal_multiplier.get(position, 1.0)
        
        # Diminishing returns: log(1 + minutes/1000) caps at ~1.4x for 3000 min
        minutes_factor = np.log1p(minutes / 1000.0)
        capped_mult = 1.0 + (goal_mult - 1.0) * min(minutes_factor, 1.0)
        
        # Weighted combination (xG/xA FIRST-CLASS, goals secondary)
        # CHANGED: xG 40%, xA 35%, goals 25%
        xg_component = (xg_per_90 / bench['xg']) * 40 if bench['xg'] > 0 else 0
        xa_component = (xa_per_90 / bench['xa']) * 35 if bench['xa'] > 0 else 0
        goal_component = (goals_per_90 / bench['goals']) * 25 * capped_mult
        
        score = xg_component + xa_component + goal_component
        
        return np.clip(score, 0, 100)
    
    def _calculate_gk_performance(self, row: pd.Series) -> float:
        """GK performance (explanatory only)."""
        save_pct = row.get('SavePercentage', 70.0)
        cs_pct = row.get('CleanSheetPercentage', 20.0)
        ga90 = row.get('GoalsAgainstPer90', 1.2)
        
        # Baseline: 70% saves = 50 points
        save_component = (save_pct - 70) * 2.0
        cs_component = (cs_pct - 20) * 1.2
        ga_component = (1.2 - ga90) * 25
        
        score = 50 + save_component + cs_component + ga_component
        
        return np.clip(score, 0, 100)
    
    def prepare_ml_features(self, row: pd.Series) -> np.ndarray:
        """
        Prepare feature vector for ML model.
        
        Args:
            row: Player data
            
        Returns:
            Feature array matching training schema
        """
        features = []
        
        # Basic stats
        features.extend([
            row.get('Age', 18),
            row.get('Matches', 0),
            row.get('Minutes', 0),
            row.get('Goals', 0),
            row.get('Assists', 0)
        ])
        
        # Rate-based (CRITICAL) - xG/xA as PRIMARY
        features.extend([
            row.get('GoalsPer90', 0),
            row.get('AssistsPer90', 0),
            row.get('xGPer90', 0),
            row.get('xAPer90', 0)
        ])
        
        # Expected totals
        features.extend([
            row.get('xG', 0),
            row.get('xA', 0)
        ])
        
        # Advanced
        features.extend([
            row.get('ShotsPer90', 0),
            row.get('KeyPassesPer90', 0),
            row.get('DribblesPer90', 0),
            row.get('TacklesPer90', 0),
            row.get('ProgressivePassesPer90', 0)
        ])
        
        # Position encoding (one-hot)
        position = row.get('Position', 'MF')
        features.extend([
            1 if position == 'FW' else 0,
            1 if position == 'MF' else 0,
            1 if position == 'DF' else 0,
            1 if position == 'GK' else 0
        ])
        
        return np.array(features).reshape(1, -1)
    
    def predict_with_ml(self, row: pd.Series) -> float:
        """
        PRIMARY prediction using ML model.
        
        Args:
            row: Player data
            
        Returns:
            ML-predicted potential (60-100)
        """
        if self.model is None or self.scaler is None:
            # Fallback: use rate-based xG/xA estimate
            return self._fallback_prediction(row)
        
        try:
            # Prepare features
            X = self.prepare_ml_features(row)
            
            # Scale features
            X_scaled = self.scaler.transform(X)
            
            # Predict
            prediction = self.model.predict(X_scaled)[0]
            
            # Ensure reasonable range
            return np.clip(prediction, 60, 100)
            
        except Exception as e:
            print(f"⚠️  ML prediction failed: {e}")
            return self._fallback_prediction(row)
    
    def _fallback_prediction(self, row: pd.Series) -> float:
        """
        Fallback when ML model unavailable.
        Uses rate-based metrics (xG/xA PRIMARY, not goal volume).
        
        Args:
            row: Player data
            
        Returns:
            Estimated potential
        """
        position = row.get('Position', 'MF')
        
        if position == 'GK':
            base = self._calculate_gk_performance(row)
        else:
            # Use xG/xA per 90 as primary signal (FIXED)
            xg_per_90 = row.get('xGPer90', 0)
            xa_per_90 = row.get('xAPer90', 0)
            minutes = row.get('Minutes', 0)
            
            # Position benchmarks
            if position == 'FW':
                bench_xg, bench_xa = 0.50, 0.25
            elif position == 'MF':
                bench_xg, bench_xa = 0.20, 0.30
            else:  # DF
                bench_xg, bench_xa = 0.06, 0.12
            
            # Score based on xG/xA (primary) with small goal adjustment
            xg_score = (xg_per_90 / bench_xg) * 50 if bench_xg > 0 else 0
            xa_score = (xa_per_90 / bench_xa) * 40 if bench_xa > 0 else 0
            
            # Add small goal bonus (capped)
            goals_per_90 = row.get('GoalsPer90', 0)
            goal_mult = self.position_goal_multiplier.get(position, 1.0)
            goal_bonus = min(goals_per_90 * 5 * goal_mult, 10)  # Max 10 points
            
            # Minutes factor (0.6 to 1.0)
            min_factor = 0.6 + (min(minutes, 2000) / 2000) * 0.4
            
            base = (xg_score + xa_score + goal_bonus) * min_factor
        
        return np.clip(base + 60, 60, 95)  # 60-95 range for fallback
    
    def calculate_bounded_adjustments(self, row: pd.Series) -> Dict[str, float]:
        """
        Calculate small, bounded adjustments to ML prediction.
        
        CRITICAL: Total adjustment capped at ±5
        
        Args:
            row: Player data
            
        Returns:
            Dictionary of adjustment components
        """
        adjustments = {}
        
        # Age bonus (0 to +3)
        age = row.get('Age', 18)
        age_bonus = max(21 - age, 0) * 1.0  # 18yo=+3, 19yo=+2, 20yo=+1, 21+=0
        adjustments['age'] = min(age_bonus, 3)
        
        # Confidence adjustment (-2 to +2)
        confidence = self._calculate_confidence_level(row)
        adjustments['confidence'] = self.confidence_adjustment.get(confidence, 0)
        
        # CRITICAL: Cap total adjustment
        total = adjustments['age'] + adjustments['confidence']
        if abs(total) > 5:
            scale_factor = 5.0 / abs(total)
            adjustments['age'] *= scale_factor
            adjustments['confidence'] *= scale_factor
        
        adjustments['total'] = adjustments['age'] + adjustments['confidence']
        adjustments['capped'] = abs(adjustments['total']) <= 5
        
        return adjustments
    
    def _calculate_confidence_level(self, row: pd.Series) -> str:
        """Calculate confidence based on sample size."""
        matches = row.get('Matches', 0)
        minutes = row.get('Minutes', 0)
        starts = row.get('Starts', 0)
        
        if matches >= 20 and minutes >= 1500 and starts >= 15:
            return "Very High"
        elif matches >= 12 and minutes >= 900 and starts >= 8:
            return "High"
        elif matches >= 6 and minutes >= 400 and starts >= 3:
            return "Medium"
        else:
            return "Low"
    
    def calculate_predicted_potential(self, row: pd.Series) -> Dict[str, float]:
        """
        MAIN PREDICTION METHOD - ML-First Architecture
        
        Formula:
        PredictedPotential = ML_Prediction + BoundedAdjustments
        
        Where BoundedAdjustments ∈ [-5, +5]
        
        Args:
            row: Player data
            
        Returns:
            Dictionary with prediction breakdown
        """
        # Step 1: ML prediction (PRIMARY)
        ml_prediction = self.predict_with_ml(row)
        
        # Step 2: Calculate bounded adjustments
        adjustments = self.calculate_bounded_adjustments(row)
        
        # Step 3: Final potential
        final_potential = ml_prediction + adjustments['total']
        
        # Step 4: Apply position-specific caps (prevent outliers)
        position = row.get('Position', 'MF')
        position_caps = {'FW': 98, 'MF': 96, 'DF': 94, 'GK': 92}
        cap = position_caps.get(position, 96)
        
        final_potential = np.clip(final_potential, 60, cap)
        
        # Return breakdown
        return {
            'ml_base': ml_prediction,
            'age_adj': adjustments['age'],
            'conf_adj': adjustments['confidence'],
            'total_adj': adjustments['total'],
            'final': final_potential,
            'capped': adjustments['capped']
        }
    
    def generate_context_tags(self, row: pd.Series) -> str:
        """Generate interpretive tags."""
        tags = []
        
        position = row.get('Position', 'MF')
        matches = row.get('Matches', 0)
        
        if matches < 3:
            tags.append("Small Sample")
            return ' | '.join(tags)
        
        # FIXED: Use xG/xA for tags, not just goals
        xg_per_90 = row.get('xGPer90', 0)
        xa_per_90 = row.get('xAPer90', 0)
        
        if position == 'GK':
            save_pct = row.get('SavePercentage', 0)
            if save_pct >= 75:
                tags.append("Shot-Stopper")
        else:
            # Position-adjusted thresholds based on xG/xA
            if position == 'FW':
                if xg_per_90 >= 0.70:
                    tags.append("Elite Finisher")
                elif xg_per_90 >= 0.50:
                    tags.append("Strong Finisher")
                    
                if xa_per_90 >= 0.30:
                    tags.append("Creative Forward")
            elif position == 'MF':
                if xg_per_90 >= 0.30:
                    tags.append("Goal Threat")
                elif xg_per_90 >= 0.20:
                    tags.append("Attacking MF")
                    
                if xa_per_90 >= 0.35:
                    tags.append("Playmaker")
                elif xa_per_90 >= 0.25:
                    tags.append("Creative MF")
            else:  # DF
                if xg_per_90 >= 0.10:
                    tags.append("Attacking Defender")
                if xa_per_90 >= 0.15:
                    tags.append("Playmaking DF")
        
        # Weak team context
        if self._is_weak_team(row):
            if xg_per_90 > 0.40 or xa_per_90 > 0.25:
                tags.append("Carrying Team")
        
        return ' | '.join(tags) if tags else 'Developing'
    
    def _is_weak_team(self, row: pd.Series) -> bool:
        """Determine if team is weak (2 of 3 criteria)."""
        criteria_met = 0
        
        ppm = row.get('PointsPerMatch', 1.5)
        if pd.notna(ppm) and ppm < 1.1:
            criteria_met += 1
        
        goal_diff = row.get('GoalDifference', 0)
        if pd.notna(goal_diff) and goal_diff < 0:
            criteria_met += 1
        
        goal_diff_90 = row.get('GoalDifferencePer90', 0)
        if pd.notna(goal_diff_90) and goal_diff_90 < -0.25:
            criteria_met += 1
        
        return criteria_met >= 2
    
    def evaluate_player(self, row: pd.Series) -> Dict:
        """
        Complete evaluation for single player-season.
        
        Args:
            row: Player data with xG/xA already calculated
            
        Returns:
            Evaluation results
        """
        # Performance score (explanatory only)
        performance_score = self.calculate_performance_score(row)
        
        # ML prediction + adjustments
        prediction_breakdown = self.calculate_predicted_potential(row)
        
        # Metadata
        confidence = self._calculate_confidence_level(row)
        tags = self.generate_context_tags(row)
        
        return {
            'PredictedPotential': prediction_breakdown['final'],
            'MLBasePrediction': prediction_breakdown['ml_base'],
            'AgeAdjustment': prediction_breakdown['age_adj'],
            'ConfidenceAdjustment': prediction_breakdown['conf_adj'],
            'TotalAdjustment': prediction_breakdown['total_adj'],
            'AdjustmentCapped': prediction_breakdown['capped'],
            'PerformanceScore': performance_score,
            'Confidence': confidence,
            'Tags': tags,
            'SmallSamplePenalty': row.get('Matches', 0) < 3
        }


def calculate_all_potentials(df: pd.DataFrame, 
                             model_path: str = './saved_models/potential_predictor.pkl',
                             scaler_path: str = './saved_models/feature_scaler.pkl') -> pd.DataFrame:
    """
    Calculate ML-first potentials for all players.
    
    CRITICAL: This now uses ML model as primary predictor.
    
    Args:
        df: DataFrame with xG/xA already calculated
        model_path: Path to trained model
        scaler_path: Path to scaler
        
    Returns:
        DataFrame with predictions
    """
    evaluator = MLFirstEvaluator(model_path, scaler_path)
    
    results = []
    total_players = len(df)
    print(f"\n🎯 Predicting potential for {total_players} players...")
    
    for idx, row in df.iterrows():
        if idx % 500 == 0:
            print(f"   Processed {idx}/{total_players} players...")
        
        result = evaluator.evaluate_player(row)
        results.append(result)
    
    result_df = pd.DataFrame(results)
    
    # Add columns to df
    for col in result_df.columns:
        df[col] = result_df[col]
    
    return df


def validate_distribution(df: pd.DataFrame, season_label: str = "All") -> bool:
    """Validate score distribution."""
    total = len(df[df['Minutes'] > 0])
    
    if total == 0:
        return True
    
    # Count tiers
    tier_95_plus = (df['PredictedPotential'] >= 95).sum()
    tier_90_95 = ((df['PredictedPotential'] >= 90) & (df['PredictedPotential'] < 95)).sum()
    tier_85_90 = ((df['PredictedPotential'] >= 85) & (df['PredictedPotential'] < 90)).sum()
    tier_80_85 = ((df['PredictedPotential'] >= 80) & (df['PredictedPotential'] < 85)).sum()
    
    pct_95_plus = (tier_95_plus / total) * 100
    pct_90_95 = (tier_90_95 / total) * 100
    pct_85_90 = (tier_85_90 / total) * 100
    pct_80_85 = (tier_80_85 / total) * 100
    
    print(f"\n{'='*60}")
    print(f"📊 SCORE DISTRIBUTION - {season_label}")
    print(f"{'='*60}")
    print(f"  95+:     {tier_95_plus:4d} ({pct_95_plus:5.1f}%)")
    print(f"  90-95:   {tier_90_95:4d} ({pct_90_95:5.1f}%)")
    print(f"  85-90:   {tier_85_90:4d} ({pct_85_90:5.1f}%)")
    print(f"  80-85:   {tier_80_85:4d} ({pct_80_85:5.1f}%)")
    print(f"{'='*60}")
    
    # Check distribution is reasonable
    if pct_95_plus > 2:
        print("⚠️  Warning: More than 2% of players rated 95+")
    if pct_90_95 > 10:
        print("⚠️  Warning: More than 10% of players rated 90-95")
    
    return True