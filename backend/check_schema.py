import sqlite3

def check_schema():
    conn = sqlite3.connect('database.db')
    cursor = conn.cursor()
    cursor.execute("SELECT sql FROM sqlite_master WHERE name='players'")
    print(cursor.fetchone()[0])
    conn.close()

if __name__ == "__main__":
    check_schema()
