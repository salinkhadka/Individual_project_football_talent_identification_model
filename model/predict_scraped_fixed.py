"""
Predict Youth Potential on Scraped Bundesliga Data - FINAL CORRECTED VERSION
=============================================================================
FIXED: Restores correct player mapping (Danfa #1).
FIXED: Prevents "Stat Scrambling" by resetting index after deduplication.
FIXED: Forces numeric types to ensure the row with 31 Goals is kept over 0 Goals.
FIXED: Goalkeeper stats - Uses CS% and GA90 (the stats that actually exist in CSV)
UPDATED: Integrated enhanced GK handling with correct column mapping.
"""

import pandas as pd
import numpy as np
import os
import sys
from datetime import datetime

# Import from config
from config_new import (
    DATA_DIR, OUTPUT_DIR, SCRAPED_FILES, GK_FILES, GK_COLUMNS,
    SCRAPED_COLUMNS, standardize_position, calculate_age_from_birth_year,
    TOP_N_PROSPECTS, MIN_MATCHES_PLAYED, MIN_POTENTIAL_THRESHOLD
)

# Import FIXED calculators
from xg_calculator import DirectXGCalculator
from performance_calculator_fixed import (
    calculate_all_potentials_hybrid, 
    validate_distribution_hybrid,
    get_player_progression,
    export_top_prospects_comprehensive
)


class BundesligaPredictorFixed:
    """FIXED performance-based predictor with comprehensive outputs and corrected GK stats."""
    
    def __init__(self):
        self.df = None
        self.df_latest_season = None
        self.season_order = None
        self.df_all_with_potentials = None
        self.df_top_100 = None
        self.position_data = None
        self.progression_df = None
    
    def load_scraped_data(self):
        """Load all Bundesliga U19 season files including goalkeepers with CORRECTED GK stats."""
        print("\n" + "=" * 70)
        print("LOADING BUNDESLIGA U19 DATA (PLAYERS + GOALKEEPERS)")
        print("=" * 70)
        
        all_data = []
        season_order = {}
        
        # Load outfield players
        print("\n📂 Loading outfield players...")
        for idx, (season, filename) in enumerate(SCRAPED_FILES.items()):
            filepath = os.path.join(DATA_DIR, filename)
            
            if not os.path.exists(filepath):
                print(f"⚠️  {season} file not found: {filepath}")
                continue
            
            print(f"   • {season}...", end="")
            df_season = pd.read_csv(filepath)
            
            # Clean duplicate columns
            if df_season.columns.duplicated().any():
                df_season = df_season.loc[:, ~df_season.columns.duplicated()]
            
            # Rename columns
            df_season = df_season.rename(columns=SCRAPED_COLUMNS)
            
            # Clean again after rename
            if df_season.columns.duplicated().any():
                df_season = df_season.loc[:, ~df_season.columns.duplicated()]

            df_season['Season'] = season
            df_season['SeasonOrder'] = idx
            
            all_data.append(df_season)
            season_order[season] = idx
            print(f" {len(df_season)} players")
        
        # Load goalkeepers with CORRECTED handling
        print("\n🧤 Loading goalkeepers (using CS% and GA90)...")
        for idx, (season, filename) in enumerate(GK_FILES.items()):
            filepath = os.path.join(DATA_DIR, filename)
            
            if not os.path.exists(filepath):
                print(f"⚠️  {season} GK file not found: {filepath}")
                continue
            
            print(f"   • {season}...", end="")
            df_gk = pd.read_csv(filepath)
            
            # Clean duplicate columns first
            if df_gk.columns.duplicated().any():
                df_gk = df_gk.loc[:, ~df_gk.columns.duplicated()]
            
            # Apply standard rename from config (this maps CS%, GA90, etc.)
            df_gk = df_gk.rename(columns=GK_COLUMNS)

            # Clean duplicates again after rename
            if df_gk.columns.duplicated().any():
                print(f" (cleaned duplicates)", end="")
                df_gk = df_gk.loc[:, ~df_gk.columns.duplicated()]

            df_gk['Season'] = season
            df_gk['SeasonOrder'] = idx
            df_gk['Position'] = 'GK'
            
            # Add missing columns for GKs to match outfield structure
            for col in ['Goals', 'Assists', 'Shots', 'ShotsOnTarget']:
                if col not in df_gk.columns:
                    df_gk[col] = 0
            
            df_gk['GoalsPer90'] = 0.0
            
            # CRITICAL: Handle SavePercentage - if it's NaN, set to 0
            # The CSV has Save% column but it's all NaN, so we'll rely on CS% and GA90
            if 'SavePercentage' in df_gk.columns:
                df_gk['SavePercentage'] = pd.to_numeric(df_gk['SavePercentage'], errors='coerce').fillna(0)
            else:
                df_gk['SavePercentage'] = 0
            
            if 'Saves' in df_gk.columns:
                df_gk['Saves'] = pd.to_numeric(df_gk['Saves'], errors='coerce').fillna(0)
            else:
                df_gk['Saves'] = 0
            
            # Deduplicate GKs via aggregation
            # Ensure we only aggregate columns that actually exist in the dataframe
            agg_dict = {
                'Matches': 'max', 'Starts': 'max', 'Minutes': 'max', 'Nineties': 'max',
                'GoalsAgainst': 'max', 'GoalsAgainstPer90': 'max', 
                'CleanSheets': 'max', 'CleanSheetPercentage': 'max',
                'SavePercentage': 'max', 'Saves': 'max',
                'Age': 'first', 'BirthYear': 'first', 'Nation': 'first', 'Club': 'first',
                'Position': 'first', 'Season': 'first', 'SeasonOrder': 'first',
                'Goals': 'first', 'Assists': 'first'
            }
            agg_dict_filtered = {k: v for k, v in agg_dict.items() if k in df_gk.columns}
            
            if df_gk['Player'].duplicated().sum() > 0:
                print(f" (merging duplicates)", end="")
                df_gk = df_gk.groupby('Player', as_index=False).agg(agg_dict_filtered)
            
            all_data.append(df_gk)
            season_order[season] = idx
            print(f" {len(df_gk)} goalkeepers")
        
        if not all_data:
            raise FileNotFoundError(f"No data files found in {DATA_DIR}")
        
        self.df = pd.concat(all_data, ignore_index=True)
        self.season_order = season_order
        
        print(f"\n✅ Total records loaded: {len(self.df)}")
        
        # Show GK stats summary
        gk_data = self.df[self.df['Position'] == 'GK']
        if len(gk_data) > 0:
            print(f"\n🧤 Goalkeeper Stats Summary:")
            print(f"   • Total GK records: {len(gk_data)}")
            if 'CleanSheetPercentage' in gk_data.columns:
                non_zero_cs = (gk_data['CleanSheetPercentage'] > 0).sum()
                print(f"   • GKs with CS% data: {non_zero_cs}")
                if non_zero_cs > 0:
                    print(f"   • Avg CS%: {gk_data[gk_data['CleanSheetPercentage'] > 0]['CleanSheetPercentage'].mean():.1f}%")
            if 'GoalsAgainstPer90' in gk_data.columns:
                non_zero_ga = (gk_data['GoalsAgainstPer90'] > 0).sum()
                print(f"   • GKs with GA90 data: {non_zero_ga}")
                if non_zero_ga > 0:
                    print(f"   • Avg GA90: {gk_data[gk_data['GoalsAgainstPer90'] > 0]['GoalsAgainstPer90'].mean():.2f}")

    def preprocess_scraped_data(self):
        """Clean and standardize scraped data with SAFE deduplication (Including GKs)."""
        print("\n" + "=" * 70)
        print("PREPROCESSING SCRAPED DATA (SAFE DEDUPLICATION)")
        print("=" * 70)
        
        df = self.df.copy()
        
        # 1. Standardize Age & Position
        if 'BirthYear' in df.columns:
            df['Age'] = df['BirthYear'].apply(lambda x: calculate_age_from_birth_year(x) if pd.notna(x) else 18)
        else:
            df['Age'] = 18
            
        if 'Position' in df.columns:
            df['Position'] = df['Position'].apply(standardize_position)
        else:
            df['Position'] = 'MF'

        # 2. Force Numeric Types (CRITICAL for sorting)
        # We must ensure '31' > '0' works mathematically
        # UPDATED: CleanSheetPercentage and GoalsAgainstPer90 (the stats that actually exist)
        numeric_targets = ['Goals', 'Assists', 'Matches', 'Minutes', 'Starts', 
                          'CleanSheetPercentage', 'GoalsAgainstPer90', 'GoalsAgainst', 'CleanSheets']
        for col in numeric_targets:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce').fillna(0)

        # 3. Handle NaNs
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            df[col] = df[col].fillna(0)
            
        # 4. Calculate 90s
        if 'Nineties' not in df.columns and 'Minutes' in df.columns:
            df['Nineties'] = df['Minutes'] / 90.0
        
        if 'GoalsPer90' not in df.columns:
            df['GoalsPer90'] = df.apply(
                lambda row: row['Goals'] / row['Nineties'] if row.get('Nineties', 0) > 0 and row['Position'] != 'GK' else 0,
                axis=1
            )
            
        if 'Starts' not in df.columns:
            df['Starts'] = df['Matches']

        # ========================================
        # CRITICAL FIX: SAFE DEDUPLICATION
        # ========================================
        print("\n🔍 Executing Safe Deduplication...")
        initial_count = len(df)
        
        # Sort so the "Best" row is at the top
        # Priority: Player -> Season -> Most Goals -> Most CS% -> Lowest GA90 -> Most Assists -> Most Matches
        # UPDATED: Use CleanSheetPercentage (exists) instead of SavePercentage (doesn't exist)
        
        sort_cols = ['Player', 'Season', 'Goals']
        
        if 'CleanSheetPercentage' in df.columns:
            sort_cols.append('CleanSheetPercentage')
        
        # For GA90, we want LOWER is better, so we'll sort ascending for this one
        # But we need to handle it separately
        if 'Assists' in df.columns:
            sort_cols.append('Assists')
            
        sort_cols.extend(['Matches', 'Minutes'])
        
        # Create ascending order list
        # Player/Season=True (ascending), Stats=False (descending for higher is better)
        ascending_order = [True, True] + [False] * (len(sort_cols) - 2)

        df = df.sort_values(sort_cols, ascending=ascending_order)
        
        # Drop duplicates, keeping the top row (Highest stats)
        df = df.drop_duplicates(subset=['Player', 'Season'], keep='first')
        
        # *** THE FIX: RESET INDEX ***
        # This prevents stats from "Till Neininger" jumping to "Iaia Danfa"
        df = df.reset_index(drop=True)
        
        removed_count = initial_count - len(df)
        print(f"   ✓ Removed {removed_count} duplicate rows (kept rows with highest stats)")
        
        self.df = df
        print("\n✓ Preprocessing complete")
        
        # Show top GKs by CS%
        gk_data = df[df['Position'] == 'GK']
        if len(gk_data) > 0 and 'CleanSheetPercentage' in gk_data.columns:
            top_gks = gk_data[gk_data['CleanSheetPercentage'] > 0].nlargest(5, 'CleanSheetPercentage')
            if len(top_gks) > 0:
                print(f"\n🧤 Top 5 GKs by Clean Sheet %:")
                for _, gk in top_gks.iterrows():
                    print(f"   • {gk['Player']}: {gk['CleanSheetPercentage']:.1f}% CS, {gk['GoalsAgainstPer90']:.2f} GA90")
        
        # Verify Danfa immediately
        danfa = df[df['Player'].str.contains('danfa', case=False, na=False)]
        if len(danfa) > 0:
             print(f"\n🔍 Verification - Iaia Danfa Stats (After Clean):")
             print(danfa[['Player', 'Season', 'Goals', 'Matches']].to_string(index=False))

    def derive_missing_features(self):
        """Derive advanced statistics using FIXED xG/xA."""
        print("\n" + "=" * 70)
        print("DERIVING MISSING ADVANCED FEATURES (FIXED)")
        print("=" * 70)
        
        calculator = DirectXGCalculator()
        # Ensure calculator uses the clean, index-reset dataframe
        self.df = calculator.calculate_xg_xa(self.df)
        print("\n✅ xG/xA calculated directly from goals/assists")
    
    def calculate_realistic_potential(self):
        """Calculate potential using REALISTIC formula."""
        print("\n" + "=" * 70)
        print("CALCULATING REALISTIC POTENTIAL SCORES")
        print("=" * 70)

        self.df_all_with_potentials, self.df_top_100, self.position_data = calculate_all_potentials_hybrid(self.df)
        print(f"\n✅ Realistic potential calculated for {len(self.df_all_with_potentials)} players")
        validate_distribution_hybrid(self.df_top_100, "Top 100 Prospects")
    
    def identify_latest_season_per_player(self):
        """Identify latest season for each player for ranking."""
        print("\n" + "=" * 70)
        print("IDENTIFYING LATEST SEASON PER PLAYER")
        print("=" * 70)
        
        latest_season_indices = self.df_all_with_potentials.groupby('Player')['SeasonOrder'].idxmax()
        self.df_all_with_potentials['IsLatestSeason'] = False
        self.df_all_with_potentials.loc[latest_season_indices, 'IsLatestSeason'] = True
        
        self.df_latest_season = self.df_all_with_potentials[self.df_all_with_potentials['IsLatestSeason']].copy()
        print(f"\n✓ Latest season identified for {len(self.df_latest_season)} players")
    
    def calculate_player_progression(self):
        """Calculate player progression across seasons."""
        print("\n" + "=" * 70)
        print("CALCULATING PLAYER PROGRESSION")
        print("=" * 70)
        
        self.progression_df = get_player_progression(self.df_all_with_potentials)
        if len(self.progression_df) > 0:
            improved = self.progression_df[self.progression_df['PotentialChange'] > 5]
            print(f"\n📈 Players with significant improvement (>5 points): {len(improved)}")
    
    def rank_top_prospects(self):
        """Rank top prospects based on LATEST season only."""
        print("\n" + "=" * 70)
        print("RANKING TOP PROSPECTS (LATEST SEASON ONLY)")
        print("=" * 70)
        
        df = self.df_latest_season.copy()
        
        prospects = df[
            (df['Matches'] >= MIN_MATCHES_PLAYED) &
            (df['PredictedPotential'] >= MIN_POTENTIAL_THRESHOLD)
        ].copy()
        
        prospects = prospects.sort_values(
            ['PredictedPotential', 'PerformanceScore'], 
            ascending=[False, False]
        )
        
        prospects['Rank'] = range(1, len(prospects) + 1)
        top_prospects = prospects.head(TOP_N_PROSPECTS)
        
        print(f"\n🌟 Top {len(top_prospects)} prospects identified (latest season)")
        
        # Verify Danfa
        danfa_in_top = top_prospects[top_prospects['Player'].str.contains('danfa', case=False, na=False)]
        if len(danfa_in_top) > 0:
            row = danfa_in_top.iloc[0]
            print(f"\n✅ Iaia Danfa Rank: #{row['Rank']} | Goals: {row['Goals']} | Potential: {row['PredictedPotential']:.1f}")
        else:
            print("\n❌ Iaia Danfa NOT in Top Prospects (Check filtering/deduplication)")
            
        return top_prospects
    
    def get_position_rankings_top_25(self):
        """Get top 25 players by position (latest season only)."""
        print("\n📍 Creating position-specific rankings (Top 25 per position)...")
        
        df = self.df_latest_season.copy()
        df = df[
            (df['Matches'] >= MIN_MATCHES_PLAYED) &
            (df['PredictedPotential'] >= 70)
        ]
        
        position_rankings = {}
        for position in ['FW', 'MF', 'DF', 'GK']:
            pos_players = df[df['Position'] == position].copy()
            pos_players = pos_players.sort_values(
                ['PredictedPotential', 'PerformanceScore'],
                ascending=[False, False]
            )
            
            pos_top_25 = pos_players.head(25).copy()
            pos_top_25['PositionRank'] = range(1, len(pos_top_25) + 1)
            position_rankings[position] = pos_top_25
            print(f"   • {position}: {len(pos_top_25)} players")
        
        return position_rankings
    
    def generate_scouting_report(self, top_prospects):
        """Generate detailed scouting report."""
        report = []
        report.append("=" * 80)
        report.append("BUNDESLIGA U19 - COMPREHENSIVE SCOUTING REPORT")
        report.append("=" * 80)
        report.append(f"\nGenerated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        report.append("\n" + "=" * 80)
        report.append("TOP PROSPECTS RANKING")
        report.append("=" * 80)
        
        for idx, row in top_prospects.iterrows():
            report.append(f"\n{'─' * 80}")
            report.append(f"RANK #{int(row['Rank'])} - {row['Player']}")
            report.append(f"{'─' * 80}")
            report.append(f"Position: {row.get('Position', 'Unknown'):12s}  Age: {int(row['Age'])}")
            report.append(f"Club: {row.get('Club', 'Unknown')}")
            report.append(f"Season: {row.get('Season', 'Unknown')}")
            
            report.append("")
            report.append("📊 RATINGS:")
            report.append(f"   Predicted Potential:   {row['PredictedPotential']:.1f}/100")
            report.append(f"   Performance Score:     {row['PerformanceScore']:.1f}/100")
            
            if row.get('SamplePenalty', 0) < 0:
                report.append(f"   ⚠️  Small sample penalty: {row.get('SamplePenalty', 0)}")
            
            report.append("")
            report.append("⚽ PERFORMANCE STATS:")
            report.append(f"   Matches Played:    {int(row['Matches'])}")
            report.append(f"   Minutes Played:    {int(row['Minutes'])}")
            
            if row['Position'] != 'GK':
                report.append(f"   Goals:             {int(row['Goals'])}")
                report.append(f"   Goals per 90:      {row.get('GoalsPer90', 0):.2f}")
                if 'Assists' in row:
                    report.append(f"   Assists:           {int(row.get('Assists', 0))}")
            else:
                # Use the stats that actually exist
                report.append(f"   Clean Sheet%:      {row.get('CleanSheetPercentage', 0):.1f}%")
                report.append(f"   GA per 90:         {row.get('GoalsAgainstPer90', 0):.2f}")
                if 'CleanSheets' in row:
                    report.append(f"   Clean Sheets:      {int(row.get('CleanSheets', 0))}")
            
            report.append("")
            
            if row['PredictedPotential'] >= 90:
                tier = "⭐⭐⭐⭐ EXCEPTIONAL"
            elif row['PredictedPotential'] >= 85:
                tier = "⭐⭐⭐ ELITE PROSPECT"
            elif row['PredictedPotential'] >= 80:
                tier = "⭐⭐ HIGH PRIORITY"
            else:
                tier = "⭐ PROMISING"
            
            report.append(f"🎯 SCOUT ASSESSMENT: {tier}")
        
        return "\n".join(report)

    def export_comprehensive_analysis(self, top_prospects, position_rankings):
        """Export comprehensive analysis to Excel."""
        print("\n" + "=" * 70)
        print("EXPORTING COMPREHENSIVE ANALYSIS TO EXCEL")
        print("=" * 70)
        
        excel_path = os.path.join(OUTPUT_DIR, 'bundesliga_comprehensive_analysis.xlsx')
        
        export_path = export_top_prospects_comprehensive(
            df_all=self.df_all_with_potentials,
            df_top_100=self.df_top_100,
            position_data=self.position_data,
            progression_df=self.progression_df,
            output_path=excel_path
        )
        print(f"\n💾 Comprehensive analysis exported: {export_path}")
        return export_path

    def run_player_diagnostic(self, player_name="Iaia Danfa"):
        """Run diagnostic checks for a specific player."""
        print("\n" + "=" * 80)
        print(f"DIAGNOSTIC CHECKS FOR: {player_name.upper()}")
        print("=" * 80)
        
        player_latest = self.df_latest_season[
            self.df_latest_season['Player'].str.contains(player_name.lower(), case=False, na=False)
        ]
        
        if len(player_latest) == 0:
            print(f"❌ {player_name} is NOT in df_latest_season")
        else:
            print(f"✓ {player_name} IS in df_latest_season")
            cols = ['Player', 'Season', 'Matches', 'Goals', 'PredictedPotential', 'Rank']
            cols = [c for c in cols if c in player_latest.columns]
            print(player_latest[cols].to_string(index=False))

    def run_full_pipeline(self):
        """Run complete prediction pipeline."""
        print("\n" + "=" * 80)
        print("BUNDESLIGA U19 YOUTH POTENTIAL - COMPREHENSIVE ANALYSIS")
        print("=" * 80)
        print("📊 GK Stats Note: Using CS% and GA90 (Save% data unavailable in CSV)")
        
        # 1. Load & Preprocess (Safe Deduplication)
        self.load_scraped_data()
        self.preprocess_scraped_data()
        self.derive_missing_features()
        
        # 2. Calculate Potentials
        self.calculate_realistic_potential()
        self.identify_latest_season_per_player()
        self.calculate_player_progression()
        
        # 3. Rank & Report
        top_prospects = self.rank_top_prospects()
        position_rankings = self.get_position_rankings_top_25()
        
        self.run_player_diagnostic(player_name="Iaia Danfa")
        
        report = self.generate_scouting_report(top_prospects)
        
        # 4. Export
        self.export_comprehensive_analysis(top_prospects, position_rankings)
        
        report_path = os.path.join(OUTPUT_DIR, 'bundesliga_scouting_report_comprehensive.txt')
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report)
            
        print("\n" + "=" * 70)
        print("ANALYSIS COMPLETE!")
        print("=" * 70)
        
        return top_prospects, position_rankings, report


def main():
    predictor = BundesligaPredictorFixed()
    top_prospects, position_rankings, report = predictor.run_full_pipeline()
    return predictor, top_prospects, position_rankings, report


if __name__ == "__main__":
    try:
        main()
        print("\n✅ Bundesliga prediction completed successfully!")
    except Exception as e:
        print(f"\n❌ Prediction failed: {str(e)}")
        import traceback
        traceback.print_exc()