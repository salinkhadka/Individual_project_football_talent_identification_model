"""
Smart Import Script - Only imports columns that exist in DB
"""
import pandas as pd
import sqlite3
import os
from models import Database


def clean_value(value):
    """Clean and convert values"""
    if pd.isna(value):
        return None
    if isinstance(value, (int, float)):
        return value
    if isinstance(value, str):
        return value.strip()
    return value


def get_db_columns(db_path: str) -> list:
    """Get list of columns that exist in the players table"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(players)")
    columns = [row[1] for row in cursor.fetchall()]
    conn.close()
    return columns


def import_from_excel(excel_path: str, db_path: str = "database.db"):
    """
    Smart import - aggregates all sheets into a single record per (player, season)
    """
    print("\n" + "=" * 70)
    print("AGGREGATED SMART IMPORT - PREVENTS DATA LOSS ACROSS SHEETS")
    print("=" * 70)
    
    if not os.path.exists(excel_path):
        raise FileNotFoundError(f"Excel file not found: {excel_path}")
    
    print(f"\n📂 Reading Excel file: {excel_path}")
    
    # Initialize database
    db = Database(db_path)
    
    # Get valid columns from DB
    valid_columns = get_db_columns(db_path)
    print(f"\n✅ Database columns detected: {len(valid_columns)}")
    
    # Clear existing data
    print("\n🗑️  Clearing existing database...")
    db.clear_all_data()
    
    # Load all sheets
    excel_sheets = pd.read_excel(excel_path, sheet_name=None)
    print(f"\n📝 Sheets found: {list(excel_sheets.keys())}")
    
    # Dictionary to aggregate all player data: (player_name, season) -> data_dict
    all_players_map = {}
    
    # Column mapping (moved outside the loop for efficiency)
    column_mapping = {
        'Player': 'player_name',
        'Season': 'season',
        'SeasonOrder': 'season_order',
        'IsLatestSeason': 'is_latest_season',
        'Age': 'age',
        'BirthYear': 'birth_year',
        'Position': 'position',
        'Pos_std': 'position',
        'Club': 'club',
        'Squad_std': 'club',
        'Nation': 'nation',
        'Nation_std': 'nation',
        'PredictedPotential': 'predicted_potential',
        'PerformanceScore': 'performance_score',
        'BasePerformanceScore': 'base_performance_score',
        'MLDevelopmentScore': 'ml_development_score',
        'PlayingTimeScore': 'playing_time_score',
        'Confidence': 'confidence',
        'ConfidenceWeight': 'confidence_weight',
        'AgeMultiplier': 'age_multiplier',
        'AgeBonus': 'age_bonus',
        'EliteBonus': 'elite_bonus',
        'SamplePenalty': 'sample_penalty',
        'Matches': 'matches',
        'Playing Time_MP_std': 'matches',
        'Starts': 'starts',
        'Playing Time_Starts': 'starts',
        'Minutes': 'minutes',
        'Playing Time_Min_std': 'minutes',
        'Nineties': 'nineties',
        'Playing Time_90s_match': 'nineties',
        'Goals': 'goals',
        'Performance_Gls': 'goals',
        'Assists': 'assists',
        'Performance_Ast': 'assists',
        'GoalsPer90': 'goals_per_90',
        'Per 90 Minutes_Gls': 'goals_per_90',
        'AssistsPer90': 'assists_per_90',
        'Per 90 Minutes_Ast': 'assists_per_90',
        'xGPer90': 'xg_per_90',
        'Expected_xG': 'xg_per_90',
        'xAPer90': 'xa_per_90',
        'Expected_xAG': 'xa_per_90',
        'SavePercentage': 'save_percentage',
        'Save%': 'save_percentage',
        'Performance_Save%': 'save_percentage',
        'CleanSheetPercentage': 'clean_sheet_percentage',
        'CS%': 'clean_sheet_percentage',
        'Performance_CS%': 'clean_sheet_percentage',
        'GoalsAgainstPer90': 'goals_against_per_90',
        'GA90': 'goals_against_per_90',
        'Performance_GA90': 'goals_against_per_90',
        'CleanSheets': 'clean_sheets',
        'CS': 'clean_sheets',
        'Performance_CS': 'clean_sheets',
        'GoalsAgainst': 'goals_against',
        'GA': 'goals_against',
        'Performance_GA': 'goals_against',
        'Saves': 'saves',
        'Performance_Saves': 'saves',
        'Tags': 'tags'
    }

    # Process each sheet and aggregate data
    for sheet_name, df in excel_sheets.items():
        print(f"\n📊 Aggregating sheet: {sheet_name}")
        if df.empty: continue
        
        sheet_count = 0
        for _, row in df.iterrows():
            # Build current row data
            current_data = {}
            for excel_col, db_col in column_mapping.items():
                if excel_col in row.index:
                    val = row.get(excel_col)
                    if pd.notna(val):
                        # Proper type conversion
                        if db_col in ['age', 'birth_year', 'matches', 'starts', 'minutes', 
                                     'goals', 'assists', 'clean_sheets', 'goals_against', 'saves']:
                            try: current_data[db_col] = int(float(val))
                            except: pass
                        elif db_col in ['is_latest_season']:
                            current_data[db_col] = bool(val)
                        else:
                            current_data[db_col] = clean_value(val)
            
            p_name = current_data.get('player_name')
            p_season = current_data.get('season')
            
            if not p_name or not p_season: continue
            
            key = (p_name, p_season)
            if key not in all_players_map:
                all_players_map[key] = current_data
            else:
                # Merge: update existing record with new non-null values
                for k, v in current_data.items():
                    # Preserve existing non-None values unless new value is "better"
                    # For numeric stats, we usually prefer non-zero if one is zero
                    if v is not None:
                        old_v = all_players_map[key].get(k)
                        if old_v is None or (isinstance(v, (int, float)) and old_v == 0 and v > 0):
                            all_players_map[key][k] = v
            sheet_count += 1
        print(f"   ✅ Processed {sheet_count} records.")

    # Convert mapping to list and filter columns
    print(f"\n🚀 Total unique player records: {len(all_players_map)}")
    final_players = []
    for player_data in all_players_map.values():
        final_players.append({k: v for k, v in player_data.items() if k in valid_columns})
    
    # Final bulk insert
    db.bulk_insert_players(final_players)
    
    # Update best potential flags (MANDATORY AFTER ALL INSERTS)
    print("\n🔄 Updating best potential flags...")
    db.update_best_potential_flags()
    
    # Show statistics
    
    # Show statistics
    print("\n" + "=" * 70)
    print("IMPORT SUMMARY")
    print("=" * 70)
    
    stats = db.get_statistics()
    print(f"\n✅ Import completed successfully!")
    print(f"   • Total unique players: {stats['total_players']}")
    print(f"   • Total season records: {stats['total_records']}")
    
    print(f"\n📊 Players by position (best potential):")
    for position, count in sorted(stats['by_position'].items()):
        avg_pot = stats['avg_potential_by_position'].get(position, 0)
        print(f"   • {position}: {count} players (avg potential: {avg_pot})")
    
    # Special check for GKs
    print("\n🧤 Goalkeeper Check:")
    gk_players = db.get_top_players_by_position('GK', limit=5)
    if gk_players:
        print(f"   ✅ Found {len(gk_players)} top GKs:")
        for i, gk in enumerate(gk_players[:5], 1):
            save_pct = gk.get('save_percentage', 0)
            print(f"   {i}. {gk['player_name']} ({gk.get('club', 'N/A')})")
            print(f"      • Potential: {gk['predicted_potential']:.1f}, Save%: {save_pct if save_pct else 'N/A'}")
    else:
        print("   ⚠️  WARNING: No goalkeepers found!")
        print("   • Check if Position column has 'GK' values")
        print("   • Check the 'Top 25 GK' sheet in Excel")
    
    print(f"\n💾 Database saved: {db_path}")
    print("\n🎉 Ready to start the Flask application!")


def main():
    """Main import function"""
    excel_path = "../model/outputs/bundesliga_comprehensive_analysis.xlsx"
    db_path = "database.db"
    
    # Check if running from different directory
    if not os.path.exists(excel_path):
        excel_path = "../outputs/bundesliga_comprehensive_analysis.xlsx"
    
    if not os.path.exists(excel_path):
        excel_path = input("Enter path to bundesliga_comprehensive_analysis.xlsx: ").strip()
    
    try:
        import_from_excel(excel_path, db_path)
    except Exception as e:
        print(f"\n❌ Import failed: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()