"""
Flask Backend API for Bundesliga Youth Potential App - FINAL FIXED
Now shows BEST potential season, not LATEST season
"""
from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from models import Database
from calculator import PotentialCalculator
from analytics import (
    calculate_similar_players, 
    generate_scouting_report
)
from shotmap_generator import generate_shotmap, generate_key_passes
import os
import io
import csv

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Initialize database and calculator
db = Database("database.db")
calculator = PotentialCalculator()

# ============================================================================
# HELPER FUNCTIONS - FIXED
# ============================================================================

def safe_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def player_to_frontend_format(player: dict) -> dict:
    """Convert database player to frontend expected format - FIXED"""
    predicted_potential = safe_float(player.get('predicted_potential'), 0)
    performance_score = safe_float(player.get('performance_score'), 0)
    
    # ENSURE current rating never exceeds peak potential
    current_rating = min(performance_score, predicted_potential) if predicted_potential > 0 else performance_score
    
    # Calculate next season estimate (capped at potential)
    next_season_estimate = min(current_rating + 2, predicted_potential) if predicted_potential > 0 else current_rating + 2
    
    # Get development scores with defaults
    ml_dev = safe_float(player.get('ml_development_score'), 0)
    base_perf = safe_float(player.get('base_performance_score'), current_rating)
    playing_time = safe_float(player.get('playing_time_score'), 0)  # FIXED HERE
    
    return {
        'id': player.get('id'),
        'Player': player.get('player_name'),
        'Squad_std': player.get('club'),
        'Pos_std': player.get('position'),
        'Age_std': player.get('age'),
        'Age': player.get('age'),
        'Season': player.get('season'),
        'Nation_std': player.get('nation'),
        
        # Performance metrics - FIXED
        'peak_potential': round(predicted_potential, 1),
        'PredictedPotential': round(predicted_potential, 1),
        'current_rating': round(current_rating, 1),
        'CurrentRating': round(current_rating, 1),
        'next_season_rating': round(next_season_estimate, 1),
        'PerformanceScore': round(current_rating, 1),
        
        # Development metrics - FIXED null values
        'ml_development_score': round(ml_dev, 1),
        'base_performance_score': round(base_perf, 1),
        'playing_time_score': round(playing_time, 1),
        'confidence': player.get('confidence', 'Medium'),
        
        # Playing time
        'Playing Time_MP_std': player.get('matches', 0),
        'Playing Time_MP_raw': player.get('matches', 0),
        'matches_played_display': player.get('matches', 0),
        'Playing Time_Starts': player.get('starts', 0),
        'Starts_Starts': player.get('starts', 0),
        'Playing Time_Min_std': player.get('minutes', 0),
        'Playing Time_Min_raw': player.get('minutes', 0),
        'Playing Time_90s_match': safe_float(player.get('nineties'), 0),
        'Playing Time_Mn/MP': player.get('minutes', 0) / player.get('matches', 1) if player.get('matches', 0) > 0 else 0,
        'Playing Time_Min%': 0,
        
        # Performance stats
        'Performance_Gls': player.get('goals', 0),
        'Performance_G-PK': player.get('goals', 0),
        'Performance_PK': 0,
        'Performance_PKatt': 0,
        'Per 90 Minutes_Gls': safe_float(player.get('goals_per_90'), 0),
        'Per 90 Minutes_G-PK': safe_float(player.get('goals_per_90'), 0),
        
        # Advanced stats
        'goals': player.get('goals', 0),
        'assists': player.get('assists', 0),
        'goals_per_90': safe_float(player.get('goals_per_90'), 0),
        'assists_per_90': safe_float(player.get('assists_per_90'), 0),
        'xg_per_90': safe_float(player.get('xg_per_90'), 0),
        'xa_per_90': safe_float(player.get('xa_per_90'), 0),
        'minutes': player.get('minutes', 0),
        'matches': player.get('matches', 0),
        'starts': player.get('starts', 0),
        
        # GK stats
        'SavePercentage': safe_float(player.get('save_percentage'), 0),
        'CleanSheetPercentage': safe_float(player.get('clean_sheet_percentage'), 0),
        'GoalsAgainstPer90': safe_float(player.get('goals_against_per_90'), 0),
        
        # Metadata
        'Confidence': player.get('confidence', 'Medium'),
        'Tags': player.get('tags', ''),
        'low_sample_size': player.get('matches', 0) < 3,
        
        # NEW: Flag for best potential season
        'is_best_potential': bool(player.get('is_best_potential', False)),
        'is_latest_season': bool(player.get('is_latest_season', False)),
        
        # Additional fields for PlayerDetail
        'age_multiplier': safe_float(player.get('age_multiplier'), 1.0),
        'age_bonus': safe_float(player.get('age_bonus'), 0),
        'elite_bonus': safe_float(player.get('elite_bonus'), 0),
        'sample_penalty': safe_float(player.get('sample_penalty'), 0),
        'confidence_weight': safe_float(player.get('confidence_weight'), 0.7)
    }

# ============================================================================
# API ENDPOINTS - FIXED
# ============================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'API is running', 'best_potential_mode': True})


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get database statistics"""
    try:
        stats = db.get_statistics()
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/players', methods=['GET'])
def get_players():
    """
    Get players with pagination - FIXED to show BEST potential
    Query params:
        - page: page number (default 1)
        - per_page: items per page (default 50)
        - position: filter by position
    """
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        position = request.args.get('position', None)
        
        # Get all players (BEST potential only)
        all_players = db.get_top_prospects(limit=1000, position=position)
        
        # Paginate
        total = len(all_players)
        start = (page - 1) * per_page
        end = start + per_page
        
        players = all_players[start:end]
        
        # Convert to frontend format
        formatted_players = [player_to_frontend_format(p) for p in players]
        
        return jsonify({
            'items': formatted_players,
            'total': total,
            'page': page,
            'per_page': per_page,
            'pages': (total + per_page - 1) // per_page,
            'mode': 'best_potential'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/players/<int:player_id>', methods=['GET'])
def get_player_by_id(player_id):
    """Get specific player by ID"""
    try:
        player = db.get_player_by_id(player_id)
        if player:
            formatted = player_to_frontend_format(player)
            
            # Fetch progression to determine context
            raw_prog = db.get_player_progression(player.get('player_name'))
            progression = [player_to_frontend_format(p) for p in raw_prog]
            
            # Add context flags
            formatted['progression'] = progression
            formatted['has_incomplete_season'] = any(p.get('Season', '').startswith('2025') for p in progression)
            
            # Check if this IS the best season (in case id lookup was used)
            max_pot = max([p.get('peak_potential', 0) for p in progression]) if progression else 0
            formatted['is_best_potential'] = formatted.get('peak_potential', 0) >= max_pot
            
            return jsonify(formatted)
        else:
            return jsonify({'error': 'Player not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/players/search', methods=['GET'])
def search_players():
    """
    Search players - FIXED to show BEST potential season
    Query params:
        - q: search query (name or club)
        - position: filter by position
    """
    try:
        query = request.args.get('q', '')
        position = request.args.get('position', None)
        
        if not query:
            return jsonify([])
        
        results = db.search_players(query, position, season=None)
        formatted = [player_to_frontend_format(p) for p in results]
        
        return jsonify(formatted)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/players/<player_name>/progression', methods=['GET'])
def get_player_progression_by_name(player_name):
    """Get player progression across all seasons by name"""
    try:
        progression = db.get_player_progression(player_name)
        
        if not progression:
            return jsonify({'error': 'Player not found'}), 404
        
        # Calculate progression changes
        formatted_progression = []
        for i, current in enumerate(progression):
            formatted = player_to_frontend_format(current)
            
            if i < len(progression) - 1:
                previous = progression[i + 1]
                prev_potential = previous.get('predicted_potential')
                if prev_potential:
                    formatted['previous_potential'] = float(prev_potential)
                    formatted['potential_change'] = round(
                        float(current.get('predicted_potential', 0)) - float(prev_potential), 1
                    )
            
            formatted_progression.append(formatted)
        
        return jsonify(formatted_progression)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/players/<player_name>/best', methods=['GET'])
def get_player_best_season(player_name):
    """Get player's BEST season (highest potential)"""
    try:
        player = db.get_player_best_season(player_name)
        
        if not player:
            return jsonify({'error': 'Player not found'}), 404
        
        formatted = player_to_frontend_format(player)
        return jsonify(formatted)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/players/<int:player_id>/recalculate', methods=['POST'])
def recalculate_potential(player_id):
    """Recalculate potential for a specific player"""
    try:
        player = db.get_player_by_id(player_id)
        if not player:
            return jsonify({'error': 'Player not found'}), 404
        
        new_scores = calculator.calculate_potential(player)
        
        # PERSIST TO DB
        db.update_player_scores(player_id, new_scores)
        
        result = {
            'player_name': player['player_name'],
            'season': player['season'],
            'old_scores': {
                'predicted_potential': player.get('predicted_potential'),
                'performance_score': player.get('performance_score'),
                'ml_development_score': player.get('ml_development_score')
            },
            'new_scores': new_scores,
            'persisted': True
        }
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# POSITION RANKINGS ENDPOINTS - NEW
# ============================================================================

# @app.route('/api/positions/rankings', methods=['GET'])
# def get_position_rankings():
#     """Get top 25 players by position (BEST potential)"""
#     try:
#         position = request.args.get('position', 'FW')
#         limit = request.args.get('limit', 25, type=int)
        
#         players = db.get_top_players_by_position(position, limit)
#         formatted = [player_to_frontend_format(p) for p in players]
        
#         return jsonify({
#             'position': position,
#             'players': formatted,
#             'count': len(formatted)
#         })
#     except Exception as e:
#         return jsonify({'error': str(e)}), 500


@app.route('/api/positions/rankings', methods=['GET'])
def get_position_rankings():
    """Get top 25 players by position (BEST potential)"""
    try:
        position = request.args.get('position', 'FW')
        limit = request.args.get('limit', 25, type=int)
        
        print(f"🔍 Fetching rankings for position: {position}, limit: {limit}")  # ADD THIS
        
        players = db.get_top_players_by_position(position, limit)
        
        print(f"✅ Found {len(players)} players")  # ADD THIS
        
        formatted = [player_to_frontend_format(p) for p in players]
        
        return jsonify({
            'position': position,
            'players': formatted,
            'count': len(formatted)
        })
    except Exception as e:
        print(f"❌ ERROR in get_position_rankings: {str(e)}")  # ADD THIS
        import traceback
        traceback.print_exc()  # ADD THIS
        return jsonify({'error': str(e)}), 500


@app.route('/api/positions/summary', methods=['GET'])
def get_positions_summary():
    """Get summary of top players for each position"""
    try:
        positions = ['FW', 'MF', 'DF', 'GK']
        result = {}
        
        for position in positions:
            players = db.get_top_players_by_position(position, limit=5)
            if players:
                result[position] = {
                    'count': len(players),
                    'top_players': [
                        {
                            'id': p['id'],
                            'name': p['player_name'],
                            'potential': p['predicted_potential'],
                            'current': p['performance_score'],
                            'age': p['age'],
                            'club': p['club']
                        }
                        for p in players[:3]
                    ]
                }
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# WATCHLIST ENDPOINTS
# ============================================================================

@app.route('/api/watchlist', methods=['GET'])
def get_watchlist():
    """Get user's watchlist"""
    try:
        watchlist = db.get_watchlist()
        return jsonify({'watchlist': watchlist})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/watchlist/add', methods=['POST'])
def add_to_watchlist():
    """Add player to watchlist"""
    try:
        data = request.get_json()
        player_id = data.get('player_id')
        
        if not player_id:
            return jsonify({'error': 'player_id required'}), 400
        
        success = db.add_to_watchlist(player_id)
        
        if success:
            return jsonify({'message': 'Added to watchlist'})
        else:
            return jsonify({'message': 'Already in watchlist'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/watchlist/remove/<int:player_id>', methods=['DELETE'])
def remove_from_watchlist(player_id):
    """Remove player from watchlist"""
    try:
        success = db.remove_from_watchlist(player_id)
        
        if success:
            return jsonify({'message': 'Removed from watchlist'})
        else:
            return jsonify({'error': 'Player not in watchlist'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# TEAM ENDPOINTS
# ============================================================================

@app.route('/api/teams', methods=['GET'])
def get_teams():
    """Get all teams with analytics"""
    try:
        teams = db.get_all_teams()
        return jsonify(teams)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/team/<team_name>', methods=['GET'])
def get_team_analytics(team_name):
    """Get specific team analytics"""
    try:
        players = db.get_team_players(team_name)
        
        if not players:
            return jsonify({'error': 'Team not found'}), 404
        
        # Calculate team analytics
        total_players = len(players)
        avg_potential = sum(p.get('predicted_potential', 0) for p in players) / total_players
        avg_current = sum(p.get('performance_score', 0) for p in players) / total_players
        avg_age = sum(p.get('age', 0) for p in players) / total_players
        
        # Position breakdown
        position_breakdown = {}
        for p in players:
            pos = p.get('position', 'Unknown')
            position_breakdown[pos] = position_breakdown.get(pos, 0) + 1
        
        # Top prospects
        top_prospects = sorted(players, key=lambda x: x.get('predicted_potential', 0), reverse=True)[:3]
        
        formatted_players = [player_to_frontend_format(p) for p in players]
        formatted_top = [
            {
                'id': p.get('id'),
                'name': p.get('player_name'),
                'position': p.get('position'),
                'peak_potential': p.get('predicted_potential')
            }
            for p in top_prospects
        ]
        
        return jsonify({
            'team_name': team_name,
            'total_players': total_players,
            'avg_ratings': {
                'peak_potential': round(avg_potential, 1),
                'current_rating': round(avg_current, 1)
            },
            'avg_age': round(avg_age, 1),
            'position_breakdown': position_breakdown,
            'top_prospects': formatted_top,
            'players': formatted_players
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# SCOUTING REPORT ENDPOINTS
# ============================================================================

@app.route('/api/scouting-report/<int:player_id>', methods=['GET'])
def get_scouting_report(player_id):
    """Generate comprehensive scouting report"""
    try:
        player = db.get_player_by_id(player_id)
        if not player:
            return jsonify({'error': 'Player not found'}), 404
        
        # Get all players for similarity calculation
        all_players = db.get_top_prospects(limit=500, position=player.get('position'))
        
        # Find similar players
        similar_players = calculate_similar_players(player, all_players, top_n=5)
        
        # Format similar players
        formatted_similar = [
            {
                'id': p.get('id'),
                'name': p.get('player_name'),
                'team': p.get('club'),
                'position': p.get('position'),
                'age': p.get('age'),
                'current_rating': p.get('performance_score', 0),
                'peak_potential': p.get('predicted_potential', 0),
                'similarity_score': p.get('similarity_score', 0)
            }
            for p in similar_players
        ]
        
        # Get progression history to include in report
        raw_progression = db.get_player_progression(player.get('player_name'))
        progression = [player_to_frontend_format(p) for p in raw_progression]
        player['progression'] = progression
        
        # Generate report
        report = generate_scouting_report(player, formatted_similar)
        
        return jsonify(report)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# SHOTMAP ENDPOINTS
# ============================================================================

@app.route('/api/shotmap/<int:player_id>', methods=['GET'])
def get_shotmap(player_id):
    """Generate shotmap for player"""
    try:
        player = db.get_player_by_id(player_id)
        if not player:
            return jsonify({'error': 'Player not found'}), 404
        
        # Generate shots
        shots = generate_shotmap(player)
        
        # Add key passes if applicable
        if player.get('position') in ['MF', 'FW']:
            key_passes = generate_key_passes(player)
            shots.extend(key_passes)
        
        return jsonify(shots)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# EXPORT ENDPOINTS
# ============================================================================

@app.route('/api/export/players', methods=['POST'])
def export_players():
    """Export filtered players to CSV"""
    try:
        filters = request.get_json() or {}
        
        position = filters.get('position')
        min_age = filters.get('min_age')
        max_age = filters.get('max_age')
        min_potential = filters.get('min_potential')
        
        # Get players (BEST potential only)
        players = db.get_top_prospects(limit=1000, position=position)
        
        # Apply additional filters
        filtered = players
        if min_age:
            filtered = [p for p in filtered if p.get('age', 0) >= float(min_age)]
        if max_age:
            filtered = [p for p in filtered if p.get('age', 0) <= float(max_age)]
        if min_potential:
            filtered = [p for p in filtered if p.get('predicted_potential', 0) >= float(min_potential)]
        
        # Create CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Header
        writer.writerow([
            'Player', 'Club', 'Position', 'Age', 'Matches', 'Goals',
            'Current Rating', 'Peak Potential', 'Confidence', 'Season'
        ])
        
        # Data
        for p in filtered:
            formatted = player_to_frontend_format(p)
            writer.writerow([
                formatted['Player'],
                formatted['Squad_std'],
                formatted['Pos_std'],
                formatted['Age'],
                formatted['matches'],
                formatted['goals'],
                formatted['current_rating'],
                formatted['peak_potential'],
                formatted['Confidence'],
                formatted['Season']
            ])
        
        output.seek(0)
        return output.getvalue(), 200, {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename=players_export.csv'
        }
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/compare', methods=['POST'])
def compare_players():
    """
    Compare multiple players - FIXED to use BEST potential
    Request body: { "player_ids": [1, 2, 3, ...] }
    """
    try:
        data = request.get_json()
        player_ids = data.get('player_ids', [])
        
        if not player_ids:
            return jsonify({'error': 'No player IDs provided'}), 400
        
        players = []
        for player_id in player_ids:
            player = db.get_player_by_id(player_id)
            if player:
                players.append(player_to_frontend_format(player))
        
        return jsonify(players)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/seasons', methods=['GET'])
def get_seasons():
    """Get all available seasons"""
    try:
        seasons = db.get_all_seasons()
        return jsonify(seasons)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/clubs', methods=['GET'])
def get_clubs():
    """Get all clubs"""
    try:
        clubs = db.get_all_clubs()
        return jsonify(clubs)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/positions', methods=['GET'])
def get_positions():
    """Get all positions"""
    return jsonify(['FW', 'MF', 'DF', 'GK'])


# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404


@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500


# ============================================================================
# RUN APP
# ============================================================================

if __name__ == '__main__':
    print("\n" + "=" * 70)
    print("BUNDESLIGA YOUTH POTENTIAL - BACKEND FIXED ✅")
    print("=" * 70)
    print("\n🚀 Starting Flask server...")
    print("📊 Database: database.db")
    print("🔧 Model loaded:", "Yes" if calculator.model else "No (using fallback)")
    print("✅ Showing: BEST POTENTIAL season (not latest season)")
    print("\n💡 API running at: http://localhost:5000")
    print("📖 Available endpoints:")
    print("   • GET  /api/health")
    print("   • GET  /api/stats")
    print("   • GET  /api/players (with pagination)")
    print("   • GET  /api/players/<id>")
    print("   • GET  /api/players/<name>/best (NEW: Best season)")
    print("   • GET  /api/players/search?q=...")
    print("   • GET  /api/players/<name>/progression")
    print("   • GET  /api/positions/rankings?position=FW (NEW)")
    print("   • GET  /api/positions/summary (NEW)")
    print("   • POST /api/compare")
    print("\n" + "=" * 70)
    
    app.run(debug=True, port=5000, host='0.0.0.0')