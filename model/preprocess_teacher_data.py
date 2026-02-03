"""
Preprocess Teacher's Dataset
=============================
Load, clean, and prepare teacher's 1120-row dataset for training
"""

import pandas as pd
import numpy as np
import os
from typing import Tuple

from config_new import (
    DATA_DIR, TEACHER_DATA_FILE, TEACHER_COLUMNS,
    standardize_position, calculate_age_from_birth_year
)


class TeacherDataProcessor:
    """Process teacher's dataset into training-ready format."""
    
    def __init__(self, data_path: str = None):
        if data_path is None:
            self.data_path = os.path.join(DATA_DIR, TEACHER_DATA_FILE)
        else:
            self.data_path = data_path
        
        self.df_raw = None
        self.df_processed = None
    
    def load_data(self) -> pd.DataFrame:
        """Load teacher's CSV file."""
        print("\n" + "=" * 70)
        print("LOADING TEACHER'S DATASET")
        print("=" * 70)
        
        if not os.path.exists(self.data_path):
            raise FileNotFoundError(
                f"Teacher's data not found at: {self.data_path}\n"
                f"Please place the file in: {DATA_DIR}/{TEACHER_DATA_FILE}"
            )
        
        print(f"\n📂 Loading: {self.data_path}")
        self.df_raw = pd.read_csv(self.data_path)
        
        print(f"✓ Loaded {len(self.df_raw)} players")
        print(f"✓ Columns: {len(self.df_raw.columns)}")
        
        return self.df_raw
    
    def clean_and_standardize(self) -> pd.DataFrame:
        """Clean and standardize column names and values."""
        print("\n" + "=" * 70)
        print("CLEANING & STANDARDIZING")
        print("=" * 70)
        
        df = self.df_raw.copy()
        
        # 1. Rename columns to standard format
        print("\n1️⃣ Renaming columns...")
        df = df.rename(columns=TEACHER_COLUMNS)
        print(f"   ✓ Standardized {len(TEACHER_COLUMNS)} columns")
        
        # 2. Handle missing values
        print("\n2️⃣ Handling missing values...")
        
        # Numeric columns: fill with 0
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if col not in ['CurrentAbility', 'PotentialAbility']:  # Don't fill targets
                df[col] = df[col].fillna(0)
        
        # Position: standardize
        print("\n3️⃣ Standardizing positions...")
        df['Position'] = df['Position'].apply(standardize_position)
        print(f"   ✓ Position distribution:")
        print(df['Position'].value_counts().to_string())
        
        # 4. Calculate derived fields
        print("\n4️⃣ Calculating derived fields...")
        
        # Minutes per match
        df['MinutesPerMatch'] = df.apply(
            lambda row: row['Minutes'] / row['Matches'] if row['Matches'] > 0 else 0,
            axis=1
        )
        
        # Start percentage
        df['StartPercentage'] = df.apply(
            lambda row: row['Starts'] / row['Matches'] if row['Matches'] > 0 else 0,
            axis=1
        )
        
        # Goals per match
        df['GoalsPerMatch'] = df.apply(
            lambda row: row['Goals'] / row['Matches'] if row['Matches'] > 0 else 0,
            axis=1
        )
        
        # Assists per match
        if 'Assists' in df.columns:
            df['AssistsPerMatch'] = df.apply(
                lambda row: row['Assists'] / row['Matches'] if row['Matches'] > 0 else 0,
                axis=1
            )
        
        # 90s played (for per-90 calculations)
        df['Nineties'] = df['Minutes'] / 90.0
        
        # Ensure per-90 stats are calculated
        if 'GoalsPer90' not in df.columns or df['GoalsPer90'].isna().all():
            df['GoalsPer90'] = df.apply(
                lambda row: (row['Goals'] / row['Nineties']) if row['Nineties'] > 0 else 0,
                axis=1
            )
        
        if 'AssistsPer90' not in df.columns or df['AssistsPer90'].isna().all():
            if 'Assists' in df.columns:
                df['AssistsPer90'] = df.apply(
                    lambda row: (row['Assists'] / row['Nineties']) if row['Nineties'] > 0 else 0,
                    axis=1
                )
        
        # 5. Remove players with missing target variables
        print("\n5️⃣ Filtering valid training samples...")
        before_count = len(df)
        df = df[df['CurrentAbility'].notna() & df['PotentialAbility'].notna()]
        after_count = len(df)
        
        if before_count > after_count:
            print(f"   ⚠️  Removed {before_count - after_count} players with missing targets")
        print(f"   ✓ Valid training samples: {after_count}")
        
        self.df_processed = df
        return df
    
    def validate_data(self) -> bool:
        """Run validation checks."""
        print("\n" + "=" * 70)
        print("DATA VALIDATION")
        print("=" * 70)
        
        df = self.df_processed
        issues = []
        
        # Check 1: Target variables exist
        if 'CurrentAbility' not in df.columns:
            issues.append("Missing CurrentAbility column")
        if 'PotentialAbility' not in df.columns:
            issues.append("Missing PotentialAbility column")
        
        # Check 2: Target variable ranges
        if 'CurrentAbility' in df.columns:
            curr_min, curr_max = df['CurrentAbility'].min(), df['CurrentAbility'].max()
            print(f"\n📊 CurrentAbility range: {curr_min:.1f} - {curr_max:.1f}")
            if curr_min < 0 or curr_max > 100:
                issues.append(f"CurrentAbility out of expected range (0-100)")
        
        if 'PotentialAbility' in df.columns:
            pot_min, pot_max = df['PotentialAbility'].min(), df['PotentialAbility'].max()
            print(f"📊 PotentialAbility range: {pot_min:.1f} - {pot_max:.1f}")
            if pot_min < 0 or pot_max > 100:
                issues.append(f"PotentialAbility out of expected range (0-100)")
        
        # Check 3: Basic statistics
        print(f"\n📊 Basic Statistics:")
        print(f"   • Total players: {len(df)}")
        print(f"   • Average age: {df['Age'].mean():.1f}")
        print(f"   • Average matches: {df['Matches'].mean():.1f}")
        print(f"   • Average goals: {df['Goals'].mean():.2f}")
        
        # Check 4: Position distribution
        print(f"\n📊 Position Distribution:")
        for pos, count in df['Position'].value_counts().items():
            pct = count / len(df) * 100
            print(f"   • {pos}: {count} ({pct:.1f}%)")
        
        # Check 5: Potential vs Current relationship
        if 'CurrentAbility' in df.columns and 'PotentialAbility' in df.columns:
            potential_higher = (df['PotentialAbility'] >= df['CurrentAbility']).mean()
            print(f"\n📊 Potential >= Current: {potential_higher*100:.1f}%")
            
            avg_growth = (df['PotentialAbility'] - df['CurrentAbility']).mean()
            print(f"📊 Average potential growth: +{avg_growth:.1f}")
        
        # Report issues
        if issues:
            print("\n⚠️  Validation Issues:")
            for issue in issues:
                print(f"   • {issue}")
            return False
        else:
            print("\n✅ All validation checks passed!")
            return True
    
    def get_feature_summary(self) -> pd.DataFrame:
        """Get summary of available features."""
        df = self.df_processed
        
        summary = []
        for col in df.columns:
            if col in ['Player', 'Nation', 'Club', 'League', 'Season']:
                continue
            
            summary.append({
                'Feature': col,
                'Type': df[col].dtype,
                'Missing': df[col].isna().sum(),
                'Missing %': df[col].isna().mean() * 100,
                'Min': df[col].min() if df[col].dtype in [np.number, int, float] else None,
                'Max': df[col].max() if df[col].dtype in [np.number, int, float] else None,
                'Mean': df[col].mean() if df[col].dtype in [np.number, int, float] else None
            })
        
        return pd.DataFrame(summary)
    
    def save_processed(self, output_path: str = None):
        """Save processed data."""
        if output_path is None:
            output_path = os.path.join(DATA_DIR, "teacher_data_processed.csv")
        
        self.df_processed.to_csv(output_path, index=False)
        print(f"\n💾 Processed data saved: {output_path}")
    
    def get_processed_data(self) -> pd.DataFrame:
        """Return processed DataFrame."""
        return self.df_processed


def load_and_process_teacher_data(save_processed: bool = True) -> pd.DataFrame:
    """
    Convenience function to load and process teacher's data.
    
    Args:
        save_processed: Whether to save processed data to CSV
    
    Returns:
        Processed DataFrame ready for training
    """
    processor = TeacherDataProcessor()
    
    # Load
    processor.load_data()
    
    # Clean and standardize
    df = processor.clean_and_standardize()
    
    # Validate
    processor.validate_data()
    
    # Print feature summary
    print("\n" + "=" * 70)
    print("FEATURE SUMMARY")
    print("=" * 70)
    summary = processor.get_feature_summary()
    print("\nAvailable features:")
    print(summary[['Feature', 'Type', 'Missing %', 'Mean']].head(20).to_string(index=False))
    
    # Save if requested
    if save_processed:
        processor.save_processed()
    
    return df


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    print("\n🧪 Testing Teacher Data Processing...")
    
    try:
        df = load_and_process_teacher_data(save_processed=True)
        
        print("\n" + "=" * 70)
        print("SAMPLE DATA")
        print("=" * 70)
        
        # Show sample players
        sample_cols = ['Player', 'Age', 'Position', 'Matches', 'Goals', 
                      'CurrentAbility', 'PotentialAbility']
        
        if all(col in df.columns for col in sample_cols):
            print("\nTop 10 players by potential:")
            print(df.nlargest(10, 'PotentialAbility')[sample_cols].to_string(index=False))
        
        print("\n✅ Teacher data processing test completed!")
        
    except FileNotFoundError as e:
        print(f"\n❌ Test failed: {str(e)}")
        print("\nPlease ensure teacher_data.csv is in the data/ directory")
        
    except Exception as e:
        print(f"\n❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()