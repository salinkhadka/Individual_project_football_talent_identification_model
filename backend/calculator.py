"""
Potential Calculator - Recalculate player potential on demand
Uses the same logic from performance_calculator_fixed.py
"""
import numpy as np
import joblib
import os
from typing import Dict, Tuple

# Feature groups for ML model (synchronized with model/config_new.py)
CORE_FEATURES = [
    'Age', 'Matches', 'Starts', 'Minutes', 'Goals', 'GoalsPer90',
    'Assists', 'AssistsPer90', 'xG', 'xA', 'Shots', 'ShotsOnTarget',
    'PassesCompleted', 'PassCompletionPct', 'ProgressivePasses',
    'Tackles', 'Interceptions', 'DribblesCompleted', 'Touches'
]

ENGINEERED_FEATURES = [
    'MinutesPerMatch', 'GoalsPerMatch', 'StartPercentage',
    'CompletionRate', 'AttackingContribution', 'DefensiveContribution',
    'PhysicalityScore', 'ConsistencyScore', 'AgeBonus',
    'PositionAdjustedRating'
]


class PotentialCalculator:
    """Calculate player potential using hybrid model"""
    
    def __init__(self, model_path: str = None, scaler_path: str = None):
        # Load ML model and scaler
        self.model = None
        self.scaler = None
        
        # Point to the correct model names from config_new.py
        if model_path is None:
            model_path = os.path.join('..', 'model', 'saved_models', 'potential_predictor.pkl')
        if scaler_path is None:
            scaler_path = os.path.join('..', 'model', 'saved_models', 'feature_scaler.pkl')
        
        # Try to load model
        if os.path.exists(model_path):
            try:
                self.model = joblib.load(model_path)
                print(f"✓ ML model loaded from {model_path}")
            except Exception as e:
                print(f"⚠️  ML model failed to load: {e}")
        else:
            print(f"❌ Model file NOT FOUND: {model_path}")
        
        if os.path.exists(scaler_path):
            try:
                self.scaler = joblib.load(scaler_path)
                print(f"✓ Scaler loaded from {scaler_path}")
            except Exception as e:
                print(f"⚠️  Scaler failed to load: {e}")
        else:
            print(f"❌ Scaler file NOT FOUND: {scaler_path}")
        
        # Benchmarks (same as in performance_calculator_fixed.py)
        self.elite_benchmarks = {
            'FW': {'goals': 0.65, 'xg': 0.60, 'xa': 0.25, 'full_season_matches': 22},
            'MF': {'goals': 0.25, 'xg': 0.22, 'xa': 0.30, 'full_season_matches': 24},
            'DF': {'goals': 0.10, 'xg': 0.08, 'xa': 0.15, 'full_season_matches': 24},
            'GK': {'save_pct': 78, 'cs_pct': 35, 'ga90': 0.8, 'full_season_matches': 22}
        }
        
        self.performance_caps = {'FW': 85, 'MF': 83, 'DF': 80, 'GK': 82}
    
    def calculate_potential(self, player_data: Dict) -> Dict:
        """
        Recalculate potential for a player
        
        Args:
            player_data: Dict with player stats (from database)
        
        Returns:
            Dict with recalculated scores
        """
        # Get ML development score
        ml_development = self._predict_development_potential(player_data)
        
        # Calculate performance scores
        weighted_performance, base_performance, confidence = self._calculate_performance(player_data)
        
        # Hybrid potential: 70% performance + 30% ML development
        hybrid_potential = (weighted_performance * 0.70) + (ml_development * 0.30)
        
        # Sample penalty
        matches = player_data.get('matches', 0)
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
        
        # Elite bonus
        elite_bonus = 0
        if matches >= 10:
            elite_bonus = self._calculate_elite_bonus(player_data, weighted_performance)
            hybrid_potential += elite_bonus
        
        # Apply caps
        position = player_data.get('position', 'FW')
        soft_cap = {'FW': 95, 'MF': 93, 'DF': 92, 'GK': 90}.get(position, 92)
        
        if hybrid_potential > soft_cap:
            excess = hybrid_potential - soft_cap
            hybrid_potential = soft_cap + (excess * 0.3)
        
        # Final bounds
        final_potential = min(max(hybrid_potential, 30), 100)
        
        return {
            'predicted_potential': round(final_potential, 1),
            'performance_score': round(weighted_performance, 1),
            'base_performance_score': round(base_performance, 1),
            'ml_development_score': round(ml_development, 1),
            'confidence': confidence,
            'elite_bonus': elite_bonus,
            'sample_penalty': sample_penalty
        }
    
    def _calculate_performance(self, player_data: Dict) -> Tuple[float, float, str]:
        """Calculate confidence-weighted performance"""
        position = player_data.get('position', 'FW')
        
        if position == 'GK':
            base_score = self._calculate_gk_performance(player_data)
        else:
            base_score = self._calculate_outfield_performance(player_data)
        
        # Confidence weight
        matches = player_data.get('matches', 0)
        minutes = player_data.get('minutes', 0)
        confidence_weight, confidence_level = self._calculate_confidence_weight(matches, minutes, position)
        
        # Baseline expectation
        baseline = self._calculate_baseline_expectation(player_data)
        
        # Weighted score
        weighted_score = (confidence_weight * base_score) + ((1 - confidence_weight) * baseline)
        weighted_score = min(max(weighted_score, 30), 100)
        
        return weighted_score, base_score, confidence_level
    
    def _calculate_outfield_performance(self, player_data: Dict) -> float:
        """Calculate performance for outfield players"""
        position = player_data.get('position', 'FW')
        goals_per_90 = player_data.get('goals_per_90', 0) or 0
        xg_per_90 = player_data.get('xg_per_90', 0) or 0
        xa_per_90 = player_data.get('xa_per_90', 0) or 0
        goals = player_data.get('goals', 0) or 0
        
        bench = self.elite_benchmarks.get(position, self.elite_benchmarks['FW'])
        
        if position == 'FW':
            goal_ratio = min(goals_per_90 / bench['goals'], 1.5) if bench['goals'] > 0 else 0
            xg_ratio = min(xg_per_90 / bench['xg'], 1.5) if bench['xg'] > 0 else 0
            xa_ratio = min(xa_per_90 / bench['xa'], 1.5) if bench['xa'] > 0 else 0
            
            base_score = (goal_ratio * 45) + (xg_ratio * 35) + (xa_ratio * 20)
            
        elif position == 'MF':
            goal_ratio = min(goals_per_90 / bench['goals'], 1.5) if bench['goals'] > 0 else 0
            xg_ratio = min(xg_per_90 / bench['xg'], 1.5) if bench['xg'] > 0 else 0
            xa_ratio = min(xa_per_90 / bench['xa'], 1.5) if bench['xa'] > 0 else 0
            
            base_score = (goal_ratio * 35) + (xg_ratio * 25) + (xa_ratio * 40)
            
        else:  # DF
            goal_ratio = min(goals_per_90 / bench['goals'], 2.0) if bench['goals'] > 0 else 0
            xg_ratio = min(xg_per_90 / bench['xg'], 1.5) if bench['xg'] > 0 else 0
            xa_ratio = min(xa_per_90 / bench['xa'], 1.5) if bench['xa'] > 0 else 0
            
            base_score = (goal_ratio * 30) + (xg_ratio * 25) + (xa_ratio * 45)
        
        # Bonuses
        base_score += self._calculate_volume_bonus(goals, position)
        base_score += self._calculate_efficiency_bonus(goals_per_90, position)
        
        # Cap
        position_cap = self.performance_caps.get(position, 85)
        return min(base_score, position_cap)
    
    def _calculate_gk_performance(self, player_data: Dict) -> float:
        """Calculate GK performance"""
        save_pct = player_data.get('save_percentage', 70.0) or 70.0
        cs_pct = player_data.get('clean_sheet_percentage', 20.0) or 20.0
        ga90 = player_data.get('goals_against_per_90', 1.5) or 1.5
        
        bench = self.elite_benchmarks['GK']
        
        save_score = min((save_pct - 65) / (bench['save_pct'] - 65) * 40, 50) if bench['save_pct'] > 65 else 0
        save_score = max(save_score, 0)
        
        cs_score = min((cs_pct - 20) / (bench['cs_pct'] - 20) * 30, 40) if bench['cs_pct'] > 20 else 0
        cs_score = max(cs_score, 0)
        
        ga_score = max((1.5 - ga90) / (1.5 - bench['ga90']) * 30, 0) if bench['ga90'] < 1.5 else 0
        ga_score = min(ga_score, 40)
        
        return min(max(30 + save_score + cs_score + ga_score, 40), self.performance_caps['GK'])
    
    def _calculate_confidence_weight(self, matches: int, minutes: int, position: str) -> Tuple[float, str]:
        """Calculate confidence weight"""
        if matches >= 20 and minutes >= 1500:
            return 1.0, "Very High"
        elif matches >= 15 and minutes >= 1000:
            return 0.85, "High"
        elif matches >= 10 and minutes >= 600:
            return 0.70, "Medium"
        elif matches >= 5 and minutes >= 300:
            return 0.50, "Low"
        else:
            return 0.30, "Very Low"
    
    def _calculate_baseline_expectation(self, player_data: Dict) -> float:
        """Calculate baseline expectation"""
        position = player_data.get('position', 'FW')
        age = player_data.get('age', 18)
        
        baselines = {'FW': 65, 'MF': 63, 'DF': 60, 'GK': 62}
        baseline = baselines.get(position, 65)
        
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
        
        return min(max(baseline, 40), 80)
    
    def _calculate_volume_bonus(self, goals: int, position: str) -> float:
        """Volume bonus"""
        if position == 'FW':
            if goals >= 25: return 8
            elif goals >= 20: return 6
            elif goals >= 15: return 4
            elif goals >= 10: return 2
            elif goals >= 5: return 1
        elif position == 'MF':
            if goals >= 12: return 6
            elif goals >= 8: return 4
            elif goals >= 5: return 2
        elif position == 'DF':
            if goals >= 8: return 8
            elif goals >= 5: return 5
            elif goals >= 3: return 3
        return 0
    
    def _calculate_efficiency_bonus(self, goals_per_90: float, position: str) -> float:
        """Efficiency bonus"""
        if position == 'FW':
            if goals_per_90 > 1.0: return 5
            elif goals_per_90 > 0.8: return 3
            elif goals_per_90 > 0.6: return 1
        elif position == 'MF':
            if goals_per_90 > 0.4: return 4
            elif goals_per_90 > 0.3: return 2
        elif position == 'DF':
            if goals_per_90 > 0.2: return 5
            elif goals_per_90 > 0.15: return 3
        return 0
    
    def _calculate_elite_bonus(self, player_data: Dict, performance: float) -> float:
        """Elite bonus"""
        goals = player_data.get('goals', 0)
        position = player_data.get('position', 'FW')
        
        if position == 'FW':
            if goals >= 25 and performance >= 75: return 6
            elif goals >= 20 and performance >= 70: return 4
            elif goals >= 15 and performance >= 65: return 3
        elif position == 'MF':
            if goals >= 12 and performance >= 70: return 4
            elif goals >= 8 and performance >= 65: return 2
        elif position == 'DF':
            if goals >= 8 and performance >= 65: return 5
            elif goals >= 5 and performance >= 60: return 3
        
        return 0
    
    def _predict_development_potential(self, player_data: Dict) -> float:
        """Predict ML development potential"""
        if self.model is None or self.scaler is None:
            return self._fallback_development_potential(player_data)
        
        try:
            features = self._extract_ml_features(player_data)
            features_scaled = self.scaler.transform(features)
            prediction = self.model.predict(features_scaled)[0]
            return float(np.clip(prediction, 0, 100))
        except Exception as e:
            print(f"⚠️  ML prediction failed: {e}")
            return self._fallback_development_potential(player_data)
    
    def _fallback_development_potential(self, player_data: Dict) -> float:
        """Fallback ML score"""
        age = player_data.get('age', 18)
        matches = player_data.get('matches', 0)
        
        age_scores = {16: 85, 17: 80, 18: 75, 19: 70, 20: 65}
        age_score = age_scores.get(age, 60)
        
        if matches >= 20: consistency_bonus = 10
        elif matches >= 15: consistency_bonus = 7
        elif matches >= 10: consistency_bonus = 4
        elif matches >= 5: consistency_bonus = 2
        else: consistency_bonus = 0
        
        return min(age_score + consistency_bonus, 100)
    
    def _extract_ml_features(self, player_data: Dict) -> np.ndarray:
        """Extract and engineer features for ML prediction to match training (29 features)."""
        # Exact mirror of model/performance_calculator_fixed.py engineering logic
        features_dict = {}
        
        # Standardize keys to match model logic (Case sensitive)
        row = {
            'Age': player_data.get('age', 18),
            'Matches': player_data.get('matches', 1),
            'Starts': player_data.get('starts', 0),
            'Minutes': player_data.get('minutes', 0),
            'Goals': player_data.get('goals', 0),
            'GoalsPer90': player_data.get('goals_per_90', 0),
            'Assists': player_data.get('assists', 0),
            'AssistsPer90': player_data.get('assists_per_90', 0),
            'xG': (player_data.get('xg_per_90', 0) or 0) * (player_data.get('minutes', 0) or 0) / 90,
            'xA': (player_data.get('xa_per_90', 0) or 0) * (player_data.get('minutes', 0) or 0) / 90,
            'Shots': 0,
            'ShotsOnTarget': 0,
            'PassesCompleted': 0,
            'PassCompletionPct': player_data.get('save_percentage', 75.0) if player_data.get('position') == 'GK' else 75.0,
            'ProgressivePasses': 0,
            'Tackles': 0,
            'Interceptions': 0,
            'DribblesCompleted': 0,
            'Touches': 0,
            'CurrentAbility': 65  # Fallback current ability
        }
        
        # 1. Base Variables
        matches = row['Matches']
        if matches == 0: matches = 1
        minutes = row['Minutes']
        goals = row['Goals']
        assists = row['Assists']
        
        # 2. Map Core Features (19 features)
        for feat in CORE_FEATURES:
            features_dict[feat] = row.get(feat, 0)
            
        # 3. Derive Engineered Features
        features_dict['MinutesPerMatch'] = minutes / matches
        features_dict['GoalsPerMatch'] = goals / matches
        features_dict['StartPercentage'] = row['Starts'] / matches
        features_dict['CompletionRate'] = row['PassCompletionPct'] / 100.0
        features_dict['AttackingContribution'] = goals + assists
        features_dict['DefensiveContribution'] = row['Tackles'] + row['Interceptions']
        features_dict['PhysicalityScore'] = 0 
        features_dict['ConsistencyScore'] = min(max(minutes / (matches * 90), 0), 1)
        features_dict['AgeBonus'] = max(0, 25 - row['Age']) / 10
        features_dict['PositionAdjustedRating'] = row['CurrentAbility'] - 50
        
        # 4. Assemble in correct order
        all_feature_names = CORE_FEATURES + ENGINEERED_FEATURES
        feature_list = []
        for feat in all_feature_names:
            feature_list.append(features_dict.get(feat, 0))
            
        return np.array(feature_list).reshape(1, -1)