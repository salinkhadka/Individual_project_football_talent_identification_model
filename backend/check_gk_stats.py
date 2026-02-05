import sqlite3

def check_stats():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("SELECT player_name, save_percentage, clean_sheet_percentage, goals_against_per_90 FROM players WHERE position = 'GK' AND save_percentage IS NOT NULL AND save_percentage > 0 LIMIT 5")
    rows = cursor.fetchall()
    print("GKs with >0 Save%:")
    for r in rows:
        print(r)
        
    cursor.execute("SELECT COUNT(*) FROM players WHERE position = 'GK' AND save_percentage = 0")
    print(f"GKs with 0 Save%: {cursor.fetchone()[0]}")
    
    cursor.execute("SELECT COUNT(*) FROM players WHERE position = 'GK' AND save_percentage IS NULL")
    print(f"GKs with NULL Save%: {cursor.fetchone()[0]}")
    
    conn.close()

if __name__ == "__main__":
    check_stats()
