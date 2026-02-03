"""
Prediction Script - Find Top Youth Prospects
=============================================

This script uses the trained model to:
1. Predict potential for all players
2. Rank top prospects
3. Generate a scouting report
"""

import pandas as pd
import numpy as np
import os
from datetime import datetime

from config import (
    OUTPUT_DIR, TOP_N_PROSPECTS, MIN_POTENTIAL_THRESHOLD,
    MIN_MATCHES_PLAYED
)
from data_loader import load_data
from feature_engineering import engineer_features, FeatureEngineer
from model import load_model


class ProspectFinder:
    """
    Find and rank top youth prospects using the trained model.
    """
    
    def __init__(self, model_path: str = None):
        """
        Initialize the prospect finder.
        
        Args:
            model_path: Path to saved model (uses default if None)
        """
        print("\n" + "=" * 70)
        print("YOUTH PROSPECT FINDER")
        print("=" * 70)
        
        print("\n📂 Loading trained model...")
        self.model = load_model(model_path)
        
        print("✓ Model loaded successfully")
        
        self.df = None
        self.predictions = None
        self.feature_engineer = FeatureEngineer()
    
    def load_and_predict(self, use_latest_season: bool = True):
        """
        Load data and generate predictions.
        
        Args:
            use_latest_season: If True, only predict for latest season
        """
        print("\n" + "=" * 70)
        print("LOADING DATA & GENERATING PREDICTIONS")
        print("=" * 70)
        
        # Load data
        print("\n1️⃣ Loading multi-season data...")
        self.df = load_data(fill_missing=True)
        
        print("2️⃣ Engineering features...")
        self.df = engineer_features(self.df)
        
        # Filter to latest season if requested
        if use_latest_season:
            latest_season = self.df['Season'].max()
            print(f"3️⃣ Filtering to latest season: {latest_season}")
            self.df = self.df[self.df['Season'] == latest_season].copy()
        
        # Prepare features
        print("4️⃣ Preparing features for prediction...")
        feature_cols = self.feature_engineer.get_feature_columns()
        X = self.model.prepare_data(self.df, feature_cols)
        
        # Make predictions
        print("5️⃣ Generating predictions...")
        predictions = self.model.predict(X)
        
        self.df['predicted_next_season'] = predictions[:, 0]
        self.df['predicted_peak_potential'] = predictions[:, 1]
        
        print(f"\n✓ Predictions generated for {len(self.df)} players")
    
    def rank_prospects(self, min_matches: int = MIN_MATCHES_PLAYED,
                      min_potential: float = MIN_POTENTIAL_THRESHOLD,
                      top_n: int = TOP_N_PROSPECTS) -> pd.DataFrame:
        """
        Rank players by their predicted potential.
        
        Args:
            min_matches: Minimum matches to be considered
            min_potential: Minimum potential threshold
            top_n: Number of top prospects to return
        
        Returns:
            DataFrame with top prospects
        """
        if self.df is None:
            raise ValueError("Must run load_and_predict() first")
        
        print("\n" + "=" * 70)
        print("RANKING TOP PROSPECTS")
        print("=" * 70)
        
        # CRITICAL FIX: Filter out unrealistic outliers
        # Remove players with suspiciously high current ratings but low activity
        valid_prospects = self.df[
            # Basic activity requirement
            (self.df['Playing Time_MP_std'] >= min_matches) &
            (self.df['predicted_peak_potential'] >= min_potential) &
            # CRITICAL: Filter out statistical anomalies
            ~(
                (self.df['current_rating'] > 90) & 
                (self.df['Playing Time_MP_std'] < 5) &
                (self.df['Performance_Gls'] < 3)
            ) &
            # Ensure potential is reasonably above current for youth
            (self.df['predicted_peak_potential'] >= self.df['current_rating'])
        ].copy()
        
        print(f"\n📊 Filtering criteria:")
        print(f"   • Minimum matches: {min_matches}")
        print(f"   • Minimum potential: {min_potential}")
        print(f"   • Players meeting criteria: {len(valid_prospects)}")
        print(f"   • Filtered out anomalies: {len(self.df) - len(valid_prospects)}")
        
        # Sort by predicted potential
        prospects = valid_prospects.sort_values('predicted_peak_potential', ascending=False)
        
        # Add ranking
        prospects['rank'] = range(1, len(prospects) + 1)
        
        # Calculate potential gain (how much they can improve)
        prospects['potential_gain'] = (prospects['predicted_peak_potential'] - 
                                       prospects['current_rating'])
        
        # Select top N
        top_prospects = prospects.head(top_n)
        
        print(f"\n🌟 Top {top_n} Prospects Identified")
        
        return top_prospects
    
    def generate_scouting_report(self, top_prospects: pd.DataFrame) -> str:
        """
        Generate a detailed scouting report.
        
        Args:
            top_prospects: DataFrame with top prospects
        
        Returns:
            Formatted report string
        """
        report = []
        report.append("=" * 80)
        report.append("YOUTH PLAYER SCOUTING REPORT")
        report.append("=" * 80)
        report.append(f"\nGenerated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append(f"Total Prospects Analyzed: {len(self.df)}")
        report.append(f"Top Prospects Listed: {len(top_prospects)}")
        report.append("\n" + "=" * 80)
        report.append("TOP PROSPECTS RANKING")
        report.append("=" * 80)
        
        for idx, row in top_prospects.iterrows():
            report.append(f"\n{'─' * 80}")
            report.append(f"RANK #{int(row['rank'])} - {row['Player']}")
            report.append(f"{'─' * 80}")
            report.append(f"Position: {row.get('Pos_std', 'Unknown'):12s}  Age: {int(row['Age_std'])}")
            report.append(f"Team: {row.get('Squad_std', 'Unknown')}")
            report.append("")
            report.append("📊 RATINGS:")
            report.append(f"   Current Rating:        {row['current_rating']:.1f}/100")
            report.append(f"   Predicted Next Season: {row['predicted_next_season']:.1f}/100")
            report.append(f"   Peak Potential:        {row['predicted_peak_potential']:.1f}/100")
            report.append(f"   Potential Gain:        +{row['potential_gain']:.1f} points")
            report.append("")
            report.append("⚽ PERFORMANCE STATS:")
            report.append(f"   Matches Played:    {int(row['Playing Time_MP_std'])}")
            report.append(f"   Goals:             {int(row['Performance_Gls'])}")
            report.append(f"   Goals per 90:      {row['Per 90 Minutes_Gls']:.2f}")
            report.append(f"   Minutes Played:    {int(row['Playing Time_Min_std'])}")
            report.append(f"   Starts:            {int(row['Starts_Starts'])}")
            report.append("")
            report.append("📈 DEVELOPMENT:")
            report.append(f"   Season Growth Rate: {row['season_growth_rate']:+.1f}")
            report.append(f"   Consistency Score:  {row['consistency_score']:.2f}")
            report.append(f"   Age Bonus:          {row['age_bonus']:.1f}")
            report.append("")
            
            # Scout recommendation
            if row['predicted_peak_potential'] >= 85:
                tier = "⭐⭐⭐ ELITE PROSPECT"
                recommendation = "Must-sign player. Exceptional potential."
            elif row['predicted_peak_potential'] >= 75:
                tier = "⭐⭐ HIGH PRIORITY"
                recommendation = "Strong prospect. Recommended signing."
            elif row['predicted_peak_potential'] >= 65:
                tier = "⭐ MONITOR"
                recommendation = "Promising player. Continue monitoring."
            else:
                tier = "DEPTH OPTION"
                recommendation = "Potential squad depth player."
            
            report.append(f"🎯 SCOUT ASSESSMENT: {tier}")
            report.append(f"   {recommendation}")
        
        report.append("\n" + "=" * 80)
        report.append("SUMMARY STATISTICS")
        report.append("=" * 80)
        
        # Position breakdown
        report.append("\n📍 By Position:")
        pos_breakdown = top_prospects.groupby('Pos_std').size().sort_values(ascending=False)
        for pos, count in pos_breakdown.items():
            report.append(f"   {pos}: {count} players")
        
        # Age breakdown
        report.append("\n👶 By Age:")
        age_bins = [15, 18, 21, 24, 30]
        age_labels = ['15-17', '18-20', '21-23', '24+']
        top_prospects['age_group'] = pd.cut(top_prospects['Age_std'], 
                                            bins=age_bins, labels=age_labels)
        age_breakdown = top_prospects['age_group'].value_counts().sort_index()
        for age_group, count in age_breakdown.items():
            report.append(f"   {age_group}: {count} players")
        
        # Average stats
        report.append("\n📊 Average Stats:")
        report.append(f"   Peak Potential:    {top_prospects['predicted_peak_potential'].mean():.1f}")
        report.append(f"   Current Rating:    {top_prospects['current_rating'].mean():.1f}")
        report.append(f"   Potential Gain:    {top_prospects['potential_gain'].mean():.1f}")
        report.append(f"   Goals per 90:      {top_prospects['Per 90 Minutes_Gls'].mean():.2f}")
        
        report.append("\n" + "=" * 80)
        report.append("END OF REPORT")
        report.append("=" * 80)
        
        return "\n".join(report)
    
    def save_results(self, top_prospects: pd.DataFrame, report: str):
        """
        Save predictions and report to files.
        
        Args:
            top_prospects: DataFrame with top prospects
            report: Scouting report string
        """
        print("\n" + "=" * 70)
        print("SAVING RESULTS")
        print("=" * 70)
        
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        
        # Save top prospects CSV
        prospects_path = os.path.join(OUTPUT_DIR, 'top_prospects.csv')
        
        output_cols = [
            'rank', 'Player', 'Pos_std', 'Age_std', 'Squad_std',
            'current_rating', 'predicted_next_season', 'predicted_peak_potential',
            'potential_gain', 'Playing Time_MP_std', 'Performance_Gls',
            'Per 90 Minutes_Gls', 'season_growth_rate', 'consistency_score'
        ]
        
        # Only include columns that exist
        output_cols = [col for col in output_cols if col in top_prospects.columns]
        
        top_prospects[output_cols].to_csv(prospects_path, index=False)
        print(f"\n💾 Top prospects saved: {prospects_path}")
        
        # Save full predictions (all players)
        all_predictions_path = os.path.join(OUTPUT_DIR, 'all_player_predictions.csv')
        
        pred_cols = [
            'Player', 'Season', 'Pos_std', 'Age_std', 'Squad_std',
            'current_rating', 'predicted_next_season', 'predicted_peak_potential',
            'Playing Time_MP_std', 'Performance_Gls'
        ]
        pred_cols = [col for col in pred_cols if col in self.df.columns]
        
        self.df[pred_cols].sort_values('predicted_peak_potential', 
                                       ascending=False).to_csv(all_predictions_path, index=False)
        print(f"💾 All predictions saved: {all_predictions_path}")
        
        # Save scouting report
        report_path = os.path.join(OUTPUT_DIR, 'scouting_report.txt')
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report)
        print(f"💾 Scouting report saved: {report_path}")
        
        print("\n✅ All results saved successfully!")


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    """
    Main prediction function.
    """
    print("\n🔍 Starting prospect identification...")
    
    # Initialize finder
    finder = ProspectFinder()
    
    # Load data and generate predictions
    finder.load_and_predict(use_latest_season=True)
    
    # Rank prospects
    top_prospects = finder.rank_prospects(
        min_matches=MIN_MATCHES_PLAYED,
        min_potential=MIN_POTENTIAL_THRESHOLD,
        top_n=TOP_N_PROSPECTS
    )
    
    # Generate scouting report
    print("\n📝 Generating scouting report...")
    report = finder.generate_scouting_report(top_prospects)
    
    # Print top 10 to console
    print("\n" + "=" * 70)
    print(f"TOP 10 PROSPECTS PREVIEW")
    print("=" * 70)
    
    display_cols = ['rank', 'Player', 'Pos_std', 'Age_std', 
                   'predicted_peak_potential', 'current_rating', 'potential_gain']
    display_cols = [col for col in display_cols if col in top_prospects.columns]
    
    print("\n" + top_prospects.head(10)[display_cols].to_string(index=False))
    
    # Save results
    finder.save_results(top_prospects, report)
    
    print("\n" + "=" * 70)
    print("PREDICTION COMPLETE!")
    print("=" * 70)
    print(f"\n📁 Check the '{OUTPUT_DIR}' folder for:")
    print("   • top_prospects.csv - Top ranked players")
    print("   • all_player_predictions.csv - All players ranked")
    print("   • scouting_report.txt - Detailed scouting analysis")
    
    return top_prospects, report


if __name__ == "__main__":
    try:
        top_prospects, report = main()
        print("\n✅ Prospect identification completed successfully!")
        
    except FileNotFoundError as e:
        print("\n❌ Error: Model not found!")
        print("Please run 'python train.py' first to train the model.")
        print(f"Details: {str(e)}")
        
    except Exception as e:
        print(f"\n❌ Prediction failed: {str(e)}")
        import traceback
        traceback.print_exc()