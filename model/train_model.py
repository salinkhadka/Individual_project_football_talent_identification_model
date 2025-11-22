"""
Talent Identification System - Model Training Script
Loads player statistics, engineers features, trains a potential predictor model
"""

import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
import joblib
import os

# Try XGBoost first, fallback to RandomForest
try:
    from xgboost import XGBRegressor
    MODEL_TYPE = "XGBoost"
    print("✓ XGBoost available - using XGBRegressor")
except ImportError:
    from sklearn.ensemble import RandomForestRegressor
    MODEL_TYPE = "RandomForest"
    print("⚠ XGBoost not found - using RandomForestRegressor")

# ==================== CONFIGURATION ====================
DATA_PATH = "data/players.csv"
MODEL_OUTPUT = "model/talent_model.pkl"
TOP_PLAYERS_OUTPUT = "model/top_players.csv"
SCALER_OUTPUT = "model/scaler.pkl"

# MINIMUM MATCHES THRESHOLD FOR RELIABLE STATISTICS
MIN_MATCHES_THRESHOLD = 5

# Column name mappings (handle variations in CSV headers)
COLUMN_MAPPINGS = {
    'Player': ['Player', 'player', 'Name', 'name'],
    'Squad': ['Squad', 'squad', 'Team', 'team'],
    'Pos': ['Pos', 'pos', 'Position', 'position'],
    'Age': ['Age', 'age'],
    'MP': ['MP', 'mp', 'Matches', 'matches'],
    'Starts': ['Starts', 'starts', 'GS'],
    'Min': ['Min', 'min', 'Minutes', 'minutes'],
    '90s': ['90s', '90', 'Nineties'],
    'Gls': ['Gls', 'gls', 'Goals', 'goals'],
    'Ast': ['Ast', 'ast', 'Assists', 'assists'],
    'G+A': ['G+A', 'g+a', 'GoalsAssists'],
    'CrdY': ['CrdY', 'crdy', 'YellowCards', 'yellow'],
    'CrdR': ['CrdR', 'crdr', 'RedCards', 'red']
}

def clean_column_names(df):
    """Clean multi-level column headers to simple names and make them unique"""
    new_columns = []
    for col in df.columns:
        # If column is a tuple (multi-level), take the last part
        if isinstance(col, tuple):
            col = col[-1]
        # Convert to string and clean
        col = str(col).strip()
        
        # Handle patterns like "0_level_0 Rk" or "Playing Time MP"
        if '_level_0' in col:
            # Extract the part after the space: "0_level_0 Rk" -> "Rk"
            parts = col.split(' ', 1)
            if len(parts) > 1:
                col = parts[1]
            else:
                # If no space, try to extract from the pattern
                # "0_level_0" -> keep as is (will be handled later)
                col = parts[0]
        elif ' ' in col and not col.startswith(('0', '1', '2', '3', '4', '5', '6', '7', '8', '9')):
            # For "Playing Time MP", take the last part (but not for "0_level_0 X")
            parts = col.split()
            col = parts[-1]
        
        new_columns.append(col)
    
    # Make column names unique by adding suffix for duplicates
    seen = {}
    unique_columns = []
    for col in new_columns:
        if col in seen:
            seen[col] += 1
            unique_columns.append(f"{col}_{seen[col]}")
        else:
            seen[col] = 0
            unique_columns.append(col)
    
    df.columns = unique_columns
    return df

def find_column(df, standard_name):
    """Find column in dataframe using multiple possible names"""
    for possible_name in COLUMN_MAPPINGS.get(standard_name, [standard_name]):
        if possible_name in df.columns:
            return possible_name
    return None

def load_and_prepare_data(filepath):
    """Load CSV and map columns to standard names"""
    print(f"\n{'='*60}")
    print(f"Loading data from: {filepath}")
    print(f"{'='*60}")
    
    # Try different encodings
    encodings = ['utf-8', 'latin-1', 'iso-8859-1', 'cp1252']
    df = None
    
    for encoding in encodings:
        try:
            # First, peek at the file to check header structure
            with open(filepath, 'r', encoding=encoding) as f:
                first_line = f.readline()
            
            # Check if multi-level header (has multiple header rows)
            # For now, assume single header
            df = pd.read_csv(filepath, encoding=encoding)
            print(f"  ✓ Successfully loaded with encoding: {encoding}")
            break
        except (UnicodeDecodeError, Exception) as e:
            continue
    
    if df is None:
        raise ValueError("Could not read CSV with any common encoding")
    
    # Clean multi-level headers
    df = clean_column_names(df)
    
    print(f"✓ Loaded {len(df)} players")
    print(f"✓ Cleaned columns: {list(df.columns[:15])}")
    
    # Map columns to standard names
    column_map = {}
    for standard_name in COLUMN_MAPPINGS.keys():
        found_col = find_column(df, standard_name)
        if found_col and found_col != standard_name:
            column_map[found_col] = standard_name
    
    if column_map:
        df = df.rename(columns=column_map)
        print(f"✓ Mapped columns: {column_map}")
    
    return df

def engineer_features(df):
    """Create derived features for talent prediction"""
    print(f"\n{'='*60}")
    print("Engineering Features")
    print(f"{'='*60}")
    
    df = df.copy()
    
    # Debug: Show actual column names and types
    print(f"  Column names in dataframe: {df.columns.tolist()[:15]}")
    
    # Fill missing values before calculations
    numeric_cols = ['MP', 'Starts', 'Min', '90s', 'Gls', 'Ast', 'CrdY', 'CrdR']
    for col in numeric_cols:
        if col in df.columns:
            try:
                # Get the column as a series
                col_data = df[col]
                print(f"  Processing {col}: type={type(col_data)}, dtype={col_data.dtype if hasattr(col_data, 'dtype') else 'N/A'}")
                
                # Convert to numeric first
                df[col] = pd.to_numeric(col_data, errors='coerce')
                missing_count = df[col].isna().sum()
                if missing_count > 0:
                    print(f"  Filling {missing_count} missing values in {col} with 0")
                df[col] = df[col].fillna(0)
            except Exception as e:
                print(f"  ⚠ Error processing {col}: {e}")
                continue
    
    # Age handling
    if 'Age' in df.columns:
        df['Age'] = pd.to_numeric(df['Age'], errors='coerce')
        df['Age'] = df['Age'].fillna(df['Age'].median())
    
    # Feature engineering with safe division
    if '90s' in df.columns and 'Gls' in df.columns:
        df['G_per90'] = np.where(df['90s'] > 0, df['Gls'] / df['90s'], 0)
        print("  ✓ Created G_per90 (Goals per 90 minutes)")
    
    if '90s' in df.columns and 'Ast' in df.columns:
        df['A_per90'] = np.where(df['90s'] > 0, df['Ast'] / df['90s'], 0)
        print("  ✓ Created A_per90 (Assists per 90 minutes)")
    
    if 'Min' in df.columns and 'MP' in df.columns:
        df['Minutes_per_match'] = np.where(df['MP'] > 0, df['Min'] / df['MP'], 0)
        print("  ✓ Created Minutes_per_match")
    
    if 'Starts' in df.columns and 'MP' in df.columns:
        df['Start_rate'] = np.where(df['MP'] > 0, df['Starts'] / df['MP'], 0)
        print("  ✓ Created Start_rate (Starting XI frequency)")
    
    # Age factor (younger players get slight bonus)
    if 'Age' in df.columns:
        # Normalize age to 0-1 (inverted: younger = higher)
        age_min, age_max = df['Age'].min(), df['Age'].max()
        if age_max > age_min:
            df['Age_factor'] = 1 - (df['Age'] - age_min) / (age_max - age_min)
        else:
            df['Age_factor'] = 0.5
        print("  ✓ Created Age_factor (youth bonus)")
    
    # Discipline factor (fewer cards = better)
    if 'CrdY' in df.columns and 'CrdR' in df.columns:
        df['Discipline_score'] = 1 - (df['CrdY'] * 0.1 + df['CrdR'] * 0.5).clip(0, 1)
        print("  ✓ Created Discipline_score")
    
    return df

def apply_confidence_penalty(df, min_matches=MIN_MATCHES_THRESHOLD):
    """
    Apply confidence penalty for players with insufficient match data
    
    Players with < min_matches get their score scaled down proportionally:
    - 1 match = 20% of score (1/5)
    - 2 matches = 40% of score (2/5)
    - 3 matches = 60% of score (3/5)
    - 4 matches = 80% of score (4/5)
    - 5+ matches = 100% of score (no penalty)
    
    Also adds a flag column to identify low-sample players
    """
    print(f"\n{'='*60}")
    print(f"Applying Confidence Penalty (Threshold: {min_matches} matches)")
    print(f"{'='*60}")
    
    if 'MP' not in df.columns:
        print("  ⚠ MP column not found, skipping confidence penalty")
        df['LowSample'] = False
        return df
    
    # Count players by match categories
    low_sample = (df['MP'] < min_matches).sum()
    reliable_sample = (df['MP'] >= min_matches).sum()
    
    print(f"  Players with < {min_matches} matches: {low_sample} ({low_sample/len(df)*100:.1f}%)")
    print(f"  Players with ≥ {min_matches} matches: {reliable_sample} ({reliable_sample/len(df)*100:.1f}%)")
    
    # Create flag for low sample players
    df['LowSample'] = df['MP'] < min_matches
    
    # Apply penalty: scale score by (matches / min_matches)
    # Clip at min_matches to avoid giving bonus to high-match players
    df['ConfidenceFactor'] = np.minimum(df['MP'] / min_matches, 1.0)
    
    # Store original score before penalty
    df['PotentialScore_Raw'] = df['PotentialScore']
    
    # Apply penalty to potential score
    df['PotentialScore'] = df['PotentialScore'] * df['ConfidenceFactor']
    
    # Show impact
    penalty_applied = df[df['LowSample']]
    if len(penalty_applied) > 0:
        avg_penalty = (1 - penalty_applied['ConfidenceFactor'].mean()) * 100
        print(f"  ✓ Average penalty applied: {avg_penalty:.1f}% score reduction")
        print(f"\n  Example penalties:")
        for matches in range(1, min(5, min_matches)):
            penalty_pct = (1 - matches/min_matches) * 100
            print(f"    {matches} match{'es' if matches > 1 else ''}: {penalty_pct:.0f}% penalty")
    
    return df

def create_potential_target(df):
    """
    Create a heuristic potential score if no labeled target exists
    Formula weighs offensive output, playing time, and youth
    """
    print(f"\n{'='*60}")
    print("Creating Potential Score (Heuristic)")
    print(f"{'='*60}")
    
    # Weighted formula for potential
    weights = {
        'G_per90': 0.30,          # Goals are most important
        'A_per90': 0.20,          # Assists matter
        'Minutes_per_match': 0.15, # Playing time indicates trust
        'Start_rate': 0.15,        # Starting XI frequency
        'Age_factor': 0.10,        # Youth bonus
        'Discipline_score': 0.10   # Professional conduct
    }
    
    print("  Heuristic weights:")
    for feature, weight in weights.items():
        print(f"    {feature}: {weight:.2f}")
    
    # Calculate raw potential - initialize as zeros
    potential_raw = pd.Series(0.0, index=df.index)
    
    for feature, weight in weights.items():
        if feature in df.columns:
            potential_raw += df[feature].fillna(0) * weight
        else:
            print(f"  ⚠ Feature {feature} not found, skipping")
    
    # Scale to 0-100 range
    scaler = MinMaxScaler(feature_range=(0, 100))
    df['PotentialScore'] = scaler.fit_transform(potential_raw.values.reshape(-1, 1))
    
    print(f"  ✓ Potential score range (before confidence penalty): {df['PotentialScore'].min():.1f} - {df['PotentialScore'].max():.1f}")
    print(f"  ✓ Mean potential (before confidence penalty): {df['PotentialScore'].mean():.1f}")
    
    # Apply confidence penalty for low-sample players
    df = apply_confidence_penalty(df)
    
    print(f"  ✓ Potential score range (after confidence penalty): {df['PotentialScore'].min():.1f} - {df['PotentialScore'].max():.1f}")
    print(f"  ✓ Mean potential (after confidence penalty): {df['PotentialScore'].mean():.1f}")
    
    return df, scaler

def train_model(df):
    """Train ML model to predict potential"""
    print(f"\n{'='*60}")
    print(f"Training {MODEL_TYPE} Model")
    print(f"{'='*60}")
    
    # Feature columns for training
    feature_cols = ['G_per90', 'A_per90', 'Minutes_per_match', 'Start_rate', 
                    'Age_factor', 'Discipline_score', 'MP', '90s']
    feature_cols = [col for col in feature_cols if col in df.columns]
    
    X = df[feature_cols].fillna(0)
    y = df['PotentialScore']
    
    print(f"  Features used: {feature_cols}")
    print(f"  Training samples: {len(X)}")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Train model
    if MODEL_TYPE == "XGBoost":
        model = XGBRegressor(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42,
            verbosity=0
        )
    else:
        model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            random_state=42,
            n_jobs=-1
        )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)
    
    print(f"\n  Model Performance:")
    print(f"    R² Score: {r2:.4f}")
    print(f"    RMSE: {rmse:.4f}")
    
    # Feature importance
    if hasattr(model, 'feature_importances_'):
        print(f"\n  Feature Importances:")
        importances = sorted(
            zip(feature_cols, model.feature_importances_),
            key=lambda x: x[1],
            reverse=True
        )
        for feat, imp in importances:
            print(f"    {feat}: {imp:.4f}")
    
    return model, feature_cols

def save_top_players(df, n=100):
    """
    Generate and save a ranked list of the top high-potential players.
    Adds rank, checks for low-sample players, prints a summary,
    and saves the output CSV inside /model.
    """

    print("\n" + "="*60)
    print(f"Saving Top {n} High-Potential Players")
    print("="*60)

    # Columns we want (only keep those that exist to avoid errors)
    desired_cols = [
        'Player', 'Squad', 'Pos', 'Age', 'MP', 'Min',
        'G_per90', 'A_per90', 'Minutes_per_match',
        'PotentialScore', 'LowSample'
    ]
    valid_cols = [c for c in desired_cols if c in df.columns]

    # Get top N players by potential score
    if 'PotentialScore' not in df.columns:
        raise ValueError("❌ ERROR: 'PotentialScore' column not found in DataFrame.")

    top_df = df.nlargest(n, 'PotentialScore')[valid_cols].copy()
    top_df = top_df.round(2)

    # Add ranking column
    top_df.insert(0, 'Rank', range(1, len(top_df) + 1))

    # Ensure directory exists
    os.makedirs('model', exist_ok=True)

    # Save to CSV
    top_df.to_csv(TOP_PLAYERS_OUTPUT, index=False)
    print(f"  ✓ Saved top players to: {TOP_PLAYERS_OUTPUT}")

    # Show Top 10 Summary
    print("\n  Top 10 High-Potential Players")
    print("  " + "-"*80)
    print(f"  {'Rank':<6}{'Player':<25}{'Squad':<20}{'MP':<6}{'Potential':<12}{'Status'}")
    print("  " + "-"*80)

    for _, row in top_df.head(10).iterrows():
        player = str(row.get('Player', 'Unknown'))[:24]
        squad = str(row.get('Squad', 'Unknown'))[:19]
        mp = int(row.get('MP', 0))
        pot = row.get('PotentialScore', 0)
        low = row.get('LowSample', False)

        status = "⚠️ Low Sample" if low else "✓ Reliable"

        print(f"  {row['Rank']:<6}{player:<25}{squad:<20}{mp:<6}{pot:<12.2f}{status}")

    # Stats
    low_count = top_df['LowSample'].sum() if 'LowSample' in top_df.columns else 0
    print("\n  Statistics")
    print("  " + "-"*40)
    print(f"    Players with low match samples (< threshold): {low_count}")
    print(f"    Total players saved: {len(top_df)}")

    return top_df


def main():
    """Main training pipeline"""
    print("\n" + "="*60)
    print("TALENT IDENTIFICATION SYSTEM - MODEL TRAINING")
    print("="*60)
    
    # Load data
    df = load_and_prepare_data(DATA_PATH)
    
    # Engineer features
    df = engineer_features(df)
    
    # Create potential target (includes confidence penalty)
    df, scaler = create_potential_target(df)
    
    # Train model
    model, feature_cols = train_model(df)
    
    # Save outputs
    os.makedirs('model', exist_ok=True)
    joblib.dump(model, MODEL_OUTPUT)
    joblib.dump({'feature_cols': feature_cols, 'scaler': scaler}, SCALER_OUTPUT)
    print(f"\n✓ Model saved to {MODEL_OUTPUT}")
    print(f"✓ Scaler saved to {SCALER_OUTPUT}")
    
    # Save top players
    save_top_players(df)
    
    print(f"\n{'='*60}")
    print("✓ TRAINING COMPLETE!")
    print(f"{'='*60}")
    print(f"\nKey Features:")
    print(f"  • Confidence penalty applied to players with < {MIN_MATCHES_THRESHOLD} matches")
    print(f"  • Low-sample players flagged in output CSV")
    print(f"  • Scores adjusted proportionally: 1 match = 20%, 5+ matches = 100%")
    print(f"\n{'='*60}\n")

if __name__ == "__main__":
    main()