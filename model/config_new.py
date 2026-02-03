"""
Configuration for Youth Player Potential Prediction - OBJECTIVE SYSTEM
=======================================================================
Stats-based evaluation: Performance > Reputation
"""

import numpy as np
import pandas as pd

# ============================================================================
# DIRECTORIES
# ============================================================================

DATA_DIR = "../data"
OUTPUT_DIR = "./outputs"
MODEL_DIR = "./saved_models"

# Teacher's dataset (ground truth for training)
TEACHER_DATA_FILE = "teacher_data.csv"

# Your scraped Bundesliga U19 files (Outfield players)
SCRAPED_FILES = {
    "2022-23": "players_2022-23.csv",
    "2023-24": "players_2023-24.csv",
    "2024-25": "players_2024-25.csv",
    "2025-26": "players_2025-26.csv"
}

# Goalkeeper files
GK_FILES = {
    "2024-25": "goalkeeping_stats_2024-25.csv",
    "2025-26": "goalkeeping_stats_2025_26.csv"
}

# ============================================================================
# COLUMN MAPPINGS: Teacher's Data → Standard Format
# ============================================================================

TEACHER_COLUMNS = {
    # Identifiers
    'player_id': 'player_id',
    'player_name': 'Player',
    'age': 'Age',
    'nationality': 'Nation',
    'position': 'Position',
    'secondary_position': 'SecondaryPosition',
    'foot': 'Foot',
    'height_cm': 'Height',
    'weight_kg': 'Weight',
    'club': 'Club',
    'league': 'League',
    
    # Playing Time
    'matches_played': 'Matches',
    'matches_started': 'Starts',
    'minutes_played': 'Minutes',
    
    # Performance - Goals & Assists
    'goals': 'Goals',
    'assists': 'Assists',
    'goals_per_90': 'GoalsPer90',
    'assists_per_90': 'AssistsPer90',
    
    # Expected Stats
    'xG': 'xG',
    'xA': 'xA',
    'xG_per_90': 'xGPer90',
    'xA_per_90': 'xAPer90',
    
    # Shooting
    'shots': 'Shots',
    'shots_on_target': 'ShotsOnTarget',
    'shot_accuracy': 'ShotAccuracy',
    
    # Passing
    'passes_completed': 'PassesCompleted',
    'pass_completion_pct': 'PassCompletionPct',
    'progressive_passes': 'ProgressivePasses',
    'key_passes': 'KeyPasses',
    'key_passes_per_90': 'KeyPassesPer90',
    
    # Defensive
    'tackles': 'Tackles',
    'tackles_per_90': 'TacklesPer90',
    'interceptions': 'Interceptions',
    'interceptions_per_90': 'InterceptionsPer90',
    'blocks': 'Blocks',
    'clearances': 'Clearances',
    'aerial_wins': 'AerialWins',
    'aerial_win_pct': 'AerialWinPct',
    
    # Dribbling & Carries
    'dribbles_completed': 'DribblesCompleted',
    'dribbles_per_90': 'DribblesPer90',
    'dribble_success_pct': 'DribbleSuccessPct',
    'progressive_carries': 'ProgressiveCarries',
    'progressive_carries_per_90': 'ProgressiveCarriesPer90',
    'carries_final_third': 'CarriesFinalThird',
    'carries_penalty_area': 'CarriesPenaltyArea',
    
    # Ball Control
    'touches': 'Touches',
    'touches_per_90': 'TouchesPer90',
    
    # Pressing
    'pressures': 'Pressures',
    'pressure_success': 'PressureSuccess',
    'pressure_success_pct': 'PressureSuccessPct',
    
    # Chance Creation
    'sca': 'SCA',
    'sca_per_90': 'SCAPer90',
    'gca': 'GCA',
    'gca_per_90': 'GCAPer90',
    
    # Goalkeeping
    'saves': 'Saves',
    'save_pct': 'SavePct',
    'clean_sheets': 'CleanSheets',
    'goals_against': 'GoalsAgainst',
    
    # Discipline
    'yellow_cards': 'YellowCards',
    'red_cards': 'RedCards',
    'fouls_committed': 'FoulsCommitted',
    'fouls_drawn': 'FoulsDrawn',
    
    # Market & Contract
    'market_value_eur': 'MarketValue',
    'wage_weekly_eur': 'Wage',
    'contract_expires': 'ContractExpires',
    
    # TARGET VARIABLES
    'current_ability': 'CurrentAbility',
    'potential_ability': 'PotentialAbility',
    'potential_category': 'PotentialCategory',
    
    # Season
    'season': 'Season'
}

# ============================================================================
# COLUMN MAPPINGS: Your Scraped Data → Standard Format
# ============================================================================

SCRAPED_COLUMNS = {
    'Player': 'Player',
    'Nation_std': 'Nation',
    'Pos_std': 'Position',
    'Squad_std': 'Club',
    'Born_std': 'BirthYear',
    
    # Playing Time
    'Playing Time_MP_std': 'Matches',
    'Playing Time_Starts': 'Starts',
    'Playing Time_Min_std': 'Minutes',
    'Playing Time_90s_std': 'Nineties',
    
    # Performance
    'Performance_Gls': 'Goals',
    'Performance_G-PK': 'GoalsNonPenalty',
    'Performance_PK': 'Penalties',
    'Performance_PKatt': 'PenaltiesAttempted',
    
    # Per 90
    'Per 90 Minutes_Gls': 'GoalsPer90',
    'Per 90 Minutes_G-PK': 'GoalsNonPenaltyPer90',
    
    # Additional Playing Time
    'Playing Time_Mn/MP': 'MinutesPerMatch',
    'Playing Time_Min%': 'MinutesPercentage',
    'Playing Time_90s_match': 'NinetiesPerMatch',
    
    # Starts Detail
    'Starts_Starts': 'StartsDetail',
    'Starts_Mn/Start': 'MinutesPerStart',
    'Starts_Compl': 'CompleteMatches',
    
    # Subs
    'Subs_Subs': 'SubAppearances',
    'Subs_Mn/Sub': 'MinutesPerSub',
    'Subs_unSub': 'UnusedSub',
    
    # Team Success
    'Team Success_PPM': 'PointsPerMatch',
    'Team Success_onG': 'GoalsFor',
    'Team Success_onGA': 'GoalsAgainst',
    'Team Success_+/-': 'GoalDifference',
    'Team Success_+/-90': 'GoalDifferencePer90',
    'Team Success_On-Off': 'OnOffDifference'
}

# ============================================================================
# COLUMN MAPPINGS: Goalkeeper Data → Standard Format
# ============================================================================

GK_COLUMNS = {
    'Rk': 'Rank',
    'Player': 'Player',
    'Nation': 'Nation',
    'Pos': 'Position',
    'Squad': 'Club',
    'Age': 'Age',
    'Born': 'BirthYear',
    'MP': 'Matches',
    'Starts': 'Starts',
    'Min': 'Minutes',
    '90s': 'Nineties',
    'GA': 'GoalsAgainst',
    'GA90': 'GoalsAgainstPer90',
    'SoTA': 'ShotsOnTargetAgainst',
    'Saves': 'Saves',
    'Save%': 'SavePercentage',
    'W': 'Wins',
    'D': 'Draws',
    'L': 'Losses',
    'CS': 'CleanSheets',
    'CS%': 'CleanSheetPercentage',
    'PKatt': 'PKAttempted',
    'PKA': 'PKAllowed',
    'PKsv': 'PKSaved',
    'PKm': 'PKMissed',
    'PK_Save%': 'PKSavePercentage'
}

# ============================================================================
# POSITION STANDARDIZATION
# ============================================================================

POSITION_MAPPING = {
    # Forwards
    'FW': 'FW', 'ST': 'FW', 'CF': 'FW', 'LW': 'FW', 'RW': 'FW',
    
    # Midfielders
    'MF': 'MF', 'CM': 'MF', 'DM': 'MF', 'AM': 'MF', 
    'CAM': 'MF', 'CDM': 'MF', 'LM': 'MF', 'RM': 'MF',
    
    # Defenders
    'DF': 'DF', 'CB': 'DF', 'LB': 'DF', 'RB': 'DF', 
    'LWB': 'DF', 'RWB': 'DF',
    
    # Goalkeeper
    'GK': 'GK'
}

# ============================================================================
# FEATURE DERIVATION COEFFICIENTS
# ============================================================================

# xG Estimation Coefficients by Position
XG_COEFFICIENTS = {
    'FW': {
        'base_xg': 0.15,
        'goals_weight': 1.0,
        'shots_weight': 0.1,
        'shot_accuracy_weight': 0.15
    },
    'MF': {
        'base_xg': 0.08,
        'goals_weight': 1.0,
        'shots_weight': 0.12,
        'shot_accuracy_weight': 0.12
    },
    'DF': {
        'base_xg': 0.03,
        'goals_weight': 1.0,
        'shots_weight': 0.15,
        'shot_accuracy_weight': 0.10
    },
    'GK': {
        'base_xg': 0.0,
        'goals_weight': 0.0,
        'shots_weight': 0.0,
        'shot_accuracy_weight': 0.0
    }
}

# xA Estimation Coefficients by Position
XA_COEFFICIENTS = {
    'FW': {
        'base': 0.05,
        'attack_weight': 0.8
    },
    'MF': {
        'base': 0.08,
        'attack_weight': 1.2
    },
    'DF': {
        'base': 0.03,
        'attack_weight': 0.4
    },
    'GK': {
        'base': 0.01,
        'attack_weight': 0.1
    }
}

# Realistic Shots Per 90 by Position
REALISTIC_SHOTS_PER_90 = {
    'FW': 3.5,
    'MF': 1.8,
    'DF': 0.8,
    'GK': 0.05
}

# Progressive Passes Coefficients
PROGRESSIVE_PASS_COEFFICIENTS = {
    'FW': {
        'base_rate': 0.10,
        'success_multiplier': 1.0
    },
    'MF': {
        'base_rate': 0.18,
        'success_multiplier': 1.1
    },
    'DF': {
        'base_rate': 0.12,
        'success_multiplier': 0.95
    },
    'GK': {
        'base_rate': 0.05,
        'success_multiplier': 0.8
    }
}

# Dribbling Coefficients
DRIBBLE_COEFFICIENTS = {
    'FW': {
        'per_90_base': 3.5,
        'success_rate': 0.55
    },
    'MF': {
        'per_90_base': 2.0,
        'success_rate': 0.60
    },
    'DF': {
        'per_90_base': 0.8,
        'success_rate': 0.65
    },
    'GK': {
        'per_90_base': 0.1,
        'success_rate': 0.70
    }
}

# ============================================================================
# OBJECTIVE EVALUATION SYSTEM - CORE PRINCIPLES
# ============================================================================

# Position-Based Weighting (Performance vs Playing Time)
POSITION_WEIGHTS = {
    'FW': {'performance': 0.80, 'playing_time': 0.20},
    'MF': {'performance': 0.70, 'playing_time': 0.30},
    'DF': {'performance': 0.50, 'playing_time': 0.50},
    'GK': {'performance': 0.70, 'playing_time': 0.30}
}

# Position-Specific Goal Value (Scarcity Multipliers)
POSITION_GOAL_MULTIPLIER = {
    'FW': 1.0,   # Baseline - expected to score
    'MF': 1.2,   # 40% bonus - goals are valuable
    'DF': 1.5,   # 100% bonus - goals are rare and valuable
    'GK': 3.0    # 200% bonus - extremely rare
}

# Performance Formula Weights (for outfield players)
PERFORMANCE_WEIGHTS = {
    'goals_per_90': 0.60,      # 60% weight on efficiency
    'total_goals_norm': 0.40   # 40% weight on volume
}

# Small Sample Size Penalty
SMALL_SAMPLE_THRESHOLD = 3
SMALL_SAMPLE_MULTIPLIER = 0.6

# Age Bonus (younger = more potential)
AGE_BONUS_BASE = 25
AGE_BONUS_DIVISOR = 10

# ============================================================================
# WEAK TEAM IDENTIFICATION (2 of 3 criteria)
# ============================================================================

WEAK_TEAM_CRITERIA = {
    'ppm_threshold': 1.1,           # Points per match < 1.1
    'goal_diff_threshold': 0,       # Goal difference < 0
    'goal_diff_90_threshold': -0.25 # Goal diff per 90 < -0.25
}

# ============================================================================
# GOALKEEPER EVALUATION FORMULA
# ============================================================================

GK_PERFORMANCE_WEIGHTS = {
    'save_percentage': 0.50,
    'goals_against_norm': 0.30,
    'clean_sheet_pct': 0.20
}

GK_GA90_NORMALIZATION_FACTOR = 3.0  # Normalize GA90 against this value

# Goalkeeper Context Tags
GK_TAG_THRESHOLDS = {
    'shot_stopper': {'save_pct': 75},
    'under_siege': {'ga90': 2.0, 'save_pct': 70},
    'commanding_presence': {'cs_pct': 35}
}

# ============================================================================
# CONFIDENCE LEVELS
# ============================================================================

CONFIDENCE_THRESHOLDS = {
    'very_high': {'min_matches': 20, 'min_minutes': 1500, 'min_starts': 15},
    'high': {'min_matches': 12, 'min_minutes': 900, 'min_starts': 8},
    'medium': {'min_matches': 6, 'min_minutes': 400, 'min_starts': 3},
    'low': {'min_matches': 0, 'min_minutes': 0, 'min_starts': 0}
}

# ============================================================================
# CONTEXTUAL TAGS
# ============================================================================

CONTEXT_TAG_THRESHOLDS = {
    # Strong performer on weak team
    'underdog': {
        'min_goals_per_90': 0.40,  # FW baseline
        'weak_team_required': True
    },
    'bright_spot': {
        'min_goals_per_90': 0.50,
        'weak_team_required': True
    },
    'carrying_team': {
        'min_goals_per_90': 0.70,
        'weak_team_required': True
    },
    
    # General performance tags
    'prolific': {
        'min_goals_per_90': 0.80,  # FW
        'weak_team_required': False
    },
    'consistent_scorer': {
        'min_goals': 5,
        'min_goals_per_90': 0.35,
        'weak_team_required': False
    }
}

# ============================================================================
# ML MODEL SETTINGS (For feature extraction, not direct prediction)
# ============================================================================

XGB_PARAMS = {
    "n_estimators": 200,
    "learning_rate": 0.05,
    "max_depth": 6,
    "min_child_weight": 3,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "gamma": 0.1,
    "reg_alpha": 0.1,
    "reg_lambda": 1.0,
    "objective": "reg:squarederror",
    "random_state": 42,
    "n_jobs": -1
}

# Train/validation split
VAL_SPLIT = 0.2
RANDOM_STATE = 42

# ============================================================================
# OUTPUT SETTINGS
# ============================================================================

TOP_N_PROSPECTS = 50
MIN_MATCHES_PLAYED = 5
MIN_POTENTIAL_THRESHOLD = 70

MODEL_FILENAME = "potential_predictor.pkl"
SCALER_FILENAME = "feature_scaler.pkl"

# Feature groups for ML model
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

CATEGORICAL_FEATURES = ['Position']

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def standardize_position(position: str) -> str:
    """Standardize position to FW/MF/DF/GK."""
    if pd.isna(position):
        return 'MF'
    
    position = str(position).upper().strip()
    
    if position in POSITION_MAPPING:
        return POSITION_MAPPING[position]
    
    if 'FORWARD' in position or 'STRIKER' in position or 'WING' in position:
        return 'FW'
    elif 'MID' in position:
        return 'MF'
    elif 'BACK' in position or 'DEFEND' in position:
        return 'DF'
    elif 'GOAL' in position or 'KEEP' in position:
        return 'GK'
    
    return 'MF'


def calculate_age_from_birth_year(birth_year: int, current_year: int = 2025) -> int:
    """Calculate age from birth year."""
    if pd.isna(birth_year):
        return 18
    return current_year - int(birth_year)


def safe_divide(numerator, denominator, default=0):
    """Safe division with default value."""
    if denominator == 0 or pd.isna(denominator) or pd.isna(numerator):
        return default
    return numerator / denominator


def is_weak_team(row: pd.Series) -> bool:
    """
    Determine if a team is weak based on 2 of 3 criteria.
    
    Criteria:
    1. PPM < 1.1
    2. GoalDifference < 0
    3. GoalDifferencePer90 < -0.25
    """
    criteria_met = 0
    
    # Criterion 1: Low points per match
    ppm = row.get('PointsPerMatch', 1.5)
    if pd.notna(ppm) and ppm < WEAK_TEAM_CRITERIA['ppm_threshold']:
        criteria_met += 1
    
    # Criterion 2: Negative goal difference
    goal_diff = row.get('GoalDifference', 0)
    if pd.notna(goal_diff) and goal_diff < WEAK_TEAM_CRITERIA['goal_diff_threshold']:
        criteria_met += 1
    
    # Criterion 3: Poor goal difference per 90
    goal_diff_90 = row.get('GoalDifferencePer90', 0)
    if pd.notna(goal_diff_90) and goal_diff_90 < WEAK_TEAM_CRITERIA['goal_diff_90_threshold']:
        criteria_met += 1
    
    return criteria_met >= 2


def validate_config():
    """Validate configuration."""
    print("=" * 70)
    print("CONFIGURATION VALIDATION - OBJECTIVE EVALUATION SYSTEM")
    print("=" * 70)
    
    print(f"\n✓ Teacher's data file: {TEACHER_DATA_FILE}")
    print(f"✓ Scraped data files: {len(SCRAPED_FILES)} seasons")
    print(f"✓ Model: XGBoost (for feature extraction)")
    print(f"✓ Output: Top {TOP_N_PROSPECTS} prospects")
    
    print("\n🎯 Position Weighting:")
    for pos, weights in POSITION_WEIGHTS.items():
        print(f"   {pos}: {int(weights['performance']*100)}% Performance / "
              f"{int(weights['playing_time']*100)}% Playing Time")
    
    print("\n⚽ Goal Value Multipliers:")
    for pos, mult in POSITION_GOAL_MULTIPLIER.items():
        print(f"   {pos}: {mult}x")
    
    print("\n📊 Weak Team Criteria (2 of 3):")
    print(f"   • PPM < {WEAK_TEAM_CRITERIA['ppm_threshold']}")
    print(f"   • Goal Diff < {WEAK_TEAM_CRITERIA['goal_diff_threshold']}")
    print(f"   • Goal Diff/90 < {WEAK_TEAM_CRITERIA['goal_diff_90_threshold']}")
    
    print("\n🧤 Goalkeeper Formula:")
    print(f"   • Save%: {int(GK_PERFORMANCE_WEIGHTS['save_percentage']*100)}%")
    print(f"   • GA90 (normalized): {int(GK_PERFORMANCE_WEIGHTS['goals_against_norm']*100)}%")
    print(f"   • Clean Sheet%: {int(GK_PERFORMANCE_WEIGHTS['clean_sheet_pct']*100)}%")
    
    print("\n✅ Configuration validated successfully!")


if __name__ == "__main__":
    validate_config()