"""
Multi-Season Data Loader for Youth Player Potential System
===========================================================

This module handles:
1. Loading multiple season CSV files
2. Merging players across seasons
3. Handling missing players with smart imputation
4. Data validation and cleaning
"""

import pandas as pd
import numpy as np
import os
from typing import List, Dict, Tuple
import warnings
warnings.filterwarnings('ignore')

from config import (
    DATA_DIR, SEASONS, SEASON_LABELS, NUMERIC_COLS, 
    CATEGORICAL_COLS, ID_COLS, FORWARD_FILL_DECAY,
    USE_POSITION_MEDIAN_FOR_NEW_PLAYERS, MIN_MATCHES_FOR_BASELINE
)


class MultiSeasonDataLoader:
    """
    Loads and processes youth player data across multiple seasons.
    Handles missing players and inconsistent data.
    """
    
    def __init__(self, data_dir: str = DATA_DIR):
        self.data_dir = data_dir
        self.season_dfs = {}  # Store individual season dataframes
        self.merged_df = None  # Final merged dataframe
        self.position_medians = {}  # For imputing new players
        
    def load_all_seasons(self) -> pd.DataFrame:
        """
        Load all season CSV files and merge them.
        
        Returns:
            DataFrame with all seasons combined, including Season column
        """
        print("=" * 70)
        print("LOADING MULTI-SEASON DATA")
        print("=" * 70)
        
        all_seasons = []
        
        for season_file, season_label in zip(SEASONS, SEASON_LABELS):
            file_path = os.path.join(self.data_dir, season_file)
            
            if not os.path.exists(file_path):
                print(f"⚠️  WARNING: {season_file} not found. Skipping...")
                continue
            
            print(f"\n📂 Loading {season_label}...")
            df = self._load_single_season(file_path, season_label)
            
            if df is not None and len(df) > 0:
                self.season_dfs[season_label] = df
                all_seasons.append(df)
                print(f"   ✓ Loaded {len(df)} players")
            else:
                print(f"   ✗ Failed to load {season_file}")
        
        if not all_seasons:
            raise ValueError("No season data loaded! Check your data directory.")
        
        # Combine all seasons
        print(f"\n🔗 Merging {len(all_seasons)} seasons...")
        self.merged_df = pd.concat(all_seasons, ignore_index=True)
        
        print(f"   ✓ Total records: {len(self.merged_df)}")
        print(f"   ✓ Unique players: {self.merged_df['Player'].nunique()}")
        
        # Calculate position medians for imputation
        self._calculate_position_medians()
        
        return self.merged_df
    
    def _load_single_season(self, file_path: str, season_label: str) -> pd.DataFrame:
        """
        Load and clean a single season CSV.
        
        Args:
            file_path: Path to CSV file
            season_label: Label for this season (e.g., "2023-24")
        
        Returns:
            Cleaned DataFrame with Season column added
        """
        try:
            df = pd.read_csv(file_path)
            
            # Clean column names (remove leading/trailing whitespace)
            df.columns = df.columns.str.strip()
            
            # Add season identifier
            df['Season'] = season_label
            
            # Clean numeric columns
            df = self._clean_numeric_columns(df)
            
            # Handle missing values in critical columns
            df = self._handle_missing_values(df)
            
            # Remove duplicate players within same season
            df = df.drop_duplicates(subset=['Player'], keep='first')
            
            return df
            
        except Exception as e:
            print(f"   ✗ Error loading {file_path}: {str(e)}")
            return None
    
    def _clean_numeric_columns(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Convert numeric columns to proper numeric types.
        """
        for col in NUMERIC_COLS:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        
        return df
    
    def _handle_missing_values(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Handle missing values in the dataset.
        - Numeric columns: Fill with 0 (conservative approach)
        - Categorical columns: Fill with 'Unknown'
        """
        # Numeric columns: fill with 0
        for col in NUMERIC_COLS:
            if col in df.columns:
                df[col] = df[col].fillna(0)
        
        # Categorical columns: fill with Unknown
        for col in CATEGORICAL_COLS:
            if col in df.columns:
                df[col] = df[col].fillna('Unknown')
        
        # Player name cannot be missing
        df = df[df['Player'].notna()]
        
        return df
    
    def _calculate_position_medians(self):
        """
        Calculate median stats by position for imputation of new players.
        """
        if self.merged_df is None or 'Pos_std' not in self.merged_df.columns:
            return
        
        print("\n📊 Calculating position-based medians for imputation...")
        
        # Only use players with minimum matches
        reliable_players = self.merged_df[
            self.merged_df['Playing Time_MP_std'] >= MIN_MATCHES_FOR_BASELINE
        ]
        
        for position in reliable_players['Pos_std'].unique():
            if pd.isna(position) or position == 'Unknown':
                continue
            
            pos_data = reliable_players[reliable_players['Pos_std'] == position]
            
            # Calculate medians for all numeric columns
            medians = {}
            for col in NUMERIC_COLS:
                if col in pos_data.columns:
                    medians[col] = pos_data[col].median()
            
            self.position_medians[position] = medians
            print(f"   ✓ {position}: {len(pos_data)} players")
    
    def fill_missing_seasons(self) -> pd.DataFrame:
        """
        Handle players missing in certain seasons using forward-fill with decay.
        
        Strategy:
        1. For each player, identify all seasons they appear in
        2. If missing in a season between appearances, interpolate
        3. If missing after last appearance, forward-fill with decay
        
        Returns:
            DataFrame with imputed missing seasons
        """
        if self.merged_df is None:
            raise ValueError("Must load data first using load_all_seasons()")
        
        print("\n" + "=" * 70)
        print("HANDLING MISSING SEASONS")
        print("=" * 70)
        
        df = self.merged_df.copy()
        all_players = df['Player'].unique()
        all_seasons = sorted(df['Season'].unique())
        
        imputed_records = []
        stats = {'forward_filled': 0, 'interpolated': 0}
        
        for player in all_players:
            player_data = df[df['Player'] == player].sort_values('Season')
            player_seasons = player_data['Season'].tolist()
            
            # Player appears in all seasons - no imputation needed
            if len(player_seasons) == len(all_seasons):
                continue
            
            missing_seasons = [s for s in all_seasons if s not in player_seasons]
            
            if not missing_seasons:
                continue
            
            # Get player's position for median fallback
            player_position = player_data['Pos_std'].iloc[0]
            
            for missing_season in missing_seasons:
                missing_idx = all_seasons.index(missing_season)
                
                # Try to find nearest past season data
                past_seasons = [s for s in player_seasons if all_seasons.index(s) < missing_idx]
                future_seasons = [s for s in player_seasons if all_seasons.index(s) > missing_idx]
                
                if past_seasons:
                    # Forward fill with decay
                    last_season = past_seasons[-1]
                    last_data = player_data[player_data['Season'] == last_season].iloc[0]
                    
                    seasons_gap = missing_idx - all_seasons.index(last_season)
                    decay_factor = FORWARD_FILL_DECAY ** seasons_gap
                    
                    imputed_row = self._create_imputed_row(
                        last_data, missing_season, decay_factor, player_position
                    )
                    imputed_records.append(imputed_row)
                    stats['forward_filled'] += 1
                    
                elif future_seasons:
                    # Backward fill (rare case - player appears later)
                    next_season = future_seasons[0]
                    next_data = player_data[player_data['Season'] == next_season].iloc[0]
                    
                    # Use reduced stats (assume they were developing)
                    imputed_row = self._create_imputed_row(
                        next_data, missing_season, 0.7, player_position
                    )
                    imputed_records.append(imputed_row)
                    stats['interpolated'] += 1
                
                else:
                    # No data at all - use position median
                    if USE_POSITION_MEDIAN_FOR_NEW_PLAYERS and player_position in self.position_medians:
                        imputed_row = self._create_row_from_medians(
                            player, missing_season, player_position
                        )
                        imputed_records.append(imputed_row)
        
        print(f"\n📈 Imputation Statistics:")
        print(f"   • Forward-filled records: {stats['forward_filled']}")
        print(f"   • Interpolated records: {stats['interpolated']}")
        
        if imputed_records:
            imputed_df = pd.DataFrame(imputed_records)
            df = pd.concat([df, imputed_df], ignore_index=True)
            print(f"   ✓ Added {len(imputed_records)} imputed records")
        
        # Sort by player and season
        df = df.sort_values(['Player', 'Season']).reset_index(drop=True)
        
        self.merged_df = df
        return df
    
    def _create_imputed_row(self, base_row: pd.Series, season: str, 
                           decay_factor: float, position: str) -> Dict:
        """
        Create an imputed row by applying decay to numeric stats.
        """
        imputed = base_row.to_dict()
        imputed['Season'] = season
        
        # Apply decay to performance stats (not age/birth year)
        performance_cols = [col for col in NUMERIC_COLS if col not in ['Age_std', 'Born_std']]
        
        for col in performance_cols:
            if col in imputed:
                imputed[col] = imputed[col] * decay_factor
        
        # Mark as imputed
        imputed['is_imputed'] = True
        
        return imputed
    
    def _create_row_from_medians(self, player: str, season: str, position: str) -> Dict:
        """
        Create a row using position median values (for completely new players).
        """
        row = {'Player': player, 'Season': season, 'Pos_std': position, 'is_imputed': True}
        
        if position in self.position_medians:
            row.update(self.position_medians[position])
        else:
            # Use zeros if no position median available
            for col in NUMERIC_COLS:
                row[col] = 0
        
        return row
    
    def get_player_history(self, player_name: str) -> pd.DataFrame:
        """
        Get all season data for a specific player.
        
        Args:
            player_name: Name of the player
        
        Returns:
            DataFrame with player's data across all seasons
        """
        if self.merged_df is None:
            raise ValueError("Must load data first")
        
        return self.merged_df[self.merged_df['Player'] == player_name].sort_values('Season')
    
    def get_season_data(self, season: str) -> pd.DataFrame:
        """
        Get all players from a specific season.
        
        Args:
            season: Season label (e.g., "2023-24")
        
        Returns:
            DataFrame with all players from that season
        """
        if season in self.season_dfs:
            return self.season_dfs[season]
        elif self.merged_df is not None:
            return self.merged_df[self.merged_df['Season'] == season]
        else:
            raise ValueError(f"Season {season} not found")
    
    def validate_data(self) -> bool:
        """
        Run validation checks on the loaded data.
        
        Returns:
            True if data passes all checks
        """
        print("\n" + "=" * 70)
        print("DATA VALIDATION")
        print("=" * 70)
        
        if self.merged_df is None:
            print("✗ No data loaded")
            return False
        
        df = self.merged_df
        issues = []
        
        # Check 1: Required columns exist
        required_cols = NUMERIC_COLS + CATEGORICAL_COLS + ID_COLS + ['Season']
        missing_cols = [col for col in required_cols if col not in df.columns]
        if missing_cols:
            issues.append(f"Missing columns: {missing_cols}")
        
        # Check 2: No completely empty rows
        empty_rows = df[df[NUMERIC_COLS].isna().all(axis=1)]
        if len(empty_rows) > 0:
            issues.append(f"Found {len(empty_rows)} empty rows")
        
        # Check 3: Age consistency (Age_std will be calculated later from Born_std)
        if 'Age_std' in df.columns:
            age_issues = df[
                (df['Age_std'] < 14) | (df['Age_std'] > 22)
            ]
            if len(age_issues) > 0:
                issues.append(f"Found {len(age_issues)} players with unusual ages for U-19")
        elif 'Born_std' in df.columns:
            # Check birth years make sense
            current_year = 2025
            calculated_ages = current_year - df['Born_std']
            age_issues = calculated_ages[
                (calculated_ages < 14) | (calculated_ages > 22)
            ]
            if len(age_issues) > 0:
                issues.append(f"Found {len(age_issues)} players with unusual birth years for U-19")
        
        # Check 4: Each season has data
        season_counts = df.groupby('Season').size()
        print("\n📊 Records per season:")
        for season, count in season_counts.items():
            print(f"   • {season}: {count} players")
        
        # Report validation results
        if issues:
            print("\n⚠️  Validation Issues Found:")
            for issue in issues:
                print(f"   • {issue}")
            return False
        else:
            print("\n✓ All validation checks passed!")
            return True
    
    def get_summary_stats(self) -> pd.DataFrame:
        """
        Get summary statistics for the dataset.
        
        Returns:
            DataFrame with summary stats
        """
        if self.merged_df is None:
            raise ValueError("Must load data first")
        
        summary = {
            'Total Records': len(self.merged_df),
            'Unique Players': self.merged_df['Player'].nunique(),
            'Seasons': self.merged_df['Season'].nunique(),
            'Positions': self.merged_df['Pos_std'].nunique(),
            'Imputed Records': self.merged_df.get('is_imputed', pd.Series([False])).sum()
        }
        
        return pd.DataFrame([summary])


# ============================================================================
# CONVENIENCE FUNCTIONS
# ============================================================================

def load_data(fill_missing: bool = True) -> pd.DataFrame:
    """
    Convenience function to load all data in one call.
    
    Args:
        fill_missing: Whether to impute missing seasons
    
    Returns:
        Cleaned and merged DataFrame
    """
    loader = MultiSeasonDataLoader()
    df = loader.load_all_seasons()
    
    if fill_missing:
        df = loader.fill_missing_seasons()
    
    loader.validate_data()
    
    return df


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    # Test the data loader
    print("\n🧪 Testing Data Loader...")
    
    try:
        loader = MultiSeasonDataLoader()
        df = loader.load_all_seasons()
        df = loader.fill_missing_seasons()
        loader.validate_data()
        
        print("\n📊 Summary Statistics:")
        print(loader.get_summary_stats())
        
        # Show sample player history
        if len(df) > 0:
            sample_player = df['Player'].iloc[0]
            print(f"\n👤 Sample Player History: {sample_player}")
            print(loader.get_player_history(sample_player)[['Season', 'Playing Time_MP_std', 'Performance_Gls']])
        
        print("\n✅ Data loader test completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")