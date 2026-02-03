"""
Shotmap Data Generator
Generates synthetic shot locations based on player statistics
"""
import numpy as np
from typing import List, Dict


def generate_shotmap(player: Dict) -> List[Dict]:
    """
    Generate synthetic shotmap based on player's goal statistics
    
    Args:
        player: Player dictionary with goals, xG, etc.
    
    Returns:
        List of shot dictionaries with x, y coordinates and type
    """
    goals = player.get('goals', 0)
    xg_per_90 = player.get('xg_per_90', 0)
    minutes = player.get('minutes', 0)
    position = player.get('position', 'FW')
    
    # Calculate total shots based on goals and conversion rate
    if goals > 0:
        # Estimate conversion rate: better players have ~15-20% conversion
        conversion_rate = 0.18 if xg_per_90 > 0.5 else 0.12
        estimated_shots = int(goals / conversion_rate)
    else:
        # Even without goals, generate some shots based on position
        estimated_shots = 5 if position in ['FW', 'MF'] else 2
    
    # Cap shots to reasonable number
    max_shots = min(estimated_shots, 30)
    
    shots = []
    goals_placed = 0
    
    # Position-based shot distribution
    if position == 'FW':
        # Forwards: more central, closer to goal
        zone_weights = {
            'central_box': 0.6,      # 60% in central penalty area
            'wide_box': 0.25,        # 25% in wide penalty area  
            'edge_box': 0.15         # 15% edge of box
        }
    elif position == 'MF':
        # Midfielders: more varied, some distance shots
        zone_weights = {
            'central_box': 0.35,
            'wide_box': 0.35,
            'edge_box': 0.30
        }
    else:  # DF
        # Defenders: rare shots, mostly set pieces
        zone_weights = {
            'central_box': 0.50,
            'wide_box': 0.20,
            'edge_box': 0.30
        }
    
    for i in range(max_shots):
        # Determine shot zone
        rand = np.random.random()
        if rand < zone_weights['central_box']:
            zone = 'central_box'
        elif rand < zone_weights['central_box'] + zone_weights['wide_box']:
            zone = 'wide_box'
        else:
            zone = 'edge_box'
        
        # Generate coordinates based on zone (opponent's half only: x > 50)
        x, y = generate_shot_coordinates(zone)
        
        # Determine shot outcome
        if goals_placed < goals:
            # This is a goal
            shot_type = 'goal'
            goals_placed += 1
        else:
            # Random miss or key pass
            shot_type = 'miss' if np.random.random() < 0.7 else 'key_pass'
        
        shots.append({
            'id': i + 1,
            'x': round(x, 1),
            'y': round(y, 1),
            'type': shot_type,
            'zone': zone
        })
    
    return shots


def generate_shot_coordinates(zone: str) -> tuple:
    """
    Generate x, y coordinates for a shot in opponent's half
    
    Pitch: x = 0-100 (length), y = 0-50 (width)
    Opponent's half: x > 50
    Goal at x=100, y=25 (center)
    
    Args:
        zone: Shot zone (central_box, wide_box, edge_box)
    
    Returns:
        (x, y) coordinates
    """
    if zone == 'central_box':
        # Central penalty area (x: 82-95, y: 18-32)
        x = np.random.uniform(82, 95)
        y = np.random.normal(25, 3)  # Centered around goal
        y = np.clip(y, 18, 32)
        
    elif zone == 'wide_box':
        # Wide penalty area (x: 82-95, y: 10-18 or 32-40)
        x = np.random.uniform(82, 95)
        if np.random.random() < 0.5:
            y = np.random.uniform(10, 18)  # Left side
        else:
            y = np.random.uniform(32, 40)  # Right side
            
    else:  # edge_box
        # Edge of box / outside box (x: 70-82, y: 12-38)
        x = np.random.uniform(70, 82)
        y = np.random.uniform(12, 38)
    
    return x, y


def generate_key_passes(player: Dict) -> List[Dict]:
    """
    Generate key pass locations based on assists
    
    Args:
        player: Player dictionary
    
    Returns:
        List of key pass locations
    """
    assists = player.get('assists', 0)
    xa_per_90 = player.get('xa_per_90', 0)
    position = player.get('position', 'MF')
    
    # Estimate key passes (assists are subset)
    estimated_key_passes = assists * 2 if assists > 0 else 3
    
    key_passes = []
    
    for i in range(min(estimated_key_passes, 10)):
        # Key passes typically from midfield/wing areas
        if position == 'MF':
            x = np.random.uniform(60, 85)
            y = np.random.uniform(10, 40)
        elif position == 'FW':
            x = np.random.uniform(75, 90)
            y = np.random.uniform(12, 38)
        else:  # DF
            x = np.random.uniform(55, 75)
            y = np.random.uniform(8, 42)
        
        key_passes.append({
            'id': f'kp_{i+1}',
            'x': round(x, 1),
            'y': round(y, 1),
            'type': 'key_pass'
        })
    
    return key_passes