"""
Feature Engineering for Youth Player Potential System
======================================================

UPDATED: Realistic rating scale with proper normalization
- Current ratings: 20-70 scale
- Peak potential: 40-94 scale (hard cap)
"""

import pandas as pd
import numpy as np
from typing import Dict, List

from config import (
    NUMERIC_COLS, CURRENT_RATING_WEIGHTS, POTENTIAL_WEIGHTS,
    MIN_MATCHES_THRESHOLD, LOW_MATCH_CONFIDENCE_PENALTY, 
    get_age_bonus, SEASON_LABELS,
    get_sample_size_penalty, is_exceptional_performance,
    get_age_growth_modifier, get_performance_growth_modifier,
    YOUTH_PROGRESSION_RULES, CURRENT_RATING_SCALE,
    PEAK_POTENTIAL_SCALE, NEXT_SEASON_SCALE,
    normalize_rating_to_scale
)


class FeatureEngineer:
    """
    Creates engineered features with realistic U19 rating scales.
    """
    
    def __init__(self):
        self.rating_ranges = {}
        self.rating_distribution = None
    
    def engineer_all_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Apply all feature engineering with realistic scales."""
        print("\n" + "=" * 70)
        print("FEATURE ENGINEERING - REALISTIC U19 SCALES")
        print("=" * 70)
        
        df = df.copy()
        
        print("\n0️⃣ Preserving raw columns...")
        df = self._preserve_raw_columns(df)
        
        print("1️⃣ Calculating confidence weights...")
        df = self._add_confidence_weights(df)
        
        print("2️⃣ Applying STRICT low-match penalties...")
        df = self._add_sample_size_penalties(df)
        
        print("3️⃣ Applying confidence penalties to stats...")
        df = self._apply_confidence_penalty(df)
        
        print("4️⃣ Creating efficiency metrics...")
        df = self._add_efficiency_metrics(df)
        
        print("5️⃣ Computing Current Rating (20-70 scale)...")
        df = self._calculate_current_rating_normalized(df)
        
        print("6️⃣ Adding position-specific age bonuses...")
        df = self._add_age_bonus(df)
        
        print("7️⃣ Creating progression features...")
        df = self._add_progression_features(df)
        
        print("8️⃣ Computing consistency scores...")
        df = self._add_consistency_metrics(df)
        
        print("9️⃣ Adding advanced ratio features...")
        df = self._add_ratio_and_positional_features(df)
        
        print("🔟 Adding youth progression modifiers...")
        df = self._add_youth_progression_modifiers(df)
        
        print("1️⃣1️⃣ Computing Next Season Rating (constrained)...")
        df = self._calculate_next_season_constrained(df)
        
        print("1️⃣2️⃣ Computing Peak Potential (40-94 scale)...")
        df = self._calculate_peak_potential_constrained(df)
        
        print("1️⃣3️⃣ Validating and enforcing progression...")
        df = self._validate_and_fix_progression(df)
        
        print("\n✅ Feature engineering complete!")
        self._print_progression_stats(df)
        
        return df
    
    def _preserve_raw_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """Preserve raw columns."""
        if 'Playing Time_Min_std' in df.columns and 'Playing Time_Min_raw' not in df.columns:
            df['Playing Time_Min_raw'] = df['Playing Time_Min_std'].copy()
        
        if 'Playing Time_MP_std' in df.columns and 'Playing Time_MP_raw' not in df.columns:
            df['Playing Time_MP_raw'] = df['Playing Time_MP_std'].copy()
        
        if 'Playing Time_MP_raw' not in df.columns or df['Playing Time_MP_raw'].isna().all():
            if 'Playing Time_Min_raw' in df.columns:
                df['Playing Time_MP_raw'] = (df['Playing Time_Min_raw'] / 90.0).round(2)
        
        return df
    
    def _add_confidence_weights(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add confidence weight based on matches."""
        match_col = 'Playing Time_MP_raw' if 'Playing Time_MP_raw' in df.columns else 'Playing Time_MP_std'
        
        if match_col not in df.columns:
            df['confidence_weight'] = 0.5
            return df
        
        max_matches = 38
        df['confidence_weight'] = np.log1p(df[match_col]) / np.log1p(max_matches)
        df['confidence_weight'] = df['confidence_weight'].clip(0, 1)
        
        return df
    
    def _add_sample_size_penalties(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add graduated sample size penalties."""
        match_col = 'Playing Time_MP_raw' if 'Playing Time_MP_raw' in df.columns else 'Playing Time_MP_std'
        minutes_col = 'Playing Time_Min_raw' if 'Playing Time_Min_raw' in df.columns else 'Playing Time_Min_std'
        
        if match_col not in df.columns:
            df['sample_size_penalty'] = 1.0
            df['is_exceptional'] = False
            return df
        
        df['sample_size_penalty'] = df[match_col].apply(get_sample_size_penalty)
        
        df['is_exceptional'] = df.apply(
            lambda row: is_exceptional_performance(
                goals=row.get('Performance_Gls', 0),
                matches=row.get(match_col, 0),
                minutes=row.get(minutes_col, 0),
                assists=row.get('Performance_Ast', 0)
            ),
            axis=1
        )
        
        # Exceptional players: reduced penalty
        df.loc[df['is_exceptional'], 'sample_size_penalty'] = \
            df.loc[df['is_exceptional'], 'sample_size_penalty'] * 0.5 + 0.5
        
        return df
    
    def _apply_confidence_penalty(self, df: pd.DataFrame) -> pd.DataFrame:
        """Apply penalties to stats for low-sample players."""
        match_col = 'Playing Time_MP_raw' if 'Playing Time_MP_raw' in df.columns else 'Playing Time_MP_std'
        
        if match_col not in df.columns:
            return df
        
        low_match_mask = df[match_col] < MIN_MATCHES_THRESHOLD
        
        penalty_cols = [
            'Performance_Gls', 'Performance_G-PK',
            'Per 90 Minutes_Gls', 'Per 90 Minutes_G-PK',
            'Team Success_PPM', 'Team Success_+/-90', 'Team Success_On-Off'
        ]
        
        for col in penalty_cols:
            if col in df.columns:
                df.loc[low_match_mask, col] *= LOW_MATCH_CONFIDENCE_PENALTY
        
        return df
    
    def _add_efficiency_metrics(self, df: pd.DataFrame) -> pd.DataFrame:
        """Create efficiency ratios."""
        minutes_col = 'Playing Time_Min_raw' if 'Playing Time_Min_raw' in df.columns else 'Playing Time_Min_std'
        
        if minutes_col in df.columns:
            df['minutes_for_per90'] = df[minutes_col].clip(lower=10)
        else:
            df['minutes_for_per90'] = 10
        
        df['goals_per_start'] = df['Performance_Gls'] / df['Starts_Starts'].replace(0, np.nan)
        df['goals_per_start'] = df['goals_per_start'].fillna(0).clip(0, 5)
        
        df['minutes_per_goal'] = df['minutes_for_per90'] / df['Performance_Gls'].replace(0, np.nan)
        df['minutes_per_goal'] = df['minutes_per_goal'].fillna(999).clip(0, 999)
        
        df['goal_efficiency'] = 1 - (df['minutes_per_goal'] / 999)
        
        df['completion_rate'] = df['Starts_Compl'] / df['Starts_Starts'].replace(0, np.nan)
        df['completion_rate'] = df['completion_rate'].fillna(0).clip(0, 1)
        
        df['playing_time_pct'] = df['Playing Time_Min%'].fillna(0) / 100
        
        return df
    
    def _calculate_current_rating_normalized(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate Current Rating with REALISTIC 20-70 scale for U19.
        """
        raw_rating = pd.Series(0.0, index=df.index)
        
        # Calculate raw weighted rating
        for col, weight in CURRENT_RATING_WEIGHTS.items():
            if col in df.columns:
                raw_rating += df[col].fillna(0) * weight
        
        # Normalize to 0-100 first
        if raw_rating.max() > raw_rating.min():
            raw_rating = (raw_rating - raw_rating.min()) / (raw_rating.max() - raw_rating.min()) * 100
        else:
            raw_rating = pd.Series(50.0, index=df.index)
        
        # Map to realistic U19 scale (20-70)
        # Use sigmoid-like transformation to push extremes toward middle
        normalized = raw_rating.apply(
            lambda x: normalize_rating_to_scale(
                x, 
                CURRENT_RATING_SCALE['min'], 
                CURRENT_RATING_SCALE['max'],
                cap=CURRENT_RATING_SCALE['max']
            )
        )
        
        # Apply sample size penalty
        normalized = normalized * df['sample_size_penalty']
        
        # Ensure within bounds
        normalized = normalized.clip(
            CURRENT_RATING_SCALE['min'], 
            CURRENT_RATING_SCALE['max']
        )
        
        df['current_rating'] = normalized
        self.rating_ranges['current'] = (normalized.min(), normalized.max())
        
        print(f"   ℹ️  Current rating range: {normalized.min():.1f} - {normalized.max():.1f}")
        
        return df
    
    def _add_age_bonus(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add position-specific age bonus."""
        df['Born_std'] = pd.to_numeric(df['Born_std'], errors='coerce')
        current_year = 2025
        df['Age_std'] = current_year - df['Born_std']
        df['Age_std'] = df['Age_std'].fillna(17).clip(14, 22)
        
        df['age_bonus'] = df.apply(
            lambda row: get_age_bonus(row['Age_std'], row['Pos_std']) 
            if pd.notna(row['Pos_std']) else get_age_bonus(row['Age_std'], 'DEFAULT'),
            axis=1
        )
        
        return df
    
    def _add_youth_progression_modifiers(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add modifiers for youth growth potential."""
        df['age_growth_modifier'] = df['Age_std'].apply(get_age_growth_modifier)
        
        self.rating_distribution = df['current_rating']
        
        df['performance_growth_modifier'] = df.apply(
            lambda row: get_performance_growth_modifier(
                row['current_rating'], 
                self.rating_distribution
            ),
            axis=1
        )
        
        df['growth_potential_multiplier'] = (
            df['age_growth_modifier'] * df['performance_growth_modifier']
        )
        
        df['performance_tier'] = pd.cut(
            df['current_rating'],
            bins=[0, 38, 52, 65, 100],
            labels=['struggling', 'average', 'good', 'exceptional']
        )
        
        return df
    
    def _add_progression_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate season-over-season growth."""
        df = df.sort_values(['Player', 'Season']).reset_index(drop=True)
        
        df['season_growth_rate'] = 0.0
        df['goals_growth'] = 0.0
        df['minutes_growth'] = 0.0
        
        minutes_col = 'Playing Time_Min_raw' if 'Playing Time_Min_raw' in df.columns else 'Playing Time_Min_std'
        
        for player in df['Player'].unique():
            player_mask = df['Player'] == player
            player_data = df[player_mask].copy()
            
            if len(player_data) < 2:
                continue
            
            for i in range(1, len(player_data)):
                curr_idx = player_data.index[i]
                prev_idx = player_data.index[i-1]
                
                curr_rating = player_data.loc[curr_idx, 'current_rating']
                prev_rating = player_data.loc[prev_idx, 'current_rating']
                growth = curr_rating - prev_rating
                df.loc[curr_idx, 'season_growth_rate'] = growth
                
                curr_goals = player_data.loc[curr_idx, 'Performance_Gls']
                prev_goals = player_data.loc[prev_idx, 'Performance_Gls']
                if prev_goals > 0:
                    df.loc[curr_idx, 'goals_growth'] = (curr_goals - prev_goals) / prev_goals
                
                curr_mins = player_data.loc[curr_idx, minutes_col]
                prev_mins = player_data.loc[prev_idx, minutes_col]
                if prev_mins > 0:
                    df.loc[curr_idx, 'minutes_growth'] = (curr_mins - prev_mins) / prev_mins
        
        df['season_growth_rate'] = df['season_growth_rate'].clip(-30, 30)
        df['goals_growth'] = df['goals_growth'].clip(-2, 5)
        df['minutes_growth'] = df['minutes_growth'].clip(-1, 3)
        
        return df
    
    def _add_consistency_metrics(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate consistency score."""
        df['consistency_score'] = 0.0
        
        minutes_col = 'Playing Time_Min_raw' if 'Playing Time_Min_raw' in df.columns else 'Playing Time_Min_std'
        
        for player in df['Player'].unique():
            player_mask = df['Player'] == player
            player_data = df[player_mask]
            
            if len(player_data) < 2:
                df.loc[player_mask, 'consistency_score'] = 0.5
                continue
            
            cv_goals = player_data['Performance_Gls'].std() / (player_data['Performance_Gls'].mean() + 1)
            cv_minutes = player_data[minutes_col].std() / (player_data[minutes_col].mean() + 1)
            
            consistency = 1 / (1 + cv_goals + cv_minutes)
            df.loc[player_mask, 'consistency_score'] = consistency
        
        df['consistency_score'] = (df['consistency_score'] - df['consistency_score'].min()) / \
                                  (df['consistency_score'].max() - df['consistency_score'].min() + 1e-6)
        
        return df
    
    def _add_ratio_and_positional_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add ratio and positional features."""
        match_col = 'Playing Time_MP_raw' if 'Playing Time_MP_raw' in df.columns else 'Playing Time_MP_std'
        
        df['goals_per_match'] = df['Performance_Gls'] / df[match_col].replace(0, np.nan)
        df['goals_per_match'] = df['goals_per_match'].fillna(0).clip(0, 3)
        
        if 'Performance_Ast' in df.columns:
            df['assists_per_match'] = df['Performance_Ast'] / df[match_col].replace(0, np.nan)
            df['assists_per_match'] = df['assists_per_match'].fillna(0).clip(0, 3)
            contrib = df['Performance_Gls'] + df['Performance_Ast']
        else:
            df['assists_per_match'] = 0.0
            contrib = df['Performance_Gls']
        
        if 'minutes_for_per90' in df.columns:
            denom_90s = (df['minutes_for_per90'] / 90.0).replace(0, np.nan)
        else:
            minutes_col = 'Playing Time_Min_raw' if 'Playing Time_Min_raw' in df.columns else 'Playing Time_Min_std'
            denom_90s = (df[minutes_col].clip(lower=10) / 90.0).replace(0, np.nan)
        
        df['goal_contributions_per90'] = (contrib / denom_90s).fillna(0).clip(0, 5)
        
        if 'current_rating' in df.columns and 'Pos_std' in df.columns and 'Season' in df.columns:
            group_means = df.groupby(['Season', 'Pos_std'])['current_rating'].transform('mean')
            df['pos_season_avg_rating'] = group_means
            df['pos_season_rating_diff'] = df['current_rating'] - df['pos_season_avg_rating']
        else:
            df['pos_season_avg_rating'] = df.get('current_rating', pd.Series(0, index=df.index))
            df['pos_season_rating_diff'] = 0.0
        
        return df
    
    def _calculate_next_season_constrained(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate Next Season Rating with STRICT constraints.
        Max growth: +10 points, typical: +5, min: +2
        """
        df = df.sort_values(['Player', 'Season']).reset_index(drop=True)
        df['next_season_rating'] = np.nan
        
        rules = YOUTH_PROGRESSION_RULES
        scale = NEXT_SEASON_SCALE
        
        for player in df['Player'].unique():
            player_mask = df['Player'] == player
            player_data = df[player_mask].copy()
            
            if len(player_data) < 2:
                continue
            
            for i in range(len(player_data) - 1):
                curr_idx = player_data.index[i]
                current = df.loc[curr_idx, 'current_rating']
                
                # Get modifiers
                age_mod = df.loc[curr_idx, 'age_growth_modifier']
                perf_mod = df.loc[curr_idx, 'performance_growth_modifier']
                
                # Calculate growth
                base_growth = scale['avg_growth']
                expected_growth = base_growth * age_mod * perf_mod
                
                # Constrain growth
                min_growth = scale['min_growth'] * age_mod
                max_growth = scale['max_growth'] * age_mod
                
                final_growth = np.clip(expected_growth, min_growth, max_growth)
                
                # Calculate next season rating
                next_rating = current + final_growth
                
                # Cap at maximum
                next_rating = min(next_rating, rules['max_next_season_rating'])
                
                df.loc[curr_idx, 'next_season_rating'] = next_rating
        
        # For last season: project
        last_season_mask = df.groupby('Player')['Season'].transform('last') == df['Season']
        
        df.loc[last_season_mask & df['next_season_rating'].isna(), 'next_season_rating'] = (
            df.loc[last_season_mask, 'current_rating'] + 
            df.loc[last_season_mask, 'growth_potential_multiplier'] * scale['avg_growth']
        ).clip(upper=rules['max_next_season_rating'])
        
        # Fallback
        df['next_season_rating'] = df['next_season_rating'].fillna(
            df['current_rating'] + scale['min_growth']
        )
        
        return df
    
    def _calculate_peak_potential_constrained(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate Peak Potential with HARD CAP at 94.
        Typical growth: +18 from current, max: +35
        """
        df = df.sort_values(['Player', 'Season']).reset_index(drop=True)
        df['peak_potential'] = np.nan
        
        rules = YOUTH_PROGRESSION_RULES
        max_peak = PEAK_POTENTIAL_SCALE['max']
        
        for player in df['Player'].unique():
            mask = df['Player'] == player
            player_data = df[mask]
            
            for idx in player_data.index:
                current = df.loc[idx, 'current_rating']
                next_season = df.loc[idx, 'next_season_rating']
                
                # Get modifiers
                age_mod = df.loc[idx, 'age_growth_modifier']
                perf_mod = df.loc[idx, 'performance_growth_modifier']
                
                # Calculate peak growth from current
                base_peak_growth = rules['typical_peak_growth_from_current']
                expected_peak_growth = base_peak_growth * age_mod * perf_mod
                
                # Constrain
                min_peak_growth = rules['min_peak_growth_from_current'] * age_mod
                max_peak_growth = rules['max_peak_growth_from_current'] * age_mod
                
                final_peak_growth = np.clip(
                    expected_peak_growth,
                    min_peak_growth,
                    max_peak_growth
                )
                
                # Calculate peak
                projected_peak = current + final_peak_growth
                
                # Ensure peak > next_season
                min_from_next = rules['min_peak_growth_from_next']
                projected_peak = max(projected_peak, next_season + min_from_next)
                
                # HARD CAP at 94
                projected_peak = min(projected_peak, max_peak)
                
                df.loc[idx, 'peak_potential'] = projected_peak
        
        # Fallback
        df['peak_potential'] = df['peak_potential'].fillna(
            (df['next_season_rating'] + rules['min_peak_growth_from_next']).clip(upper=max_peak)
        )
        
        self.rating_ranges['potential'] = (
            df['peak_potential'].min(),
            df['peak_potential'].max()
        )
        
        print(f"   ℹ️  Peak potential range: {df['peak_potential'].min():.1f} - {df['peak_potential'].max():.1f}")
        
        return df
    
    def _validate_and_fix_progression(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        CRITICAL: Enforce progression hierarchy and caps.
        """
        rules = YOUTH_PROGRESSION_RULES
        max_peak = PEAK_POTENTIAL_SCALE['max']
        
        # Fix current rating cap
        df['current_rating'] = df['current_rating'].clip(
            upper=CURRENT_RATING_SCALE['max']
        )
        
        # Fix next_season: must exceed current by min_growth
        mask = df['next_season_rating'] < df['current_rating'] + rules['min_next_season_growth']
        df.loc[mask, 'next_season_rating'] = (
            df.loc[mask, 'current_rating'] + rules['min_next_season_growth']
        )
        
        # Cap next_season
        df['next_season_rating'] = df['next_season_rating'].clip(
            upper=rules['max_next_season_rating']
        )
        
        # Fix peak: must exceed next_season
        mask = df['peak_potential'] < df['next_season_rating'] + rules['min_peak_growth_from_next']
        df.loc[mask, 'peak_potential'] = (
            df.loc[mask, 'next_season_rating'] + rules['min_peak_growth_from_next']
        )
        
        # Fix peak: must exceed current
        mask = df['peak_potential'] < df['current_rating'] + rules['min_peak_growth_from_current']
        df.loc[mask, 'peak_potential'] = (
            df.loc[mask, 'current_rating'] + rules['min_peak_growth_from_current']
        )
        
        # HARD CAP peak at 94
        df['peak_potential'] = df['peak_potential'].clip(upper=max_peak)
        
        return df
    
    def _print_progression_stats(self, df: pd.DataFrame):
        """Print progression validation stats."""
        print("\n📊 Youth Progression Validation:")
        
        valid_next = (df['next_season_rating'] >= df['current_rating']).mean()
        valid_peak_from_current = (df['peak_potential'] >= df['current_rating']).mean()
        valid_peak_from_next = (df['peak_potential'] >= df['next_season_rating']).mean()
        
        print(f"   • Next > Current: {valid_next*100:.1f}%")
        print(f"   • Peak > Current: {valid_peak_from_current*100:.1f}%")
        print(f"   • Peak > Next: {valid_peak_from_next*100:.1f}%")
        
        avg_next_growth = (df['next_season_rating'] - df['current_rating']).mean()
        avg_peak_growth = (df['peak_potential'] - df['current_rating']).mean()
        
        print(f"   • Avg Next Season Growth: +{avg_next_growth:.1f}")
        print(f"   • Avg Peak Growth: +{avg_peak_growth:.1f}")
        print(f"   • Max Peak Potential: {df['peak_potential'].max():.1f}")
        
        print("\n   📈 Growth by Age:")
        for age in sorted(df['Age_std'].unique()):
            if 15 <= age <= 20:
                age_data = df[df['Age_std'] == age]
                avg_growth = (age_data['peak_potential'] - age_data['current_rating']).mean()
                print(f"      Age {int(age)}: +{avg_growth:.1f} potential growth")
    
    def get_feature_columns(self) -> List[str]:
        """Get feature columns for modeling."""
        base_features = NUMERIC_COLS.copy()
        
        engineered_features = [
            'confidence_weight',
            'sample_size_penalty',
            'is_exceptional',
            'goals_per_start',
            'goal_efficiency',
            'completion_rate',
            'playing_time_pct',
            'current_rating',
            'age_bonus',
            'age_growth_modifier',
            'performance_growth_modifier',
            'growth_potential_multiplier',
            'season_growth_rate',
            'goals_growth',
            'minutes_growth',
            'consistency_score',
            'goals_per_match',
            'assists_per_match',
            'goal_contributions_per90',
            'pos_season_avg_rating',
            'pos_season_rating_diff'
        ]
        
        return base_features + engineered_features
    
    def get_target_columns(self) -> List[str]:
        """Get target columns."""
        return ['next_season_rating', 'peak_potential']


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Convenience function."""
    engineer = FeatureEngineer()
    return engineer.engineer_all_features(df)


if __name__ == "__main__":
    from data_loader import load_data
    
    print("\n🧪 Testing Feature Engineering (REALISTIC SCALES)...")
    
    try:
        df = load_data(fill_missing=True)
        
        engineer = FeatureEngineer()
        df_engineered = engineer.engineer_all_features(df)
        
        print("\n📊 Sample Ratings:")
        sample_cols = ['Player', 'Season', 'Playing Time_MP_std', 'current_rating',
                      'next_season_rating', 'peak_potential']
        print(df_engineered[sample_cols].head(15))
        
        print("\n✅ Test completed!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()