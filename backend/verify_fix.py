"""
Verify that Iaia Danfa shows 91.0 potential instead of 74.2
"""
import sqlite3

def verify_fix():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    print("=" * 70)
    print("VERIFYING FIX: Iaia Danfa should show 91.0 (not 74.2)")
    print("=" * 70)
    
    # Check current data
    cursor.execute("""
        SELECT player_name, season, predicted_potential, 
               performance_score, is_latest_season
        FROM players 
        WHERE player_name LIKE '%Iaia Danfa%'
        ORDER BY predicted_potential DESC
    """)
    
    print("\n📊 All seasons for Iaia Danfa:")
    for row in cursor.fetchall():
        print(f"  • {row['season']}: {row['predicted_potential']} potential")
        print(f"    Current rating: {row['performance_score']}")
        print(f"    Is latest season: {row['is_latest_season']}")
    
    # Check if we have is_best_potential column
    try:
        cursor.execute("""
            SELECT player_name, season, predicted_potential, is_best_potential
            FROM players 
            WHERE player_name LIKE '%Iaia Danfa%'
        """)
        
        print("\n✅ Database has is_best_potential column:")
        for row in cursor.fetchall():
            print(f"  • {row['season']}: {row['predicted_potential']} potential")
            print(f"    Is best potential: {row['is_best_potential']}")
    except sqlite3.OperationalError:
        print("\n❌ Missing is_best_potential column - run the fix!")
    
    conn.close()

if __name__ == "__main__":
    verify_fix()