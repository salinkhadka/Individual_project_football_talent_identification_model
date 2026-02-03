"""
Feature Derivation for Scraped Data - FIXED
============================================
Fixed safe_divide vectorization issue
"""

import pandas as pd
import numpy as np
from typing import Dict

from config_new import (
    XG_COEFFICIENTS, XA_COEFFICIENTS, 
    PROGRESSIVE_PASS_COEFFICIENTS, DRIBBLE_COEFFICIENTS,
    REALISTIC_SHOTS_PER_90,
    standardize_position
)


def safe_divide_vectorized(numerator, denominator, default=0):
    """
    Vectorized safe division that works with both scalars and Series.
    
    Args:
        numerator: Number or Series to divide
        denominator: Number or Series to divide by
        default: Default value when division by zero
    
    Returns:
        Result of division or default value
    """
    if isinstance(numerator, pd.Series) or isinstance(denominator, pd.Series):
        # Vectorized operation for pandas Series
        result = numerator / denominator
        # Replace inf and nan with default
        result = result.replace([np.inf, -np.inf], default)
        result = result.fillna(default)
        return result
    else:
        # Scalar operation
        if denominator == 0 or pd.isna(denominator) or pd.isna(numerator):
            return default
        return numerator / denominator


class FeatureDerivation:
    """Derive missing advanced features for scraped data."""
    
    def __init__(self):
        self.position_stats = {}
    
    def derive_all_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Derive all missing advanced statistics.
        
        Args:
            df: DataFrame with basic stats
        
        Returns:
            DataFrame with derived advanced stats
        """
        print("\n" + "=" * 70)
        print("DERIVING ADVANCED STATISTICS")
        print("=" * 70)
        
        df = df.copy()
        
        # Ensure we have standardized position
        if 'Position' not in df.columns:
            print("⚠️  Position column missing, using default")
            df['Position'] = 'MF'
        
        # Calculate position-based averages for reference
        self._calculate_position_averages(df)
        
        print("\n1️⃣ Deriving Expected Goals (xG)...")
        df = self._derive_xg(df)
        
        print("2️⃣ Deriving Expected Assists (xA)...")
        df = self._derive_xa(df)
        
        print("3️⃣ Deriving shooting metrics...")
        df = self._derive_shooting_metrics(df)
        
        print("4️⃣ Deriving passing metrics...")
        df = self._derive_passing_metrics(df)
        
        print("5️⃣ Deriving defensive metrics...")
        df = self._derive_defensive_metrics(df)
        
        print("6️⃣ Deriving dribbling metrics...")
        df = self._derive_dribbling_metrics(df)
        
        print("7️⃣ Deriving ball control metrics...")
        df = self._derive_ball_control_metrics(df)
        
        print("8️⃣ Deriving pressing metrics...")
        df = self._derive_pressing_metrics(df)
        
        print("9️⃣ Deriving chance creation metrics...")
        df = self._derive_chance_creation_metrics(df)
        
        print("\n✅ All advanced statistics derived!")
        
        return df
    
    def _calculate_position_averages(self, df: pd.DataFrame):
        """Calculate position-based averages for reference."""
        for pos in ['FW', 'MF', 'DF', 'GK']:
            pos_data = df[df['Position'] == pos]
            if len(pos_data) > 0:
                self.position_stats[pos] = {
                    'avg_goals': pos_data['Goals'].mean(),
                    'avg_matches': pos_data['Matches'].mean(),
                    'avg_minutes': pos_data['Minutes'].mean()
                }
    
    def _derive_xg(self, df: pd.DataFrame) -> pd.DataFrame:
        """Derive Expected Goals (xG)."""
        df['xG'] = 0.0
        df['xGPer90'] = 0.0
        
        for idx, row in df.iterrows():
            position = row['Position']
            coefs = XG_COEFFICIENTS.get(position, XG_COEFFICIENTS['MF'])
            
            goals = row['Goals']
            matches = row['Matches']
            minutes = row['Minutes']
            nineties = minutes / 90.0 if minutes > 0 else 0
            
            # Estimate shots (if not available)
            if 'Shots' in df.columns and pd.notna(row['Shots']):
                shots = row['Shots']
            else:
                shots_per_90 = {'FW': 4.0, 'MF': 2.0, 'DF': 1.0, 'GK': 0.1}
                shots = shots_per_90.get(position, 2.0) * nineties
            
            # Estimate shot accuracy (if not available)
            if 'ShotAccuracy' in df.columns and pd.notna(row['ShotAccuracy']):
                shot_accuracy = row['ShotAccuracy'] / 100.0
            else:
                default_accuracy = {'FW': 0.40, 'MF': 0.35, 'DF': 0.30, 'GK': 0.0}
                shot_accuracy = default_accuracy.get(position, 0.35)
            
            # Calculate xG
            xg = (
                coefs['base_xg'] * matches +
                coefs['goals_weight'] * goals * 0.95 +
                coefs['shots_weight'] * shots * 0.1 +
                coefs['shot_accuracy_weight'] * shot_accuracy * shots * 0.15
            )
            
            df.at[idx, 'xG'] = max(0, xg)
            df.at[idx, 'xGPer90'] = safe_divide_vectorized(xg, nineties, 0)
        
        print(f"   ✓ xG range: {df['xG'].min():.2f} - {df['xG'].max():.2f}")
        
        return df
    
    def _derive_xa(self, df: pd.DataFrame) -> pd.DataFrame:
        """Derive Expected Assists (xA)."""
        df['xA'] = 0.0
        df['xAPer90'] = 0.0
        
        for idx, row in df.iterrows():
            position = row['Position']
            coefs = XA_COEFFICIENTS.get(position, XA_COEFFICIENTS['MF'])
            
            goals = row['Goals']
            matches = row['Matches']
            minutes = row['Minutes']
            nineties = minutes / 90.0 if minutes > 0 else 0
            
            # Attacking contribution proxy
            goals_per_90 = safe_divide_vectorized(goals, nineties, 0)
            
            xa = (
                coefs['base'] * matches +
                coefs['attack_weight'] * goals_per_90 * nineties * 0.5
            )
            
            df.at[idx, 'xA'] = max(0, xa)
            df.at[idx, 'xAPer90'] = safe_divide_vectorized(xa, nineties, 0)
        
        print(f"   ✓ xA range: {df['xA'].min():.2f} - {df['xA'].max():.2f}")
        
        return df
    
    def _derive_shooting_metrics(self, df: pd.DataFrame) -> pd.DataFrame:
        """Derive shooting statistics with REALISTIC per-90 rates."""
        
        # Shots (if not already derived in xG)
        if 'Shots' not in df.columns:
            df['Shots'] = 0.0
            df['ShotsPer90'] = 0.0
            
            for idx, row in df.iterrows():
                nineties = row['Minutes'] / 90.0 if row['Minutes'] > 0 else 0
                position = row['Position']
                
                shots_rate = REALISTIC_SHOTS_PER_90.get(position, 1.5)
                
                if row['Matches'] > 0:
                    goals_boost = 1 + (row['Goals'] / max(row['Matches'], 1)) * 0.3
                else:
                    goals_boost = 1.0
                
                adjusted_rate = shots_rate * goals_boost
                total_shots = adjusted_rate * nineties
                
                df.at[idx, 'Shots'] = total_shots
                df.at[idx, 'ShotsPer90'] = adjusted_rate
        
        # Shots on target
        if 'ShotsOnTarget' not in df.columns:
            if 'Shots' in df.columns:
                df['ShotsOnTarget'] = df['Shots'] * 0.38
                df['ShotsOnTargetPer90'] = df['ShotsPer90'] * 0.38
            else:
                df['ShotsOnTarget'] = 0
                df['ShotsOnTargetPer90'] = 0
        
        # Shot accuracy - USE VECTORIZED VERSION
        if 'ShotAccuracy' not in df.columns:
            df['ShotAccuracy'] = safe_divide_vectorized(df['ShotsOnTarget'], df['Shots'], 0) * 100
        
        print(f"   ✓ Shots (Total) range: {df['Shots'].min():.1f} - {df['Shots'].max():.1f}")
        print(f"   ✓ Shots Per 90 range: {df['ShotsPer90'].min():.2f} - {df['ShotsPer90'].max():.2f}")
        
        return df
    
    def _derive_passing_metrics(self, df: pd.DataFrame) -> pd.DataFrame:
        """Derive passing statistics with Total and Per90 separation."""
        
        if 'PassesCompleted' not in df.columns:
            df['PassesCompleted'] = 0.0
            df['PassesCompletedPer90'] = 0.0
            passes_per_90_by_pos = {'FW': 25, 'MF': 45, 'DF': 35, 'GK': 20}
            
            for idx, row in df.iterrows():
                nineties = row['Minutes'] / 90.0 if row['Minutes'] > 0 else 0
                position = row['Position']
                pass_rate = passes_per_90_by_pos.get(position, 35)
                
                df.at[idx, 'PassesCompleted'] = pass_rate * nineties
                df.at[idx, 'PassesCompletedPer90'] = pass_rate
        
        if 'PassCompletionPct' not in df.columns:
            pct_by_pos = {'FW': 72, 'MF': 80, 'DF': 78, 'GK': 65}
            df['PassCompletionPct'] = df['Position'].map(pct_by_pos).fillna(75)
        
        if 'ProgressivePasses' not in df.columns:
            df['ProgressivePasses'] = 0.0
            df['ProgressivePassesPer90'] = 0.0
            
            for idx, row in df.iterrows():
                position = row['Position']
                coefs = PROGRESSIVE_PASS_COEFFICIENTS.get(position, 
                                                         PROGRESSIVE_PASS_COEFFICIENTS['MF'])
                
                passes_total = row['PassesCompleted']
                passes_per_90 = row.get('PassesCompletedPer90', 0)
                completion = row['PassCompletionPct'] / 100.0
                
                prog_passes_total = (
                    passes_total * coefs['base_rate'] * 
                    coefs['success_multiplier'] * 
                    completion
                )
                
                prog_passes_per_90 = (
                    passes_per_90 * coefs['base_rate'] * 
                    coefs['success_multiplier'] * 
                    completion
                )
                
                df.at[idx, 'ProgressivePasses'] = prog_passes_total
                df.at[idx, 'ProgressivePassesPer90'] = prog_passes_per_90
        
        if 'KeyPasses' not in df.columns:
            df['KeyPasses'] = df['xA'] * 2.5
            df['KeyPassesPer90'] = df['xAPer90'] * 2.5
        
        print(f"   ✓ PassesCompleted (Total) range: {df['PassesCompleted'].min():.0f} - {df['PassesCompleted'].max():.0f}")
        
        return df
    
    def _derive_defensive_metrics(self, df: pd.DataFrame) -> pd.DataFrame:
        """Derive defensive statistics."""
        
        tackles_per_90_by_pos = {'FW': 0.5, 'MF': 2.0, 'DF': 3.5, 'GK': 0.1}
        interceptions_per_90_by_pos = {'FW': 0.3, 'MF': 1.5, 'DF': 2.5, 'GK': 0.1}
        
        if 'Tackles' not in df.columns:
            df['Tackles'] = 0.0
            df['TacklesPer90'] = 0.0
            
            for idx, row in df.iterrows():
                nineties = row['Minutes'] / 90.0 if row['Minutes'] > 0 else 0
                position = row['Position']
                tackle_rate = tackles_per_90_by_pos.get(position, 2.0)
                
                tackles = tackle_rate * nineties
                df.at[idx, 'Tackles'] = tackles
                df.at[idx, 'TacklesPer90'] = tackle_rate
        
        if 'Interceptions' not in df.columns:
            df['Interceptions'] = 0.0
            
            for idx, row in df.iterrows():
                nineties = row['Minutes'] / 90.0 if row['Minutes'] > 0 else 0
                position = row['Position']
                int_rate = interceptions_per_90_by_pos.get(position, 1.5)
                
                df.at[idx, 'Interceptions'] = int_rate * nineties
        
        print(f"   ✓ Tackles range: {df['Tackles'].min():.1f} - {df['Tackles'].max():.1f}")
        
        return df
    
    def _derive_dribbling_metrics(self, df: pd.DataFrame) -> pd.DataFrame:
        """Derive dribbling statistics."""
        
        if 'DribblesCompleted' not in df.columns:
            df['DribblesCompleted'] = 0.0
            df['DribblesPer90'] = 0.0
            df['DribbleSuccessPct'] = 0.0
            
            for idx, row in df.iterrows():
                position = row['Position']
                coefs = DRIBBLE_COEFFICIENTS.get(position, DRIBBLE_COEFFICIENTS['MF'])
                
                nineties = row['Minutes'] / 90.0 if row['Minutes'] > 0 else 0
                
                dribbles_attempted = coefs['per_90_base'] * nineties
                dribbles_completed = dribbles_attempted * coefs['success_rate']
                
                df.at[idx, 'DribblesCompleted'] = dribbles_completed
                df.at[idx, 'DribblesPer90'] = coefs['per_90_base']
                df.at[idx, 'DribbleSuccessPct'] = coefs['success_rate'] * 100
        
        print(f"   ✓ DribblesCompleted range: {df['DribblesCompleted'].min():.1f} - {df['DribblesCompleted'].max():.1f}")
        
        return df
    
    def _derive_ball_control_metrics(self, df: pd.DataFrame) -> pd.DataFrame:
        """Derive ball control statistics."""
        
        touches_per_90_by_pos = {'FW': 45, 'MF': 70, 'DF': 60, 'GK': 30}
        
        if 'Touches' not in df.columns:
            df['Touches'] = 0.0
            df['TouchesPer90'] = 0.0
            
            for idx, row in df.iterrows():
                nineties = row['Minutes'] / 90.0 if row['Minutes'] > 0 else 0
                position = row['Position']
                touch_rate = touches_per_90_by_pos.get(position, 60)
                
                touches = touch_rate * nineties
                df.at[idx, 'Touches'] = touches
                df.at[idx, 'TouchesPer90'] = touch_rate
        
        print(f"   ✓ Touches range: {df['Touches'].min():.0f} - {df['Touches'].max():.0f}")
        
        return df
    
    def _derive_pressing_metrics(self, df: pd.DataFrame) -> pd.DataFrame:
        """Derive pressing statistics."""
        
        pressures_per_90_by_pos = {'FW': 12, 'MF': 15, 'DF': 10, 'GK': 2}
        
        if 'Pressures' not in df.columns:
            df['Pressures'] = 0.0
            
            for idx, row in df.iterrows():
                nineties = row['Minutes'] / 90.0 if row['Minutes'] > 0 else 0
                position = row['Position']
                pressure_rate = pressures_per_90_by_pos.get(position, 12)
                
                df.at[idx, 'Pressures'] = pressure_rate * nineties
        
        print(f"   ✓ Pressures range: {df['Pressures'].min():.0f} - {df['Pressures'].max():.0f}")
        
        return df
    
    def _derive_chance_creation_metrics(self, df: pd.DataFrame) -> pd.DataFrame:
        """Derive shot-creating actions (SCA) and goal-creating actions (GCA)."""
        
        if 'SCA' not in df.columns:
            df['SCA'] = 0.0
            df['SCAPer90'] = 0.0
            
            for idx, row in df.iterrows():
                nineties = row['Minutes'] / 90.0 if row['Minutes'] > 0 else 0
                
                xa = row.get('xA', 0)
                dribbles = row.get('DribblesCompleted', 0)
                
                sca = xa * 1.5 + dribbles * 0.3 + row['Goals'] * 0.5
                
                df.at[idx, 'SCA'] = sca
                df.at[idx, 'SCAPer90'] = safe_divide_vectorized(sca, nineties, 0)
        
        if 'GCA' not in df.columns:
            df['GCA'] = df['SCA'] * 0.2
            df['GCAPer90'] = df['SCAPer90'] * 0.2
        
        print(f"   ✓ SCA range: {df['SCA'].min():.1f} - {df['SCA'].max():.1f}")
        
        return df


def derive_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Convenience function to derive all features.
    
    Args:
        df: DataFrame with basic stats
    
    Returns:
        DataFrame with derived advanced stats
    """
    derivation = FeatureDerivation()
    return derivation.derive_all_features(df)