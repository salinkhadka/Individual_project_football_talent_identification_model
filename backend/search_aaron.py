import sqlite3
import pandas as pd

def search_aaron():
    conn = sqlite3.connect('database.db')
    query = "SELECT * FROM players WHERE player_name LIKE '%Aaron Held%'"
    df = pd.read_sql_query(query, conn)
    print(df[['player_name', 'season', 'matches', 'minutes', 'save_percentage', 'clean_sheet_percentage', 'goals_against_per_90']])
    conn.close()

if __name__ == "__main__":
    search_aaron()
