import sqlite3
import json

def check_gk():
    conn = sqlite3.connect('database.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM players WHERE position = 'GK' AND player_name LIKE '%Bärtl%' LIMIT 1")
    row = cursor.fetchone()
    if not row:
        cursor.execute("SELECT * FROM players WHERE position = 'GK' LIMIT 1")
        row = cursor.fetchone()
    
    if row:
        d = dict(row)
        print(f"\nFull Data for {d.get('player_name')}:")
        for k, v in d.items():
            print(f"{k}: {v}")

if __name__ == "__main__":
    check_gk()
