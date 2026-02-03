"""
Configuration file for Youth Player Potential Prediction System
================================================================

UPDATED: Realistic rating scale for U19 players (Max Peak ~94)
Key principles:
- U19 current ratings: 20-70 range (most 35-55)
- Next season: +3 to +8 improvement
- Peak potential: 50-94 range (elite prospects max out ~90-94)
"""

import numpy as np
import pandas as pd

# ============================================================================
# DATA SETTINGS
# ============================================================================

DATA_DIR = "../data"
OUTPUT_DIR = "./outputs"
MODEL_DIR = "./saved_models"

SEASONS = [
    "players_2022-23.csv",
    "players_2023-24.csv", 
    "players_2024-25.csv",
    "players_2025-26.csv"
]

SEASON_LABELS = ["2022-23", "2023-24", "2024-25", "2025-26"]

# ============================================================================
# FEATURE COLUMNS
# ============================================================================

NUMERIC_COLS = [
    "Born_std",
    "Playing Time_MP_std",
    "Playing Time_Starts",
    "Playing Time_Min_std",
    "Playing Time_90s_std",
    "Performance_Gls",
    "Performance_G-PK",
    "Performance_PK",
    "Performance_PKatt",
    "Per 90 Minutes_Gls",
    "Per 90 Minutes_G-PK",
    "Playing Time_Mn/MP",
    "Playing Time_Min%",
    "Playing Time_90s_match",
    "Starts_Starts",
    "Starts_Mn/Start",
    "Starts_Compl",
    "Subs_Subs",
    "Subs_Mn/Sub",
    "Subs_unSub",
    "Team Success_PPM",
    "Team Success_onG",
    "Team Success_onGA",
    "Team Success_+/-",
    "Team Success_+/-90",
    "Team Success_On-Off"
]

CATEGORICAL_COLS = ["Pos_std"]
ID_COLS = ["Player", "Nation_std", "Squad_std"]

# ============================================================================
# REALISTIC RATING SCALES FOR U19
# ============================================================================

# Current Rating Scale (what they're doing NOW in U19)
CURRENT_RATING_SCALE = {
    "min": 20,      # Absolute minimum (rarely play)
    "low": 35,      # Struggling players
    "avg": 48,      # Average U19 player
    "good": 58,     # Good U19 player
    "elite": 70,    # Elite U19 player (very rare)
    "max": 75       # Absolute maximum for U19 current performance
}

# Peak Potential Scale (what they COULD become as senior pros)
PEAK_POTENTIAL_SCALE = {
    "min": 40,      # Minimum for players who play regularly
    "depth": 55,    # Squad depth player potential
    "rotation": 65, # Rotation player potential
    "starter": 75,  # Regular starter potential
    "star": 85,     # Star player potential
    "elite": 94,    # Elite prospect (world-class potential)
    "max": 94       # Hard cap - even generational talents
}

# Next Season Scale (one year improvement)
NEXT_SEASON_SCALE = {
    "min_growth": 2,     # Minimum improvement for youth
    "avg_growth": 5,     # Average youth improvement
    "max_growth": 10,    # Maximum single-year growth
}

# ============================================================================
# POSITION-SPECIFIC AGE CURVES
# ============================================================================

POSITION_AGE_CURVES = {
    "FW": {
        "peak_age": 17,
        "young_bonus": 25,      # REDUCED from 40
        "decline_start": 19,
        "decline_rate": 8
    },
    "MF": {
        "peak_age": 17,
        "young_bonus": 22,      # REDUCED from 35
        "decline_start": 19,
        "decline_rate": 7
    },
    "DF": {
        "peak_age": 17,
        "young_bonus": 20,      # REDUCED from 35
        "decline_start": 19,
        "decline_rate": 6
    },
    "GK": {
        "peak_age": 18,
        "young_bonus": 18,      # REDUCED from 30
        "decline_start": 19,
        "decline_rate": 5
    },
    "DEFAULT": {
        "peak_age": 17,
        "young_bonus": 22,
        "decline_start": 19,
        "decline_rate": 7
    }
}

# ============================================================================
# FEATURE ENGINEERING WEIGHTS - REALISTIC SCALE
# ============================================================================

# Current Rating: CONSERVATIVE weights for realistic 20-70 scale
CURRENT_RATING_WEIGHTS = {
    "Performance_Gls": 1.2,              # REDUCED
    "Performance_G-PK": 1.0,             # REDUCED
    "Playing Time_90s_std": 1.8,         # Playing time matters
    "Starts_Starts": 0.8,
    "Team Success_PPM": 1.5,
    "Team Success_+/-90": 1.0,
    "Team Success_On-Off": 1.0,
    "Playing Time_Min%": 0.015,
    "Starts_Compl": 0.4,
    "Starts_Mn/Start": 0.008
}

# Peak Potential: Conservative weights
POTENTIAL_WEIGHTS = {
    "Playing Time_90s_std": 2.0,
    "Starts_Starts": 1.0,
    "Playing Time_Min%": 0.8,
    "Starts_Compl": 0.3,
    "Per 90 Minutes_Gls": 4.0,           # REDUCED from 8.0
    "Per 90 Minutes_G-PK": 3.0,          # REDUCED from 6.0
    "Performance_G-PK": 0.8,
    "Team Success_On-Off": 3.0,          # REDUCED from 6.0
    "Team Success_PPM": 1.0,
    "Team Success_+/-90": 0.8,
}

# ============================================================================
# SAMPLE SIZE HANDLING
# ============================================================================

MIN_MATCHES_THRESHOLD = 5
LOW_MATCH_CONFIDENCE_PENALTY = 0.5

MIN_MATCHES_FOR_BASELINE = 3

# Exceptional performance thresholds (bypass penalties)
EXCEPTIONAL_PERFORMANCE_THRESHOLDS = {
    "goals_per_match": 1.5,
    "minutes_per_goal": 60,
    "combined_metric": 2.0
}

# Sample size penalties
SAMPLE_SIZE_PENALTIES = {
    1: 0.15,
    2: 0.25,
    3: 0.40,
    4: 0.60,
    5: 0.75,
}

# ============================================================================
# YOUTH PROGRESSION CONSTRAINTS - REALISTIC
# ============================================================================

YOUTH_PROGRESSION_RULES = {
    # Next season growth (in rating points)
    "min_next_season_growth": 2.0,       # At least +2
    "typical_next_season_growth": 5.0,   # Typical +5
    "max_next_season_growth": 10.0,      # Maximum +10
    
    # Peak growth from current (in rating points)
    "min_peak_growth_from_current": 8.0,     # At least +8 from current
    "typical_peak_growth_from_current": 18.0, # Typical +18
    "max_peak_growth_from_current": 35.0,     # Maximum +35 (rare)
    
    # Peak growth from next season (in rating points)
    "min_peak_growth_from_next": 5.0,    # At least +5 above next
    "max_peak_growth_from_next": 25.0,   # Maximum +25 above next
    
    # Absolute caps
    "max_current_rating": 75,            # Cap current rating
    "max_next_season_rating": 85,        # Cap next season
    "max_peak_potential": 94,            # Cap peak potential
}

# Age-based growth modifiers (more conservative)
AGE_GROWTH_MODIFIERS = {
    15: 1.4,   # 40% more growth
    16: 1.25,  # 25% more growth
    17: 1.15,  # 15% more growth
    18: 1.0,   # Baseline
    19: 0.85,  # 15% less growth
    20: 0.7,   # 30% less growth
    21: 0.5,   # 50% less growth
}

# Performance tier modifiers (more conservative)
PERFORMANCE_GROWTH_MODIFIERS = {
    "struggling": 0.75,    # Bottom 25%: -25% growth
    "average": 1.0,        # Middle 50%: normal growth
    "good": 1.25,          # Top 25%: +25% growth
    "exceptional": 1.5,    # Top 5%: +50% growth (was 1.6x)
}

# ============================================================================
# MODEL HYPERPARAMETERS
# ============================================================================

XGB_PARAMS = {
    "n_estimators": 300,
    "learning_rate": 0.05,
    "max_depth": 5,
    "min_child_weight": 5,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "gamma": 0.1,
    "reg_alpha": 0.1,
    "reg_lambda": 1.5,
    "objective": "reg:squarederror",
    "random_state": 42,
    "n_jobs": -1
}

N_TARGETS = 2
TARGET_NAMES = ["NextSeasonRating", "PeakPotential"]

TRAIN_SEASONS = ["2022-23", "2023-24", "2024-25"]
VAL_SEASON = "2025-26"
TEST_SEASON = None

# ============================================================================
# MISSING DATA IMPUTATION
# ============================================================================

IMPUTATION_METHOD = "forward_fill_with_decay"
FORWARD_FILL_DECAY = 0.90
USE_POSITION_MEDIAN_FOR_NEW_PLAYERS = True

# ============================================================================
# OUTPUT SETTINGS
# ============================================================================

TOP_N_PROSPECTS = 50
MIN_POTENTIAL_THRESHOLD = 65           # At least "rotation player" potential
MIN_MATCHES_PLAYED = 5

SAVE_PROCESSED_DATA = True
PROCESSED_DATA_FILENAME = "processed_players_multiseason.csv"

MULTIOUTPUT_MODEL_PATH = f"{MODEL_DIR}/youth_potential_model.pkl"
FEATURE_SCALER_PATH = f"{MODEL_DIR}/feature_scaler.pkl"

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_age_bonus(age: float, position: str) -> float:
    """Calculate age-based potential bonus."""
    curve = POSITION_AGE_CURVES.get(position, POSITION_AGE_CURVES["DEFAULT"])
    
    peak = curve["peak_age"]
    bonus = curve["young_bonus"]
    decline_start = curve["decline_start"]
    decline_rate = curve["decline_rate"]
    
    if age <= peak:
        return bonus
    elif age <= decline_start:
        years_past_peak = age - peak
        slope = bonus / (decline_start - peak)
        return max(0, bonus - (slope * years_past_peak))
    else:
        years_past_decline = age - decline_start
        return max(0, bonus - (decline_rate * years_past_decline))


def get_sample_size_penalty(matches: int) -> float:
    """Get penalty factor based on matches played."""
    if matches >= 6:
        return 1.0
    return SAMPLE_SIZE_PENALTIES.get(matches, 0.15)


def is_exceptional_performance(goals: int, matches: int, minutes: int, 
                               assists: int = 0) -> bool:
    """Check if performance is exceptional enough to bypass penalties."""
    if matches == 0 or minutes == 0:
        return False
    
    goals_per_match = goals / matches
    minutes_per_goal = minutes / max(goals, 1)
    combined = (goals + assists) / matches
    
    thresholds = EXCEPTIONAL_PERFORMANCE_THRESHOLDS
    
    criteria_met = sum([
        goals_per_match >= thresholds["goals_per_match"],
        minutes_per_goal <= thresholds["minutes_per_goal"],
        combined >= thresholds["combined_metric"]
    ])
    
    return criteria_met >= 2


def get_age_growth_modifier(age: int) -> float:
    """Get growth multiplier based on age."""
    age = int(age)
    if age <= 15:
        return AGE_GROWTH_MODIFIERS[15]
    elif age >= 21:
        return AGE_GROWTH_MODIFIERS[21]
    return AGE_GROWTH_MODIFIERS.get(age, 1.0)


def get_performance_growth_modifier(current_rating: float, 
                                   rating_distribution: pd.Series = None) -> float:
    """Get growth multiplier based on performance level."""
    if rating_distribution is None:
        # Fallback: use absolute thresholds
        if current_rating >= 65:
            return PERFORMANCE_GROWTH_MODIFIERS["exceptional"]
        elif current_rating >= 52:
            return PERFORMANCE_GROWTH_MODIFIERS["good"]
        elif current_rating >= 38:
            return PERFORMANCE_GROWTH_MODIFIERS["average"]
        else:
            return PERFORMANCE_GROWTH_MODIFIERS["struggling"]
    
    # Use percentile-based tiers
    percentile = (rating_distribution <= current_rating).mean() * 100
    
    if percentile >= 95:
        return PERFORMANCE_GROWTH_MODIFIERS["exceptional"]
    elif percentile >= 75:
        return PERFORMANCE_GROWTH_MODIFIERS["good"]
    elif percentile >= 25:
        return PERFORMANCE_GROWTH_MODIFIERS["average"]
    else:
        return PERFORMANCE_GROWTH_MODIFIERS["struggling"]


def normalize_rating_to_scale(raw_rating: float, scale_min: float, 
                               scale_max: float, cap: float = None) -> float:
    """
    Normalize a raw rating to a specified scale.
    
    Args:
        raw_rating: Raw computed rating (0-100)
        scale_min: Minimum of target scale
        scale_max: Maximum of target scale
        cap: Hard cap (optional)
    
    Returns:
        Normalized rating within scale
    """
    # Clip raw rating to 0-100
    raw_rating = np.clip(raw_rating, 0, 100)
    
    # Map to target scale
    normalized = scale_min + (raw_rating / 100) * (scale_max - scale_min)
    
    # Apply cap if specified
    if cap is not None:
        normalized = min(normalized, cap)
    
    return normalized


def get_feature_list():
    """Returns the final list of features used for model training."""
    base_features = NUMERIC_COLS.copy()
    
    engineered = [
        "Age_std",
        "current_rating",
        "age_bonus",
        "consistency_score",
        "season_growth_rate",
        "goals_per_start",
        "minutes_per_goal",
        "completion_rate",
        "confidence_weight",
        "sample_size_penalty",
        "is_exceptional",
        "age_growth_modifier",
        "performance_tier"
    ]
    
    return base_features + engineered


def validate_config():
    """Run basic sanity checks on configuration."""
    assert len(SEASONS) == len(SEASON_LABELS), "Seasons and labels must match"
    assert len(TRAIN_SEASONS) > 0, "Must have at least 1 training season"
    assert VAL_SEASON in SEASON_LABELS, f"Validation season {VAL_SEASON} not in labels"
    
    # Validate rating scales
    assert CURRENT_RATING_SCALE["max"] <= 75, "Current rating max should be ≤75 for U19"
    assert PEAK_POTENTIAL_SCALE["max"] <= 94, "Peak potential max should be ≤94"
    assert NEXT_SEASON_SCALE["max_growth"] <= 15, "Max next season growth should be ≤15"
    
    print("✓ Configuration validated successfully")
    print(f"✓ Training on: {TRAIN_SEASONS}")
    print(f"✓ Validating on: {VAL_SEASON}")
    print(f"\n✓ Rating Scales:")
    print(f"   Current: {CURRENT_RATING_SCALE['min']}-{CURRENT_RATING_SCALE['max']}")
    print(f"   Next Season: {CURRENT_RATING_SCALE['min']+NEXT_SEASON_SCALE['min_growth']}-{YOUTH_PROGRESSION_RULES['max_next_season_rating']}")
    print(f"   Peak Potential: {PEAK_POTENTIAL_SCALE['min']}-{PEAK_POTENTIAL_SCALE['max']}")


if __name__ == "__main__":
    validate_config()
    
    print("\n--- Age Bonus Examples (Reduced for Realism) ---")
    for pos in ["FW", "MF", "DF", "GK"]:
        for age in [15, 17, 19, 21]:
            bonus = get_age_bonus(age, pos)
            print(f"{pos} age {age}: {bonus:.1f} potential bonus")
    
    print("\n--- Sample Size Penalty Examples ---")
    for matches in [1, 2, 3, 4, 5, 6, 10]:
        penalty = get_sample_size_penalty(matches)
        print(f"{matches} matches: {penalty:.0%} of rating retained")
    
    print("\n--- Rating Scale Examples ---")
    print(f"\nElite U19 current performance: {CURRENT_RATING_SCALE['elite']}")
    print(f"Elite prospect peak potential: {PEAK_POTENTIAL_SCALE['elite']}")
    print(f"Maximum peak potential: {PEAK_POTENTIAL_SCALE['max']}")