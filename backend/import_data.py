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


def process_sheet_smart(df, db, sheet_name, valid_columns):
    """Process a sheet - only insert columns that exist in DB"""
    print(f"\n📊 Processing sheet: {sheet_name}")
    if df.empty:
        print("   • No data found, skipping...")
        return

    # Print columns for GK sheets
    if 'GK' in sheet_name:
        print(f"   • Columns in Excel: {list(df.columns)[:15]}...")

    players_data = []
    for idx, row in df.iterrows():
        # Map Excel columns to DB columns
        column_mapping = {
            'Player': 'player_name',
            'Season': 'season',
            'SeasonOrder': 'season_order',
            'IsLatestSeason': 'is_latest_season',
            'Age': 'age',
            'BirthYear': 'birth_year',
            'Position': 'position',
            'Pos_std': 'position',  # Alternative
            'Club': 'club',
            'Squad_std': 'club',  # Alternative
            'Nation': 'nation',
            'Nation_std': 'nation',  # Alternative
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
        
        # Build player_data with only valid columns
        player_data = {}
        
        for excel_col, db_col in column_mapping.items():
            if db_col in valid_columns and excel_col in row.index:
                value = row.get(excel_col)
                
                # Handle boolean conversion
                if db_col == 'is_latest_season':
                    player_data[db_col] = bool(value) if pd.notna(value) else False
                # Handle integer conversion
                elif db_col in ['age', 'birth_year', 'matches', 'starts', 'minutes', 
                               'goals', 'assists', 'clean_sheets', 'goals_against', 'saves']:
                    player_data[db_col] = int(value) if pd.notna(value) else (0 if db_col in ['matches', 'starts', 'minutes', 'goals', 'assists'] else None)
                # Handle float/numeric conversion
                elif db_col in ['predicted_potential', 'performance_score', 'base_performance_score',
                               'ml_development_score', 'playing_time_score', 'confidence_weight',
                               'age_multiplier', 'age_bonus', 'elite_bonus', 'sample_penalty',
                               'nineties', 'goals_per_90', 'assists_per_90', 'xg_per_90', 'xa_per_90',
                               'save_percentage', 'clean_sheet_percentage', 'goals_against_per_90']:
                    player_data[db_col] = clean_value(value)
                # Handle strings
                else:
                    player_data[db_col] = clean_value(value)
        
        # Debug: print first GK found
        if player_data.get('position') == 'GK' and idx == 0:
            print(f"   • First GK found: {player_data.get('player_name')}")
            print(f"     - Save%: {player_data.get('save_percentage')}")
            print(f"     - CS%: {player_data.get('clean_sheet_percentage')}")
            print(f"     - Saves: {player_data.get('saves')}")
            print(f"     - Potential: {player_data.get('predicted_potential')}")
            print(f"     - DB columns used: {list(player_data.keys())}")
        
        players_data.append(player_data)

        # Progress indicator
        if (idx + 1) % 500 == 0:
            print(f"   • Processed {idx + 1}/{len(df)} records...")

    # Insert sheet data
    db.bulk_insert_players(players_data)
    print(f"   ✅ Sheet '{sheet_name}' imported ({len(players_data)} records).")
    
    # Count GKs in this sheet
    gk_count = sum(1 for p in players_data if p.get('position') == 'GK')
    if gk_count > 0:
        print(f"   🧤 Goalkeepers in this sheet: {gk_count}")


def import_from_excel(excel_path: str, db_path: str = "database.db"):
    """
    Smart import - only imports columns that exist in DB
    """
    print("\n" + "=" * 70)
    print("SMART IMPORT - AUTO-DETECTS DATABASE SCHEMA")
    print("=" * 70)
    
    if not os.path.exists(excel_path):
        raise FileNotFoundError(f"Excel file not found: {excel_path}")
    
    print(f"\n📂 Reading Excel file: {excel_path}")
    
    # Initialize database
    db = Database(db_path)
    
    # Get valid columns from DB
    valid_columns = get_db_columns(db_path)
    print(f"\n✅ Database columns detected: {len(valid_columns)}")
    print(f"   • Sample columns: {valid_columns[:10]}...")
    
    # Clear existing data
    print("\n🗑️  Clearing existing database...")
    db.clear_all_data()
    
    # Load all sheets
    excel_sheets = pd.read_excel(excel_path, sheet_name=None)
    print(f"\n📝 Sheets found: {list(excel_sheets.keys())}")
    
    # Process each sheet
    for sheet_name, df in excel_sheets.items():
        process_sheet_smart(df, db, sheet_name, valid_columns)
    
    # Update best potential flags
    print("\n🔄 Updating best potential flags...")
    db.update_best_potential_flags()
    
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