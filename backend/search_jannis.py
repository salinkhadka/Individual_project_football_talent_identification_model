import sqlite3
import pandas as pd

def search_jannis():
    conn = sqlite3.connect('database.db')
    query = "SELECT * FROM players WHERE player_name LIKE '%Bärtl%'"
    df = pd.read_sql_query(query, conn)
    cols = ['player_name', 'season', 'matches', 'minutes', 'save_percentage', 'clean_sheet_percentage', 'goals_against_per_90']
    cols = [c for c in cols if c in df.columns]
    print(df[cols])
    conn.close()

if __name__ == "__main__":
    search_jannis()
