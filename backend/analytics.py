"""
Analytics and Similarity Calculations
"""
import numpy as np
from typing import List, Dict, Tuple
from sklearn.metrics.pairwise import cosine_similarity


def calculate_similar_players(target_player: Dict, all_players: List[Dict], top_n: int = 5) -> List[Dict]:
    """
    Find similar players using cosine similarity on normalized features
    
    Args:
        target_player: The player to find similar players for
        all_players: All available players
        top_n: Number of similar players to return
    
    Returns:
        List of similar players with similarity scores
    """
    # Features to use for similarity
    feature_keys = [
        'predicted_potential', 'performance_score', 'age',
        'goals', 'assists', 'matches', 'minutes',
        'goals_per_90', 'assists_per_90'
    ]
    
    # Extract target features
    target_features = []
    for key in feature_keys:
        value = target_player.get(key, 0)
        target_features.append(float(value) if value is not None else 0.0)
    
    target_features = np.array(target_features).reshape(1, -1)
    
    # Filter players by same position
    same_position_players = [
        p for p in all_players 
        if p.get('position') == target_player.get('position')
        and p.get('id') != target_player.get('id')
    ]
    
    if not same_position_players:
        return []
    
    # Extract features for all players
    player_features = []
    for player in same_position_players:
        features = []
        for key in feature_keys:
            value = player.get(key, 0)
            features.append(float(value) if value is not None else 0.0)
        player_features.append(features)
    
    player_features = np.array(player_features)
    
    # Normalize features (min-max scaling)
    for i in range(player_features.shape[1]):
        col = player_features[:, i]
        min_val = col.min()
        max_val = col.max()
        if max_val > min_val:
            player_features[:, i] = (col - min_val) / (max_val - min_val)
            target_features[0, i] = (target_features[0, i] - min_val) / (max_val - min_val)
    
    # Calculate cosine similarity
    similarities = cosine_similarity(target_features, player_features)[0]
    
    # Get top N similar players
    top_indices = np.argsort(similarities)[::-1][:top_n]
    
    similar_players = []
    for idx in top_indices:
        player = same_position_players[idx].copy()
        player['similarity_score'] = float(similarities[idx] * 100)
        similar_players.append(player)
    
    return similar_players


def generate_scouting_report(player: Dict, similar_players: List[Dict]) -> Dict:
    """
    Generate comprehensive scouting report for a player
    
    Args:
        player: Player data
        similar_players: List of similar players
    
    Returns:
        Scouting report dictionary
    """
    position = player.get('position', 'FW')
    age = player.get('age', 18)
    matches = player.get('matches', 0)
    goals = player.get('goals', 0)
    predicted_potential = player.get('predicted_potential', 0)
    performance_score = player.get('performance_score', 0)
    
    # Tier classification
    tier = classify_tier(predicted_potential)
    
    # Growth trajectory
    growth = calculate_growth_trajectory(player)
    
    # Strengths and weaknesses
    strengths, weaknesses, development_areas = analyze_player_profile(player)
    
    # Recommendation
    recommendation = generate_recommendation(player, tier)
    
    # Scout notes
    scout_notes = generate_scout_notes(player, tier, growth)
    
    # Career Totals
    progression = player.get('progression', [])
    total_matches = sum(int(p.get('matches', p.get('Playing Time_MP_raw', 0))) for p in progression)
    total_goals = sum(int(p.get('goals', p.get('Performance_Gls', 0))) for p in progression)
    
    # Season-over-season change
    season_change = calculate_season_change(player, progression)
    
    # Check for incomplete season (anywhere in history)
    has_incomplete_season = any(p.get('Season', p.get('season', '')).startswith('2025') for p in progression)
    
    return {
        'player': {
            'name': player.get('player_name', 'Unknown'),
            'age': age,
            'position': position,
            'team': player.get('club', 'Unknown'),
            'nation': player.get('nation', 'Unknown'),
            'seasons_count': len(progression),
            'current_season': player.get('Season', player.get('season', 'Unknown')),
            'is_best_potential': player.get('is_best_potential', False)
        },
        'ratings': {
            'current': performance_score,
            'next_season': player.get('next_season_rating', performance_score + 2),
            'peak_potential': predicted_potential
        },
        'performance': {
            'matches': matches,
            'goals': goals,
            'goals_per_match': goals / matches if matches > 0 else 0,
            'total_matches': total_matches,
            'total_goals': total_goals
        },
        'growth': growth,
        'analysis': {
            'strengths': strengths,
            'weaknesses': weaknesses,
            'development_areas': development_areas
        },
        'tier': tier,
        'recommendation': recommendation,
        'scout_notes': scout_notes,
        'similar_players': similar_players,
        'season_change': season_change,
        'progression': progression,
        'is_incomplete': player.get('Season', player.get('season', '')).startswith('2025'),
        'has_incomplete_season': has_incomplete_season
    }


def classify_tier(potential: float) -> Dict:
    """Classify player into tier based on potential"""
    if potential >= 90:
        return {'name': 'Elite Prospect', 'color': 'gold'}
    elif potential >= 85:
        return {'name': 'Top Prospect', 'color': 'silver'}
    elif potential >= 80:
        return {'name': 'Promising Talent', 'color': 'bronze'}
    elif potential >= 75:
        return {'name': 'Developing Player', 'color': 'blue'}
    elif potential >= 70:
        return {'name': 'Squad Player', 'color': 'green'}
    else:
        return {'name': 'Prospect', 'color': 'purple'}


def calculate_growth_trajectory(player: Dict) -> Dict:
    """Calculate player growth trajectory"""
    current = player.get('performance_score', 0)
    potential = player.get('predicted_potential', 0)
    age = player.get('age', 18)
    
    short_term = min(potential - current, 5.0) if potential > current else 0
    long_term = potential - current
    
    # Determine growth rate
    if age <= 17:
        if long_term >= 15:
            growth_rate = 'rapid'
        elif long_term >= 10:
            growth_rate = 'moderate'
        else:
            growth_rate = 'slow'
    elif age <= 19:
        if long_term >= 10:
            growth_rate = 'rapid'
        elif long_term >= 5:
            growth_rate = 'moderate'
        else:
            growth_rate = 'slow'
    else:
        if long_term >= 5:
            growth_rate = 'moderate'
        else:
            growth_rate = 'plateau'
    
    return {
        'short_term': round(short_term, 1),
        'long_term': round(long_term, 1),
        'growth_rate': growth_rate
    }


def analyze_player_profile(player: Dict) -> Tuple[List[str], List[str], List[str]]:
    """Analyze player strengths, weaknesses, and development areas"""
    position = player.get('position', 'FW')
    goals_per_90 = player.get('goals_per_90', 0)
    matches = player.get('matches', 0)
    minutes = player.get('minutes', 0)
    performance = player.get('performance_score', 0)
    potential = player.get('predicted_potential', 0)
    
    strengths = []
    weaknesses = []
    development_areas = []
    
    # Position-specific analysis
    if position in ['FW', 'MF']:
        if goals_per_90 > 0.5:
            strengths.append("Excellent goal-scoring ability")
        elif goals_per_90 > 0.3:
            strengths.append("Good attacking threat")
        else:
            weaknesses.append("Limited goal-scoring output")
            development_areas.append("Improve finishing and positioning")
    
    # Playing time analysis
    if matches >= 20:
        strengths.append("Regular first-team player")
    elif matches >= 10:
        strengths.append("Gaining valuable playing time")
    else:
        weaknesses.append("Limited playing time")
        development_areas.append("Need more match experience")
    
    # Performance vs Potential
    gap = potential - performance
    if gap > 15:
        strengths.append("High growth potential")
        development_areas.append("Focus on consistent performances")
    elif gap > 10:
        strengths.append("Good development trajectory")
    
    # Age-based insights
    age = player.get('age', 18)
    if age <= 17:
        strengths.append("Young age with time to develop")
    
    if not strengths:
        strengths.append("Developing player with potential")
    if not weaknesses:
        weaknesses.append("No major concerns identified")
    if not development_areas:
        development_areas.append("Continue current development path")
    
    return strengths, weaknesses, development_areas


def generate_recommendation(player: Dict, tier: Dict) -> str:
    """Generate scout recommendation"""
    potential = player.get('predicted_potential', 0)
    performance = player.get('performance_score', 0)
    age = player.get('age', 18)
    matches = player.get('matches', 0)
    
    if potential >= 90 and age <= 18:
        return "🔴 PRIORITY SIGNING - Elite prospect with exceptional potential"
    elif potential >= 85 and matches >= 15:
        return "🟢 HIGHLY RECOMMEND - Top talent with proven performance"
    elif potential >= 80:
        return "🟡 RECOMMEND - Promising player worth monitoring closely"
    elif potential >= 75 and age <= 17:
        return "🔵 MONITOR - Young talent with good long-term potential"
    else:
        return "⚪ OBSERVE - Continue tracking development"


def generate_scout_notes(player: Dict, tier: Dict, growth: Dict) -> str:
    """Generate detailed scout notes"""
    name = player.get('player_name', 'Player')
    position = player.get('position', 'FW')
    age = player.get('age', 18)
    goals = player.get('goals', 0)
    matches = player.get('matches', 0)
    performance = player.get('performance_score', 0)
    potential = player.get('predicted_potential', 0)
    
    notes = f"{name} is a {age}-year-old {position} "
    notes += f"classified as a {tier['name']} with a peak potential of {potential:.1f}. "
    
    if matches > 0:
        notes += f"This season, the player has featured in {matches} matches, "
        if position in ['FW', 'MF']:
            notes += f"scoring {goals} goals. "
        
        if performance >= 75:
            notes += f"Demonstrating strong current form (rating: {performance:.1f}), "
        else:
            notes += f"With a current rating of {performance:.1f}, there is significant room for improvement. "
    
    notes += f"The player shows {growth['growth_rate']} growth potential with an expected improvement of "
    notes += f"{growth['long_term']:.1f} points over the coming seasons. "
    
    if age <= 17:
        notes += "Being exceptionally young for this level, continued development is expected with proper coaching and playing time."
    elif age <= 19:
        notes += "At a key development age, the next 1-2 seasons will be crucial for the player's trajectory."
    else:
        notes += "Approaching peak development years, should begin showing consistent performances at this level."
    
    return notes


def calculate_season_change(player: Dict, progression: List[Dict]) -> Dict:
    """Calculate season-over-season changes if multiple seasons available"""
    if not progression or len(progression) < 2:
        return {
            'available': False,
            'previous_season': None,
            'current_season': player.get('Season', player.get('season')),
            'rating_change': 0,
            'goals_change': 0,
            'matches_change': 0,
            'trend': 'stable'
        }
    
    # Sort progression by season (latest first)
    # Robust key handling for both raw and formatted dicts
    sorted_prog = sorted(progression, key=lambda x: x.get('Season', x.get('season', '')), reverse=True)
    
    # Find the index of the "requested" player's season in the progression
    req_season = player.get('Season', player.get('season'))
    current_idx = 0
    for i, p in enumerate(sorted_prog):
        if p.get('Season', p.get('season')) == req_season:
            current_idx = i
            break
            
    # If there's no season older than the current one, return unavailable
    if current_idx >= len(sorted_prog) - 1:
        return {
            'available': False,
            'previous_season': None,
            'current_season': req_season,
            'rating_change': 0,
            'goals_change': 0,
            'matches_change': 0,
            'trend': 'stable'
        }
    
    current = sorted_prog[current_idx]
    previous = sorted_prog[current_idx + 1]
    
    curr_rating = float(current.get('performance_score', current.get('CurrentRating', 0)))
    prev_rating = float(previous.get('performance_score', previous.get('CurrentRating', 0)))
    rating_change = round(curr_rating - prev_rating, 1)
    
    curr_goals = int(current.get('goals', current.get('Performance_Gls', 0)))
    prev_goals = int(previous.get('goals', previous.get('Performance_Gls', 0)))
    goals_change = curr_goals - prev_goals
    
    curr_matches = int(current.get('matches', current.get('Playing Time_MP_raw', 0)))
    prev_matches = int(previous.get('matches', previous.get('Playing Time_MP_raw', 0)))
    matches_change = curr_matches - prev_matches
    
    curr_goals_pm = curr_goals / curr_matches if curr_matches > 0 else 0
    prev_goals_pm = prev_goals / prev_matches if prev_matches > 0 else 0
    gpm_change = round(curr_goals_pm - prev_goals_pm, 2)
    
    trend = 'improving' if rating_change > 0 else 'declining' if rating_change < 0 else 'stable'
    prev_season_label = previous.get('Season', previous.get('season', 'Previous Cycle'))
    trend_label = f"Performance {trend} since {prev_season_label}"
    
    return {
        'available': True,
        'previous_season': prev_season_label,
        'current_season': current.get('Season', current.get('season')),
        'rating_change': rating_change,
        'goals_change': goals_change,
        'matches_change': matches_change,
        'goals_per_match_change': gpm_change,
        'trend': trend,
        'trend_label': trend_label
    }