import pandas as pd

# Read the HTML file
tables = pd.read_html("players.html")
df = tables[0]

# Flatten multi-level column names if needed
df.columns = [
    " ".join(map(str, col)).replace("\xa0", " ").strip() if isinstance(col, tuple) else str(col).replace("\xa0", " ").strip()
    for col in df.columns
]

# Debug: Print actual column names to see what we're working with
print("Actual columns found:")
print(df.columns.tolist())
print("\nFirst few rows:")
print(df.head())

# Find the player column (it might have extra text)
player_col = None
for col in df.columns:
    if 'Player' in col:
        player_col = col
        break

if player_col is None:
    raise ValueError("Could not find a column containing 'Player'")

print(f"\nUsing column: '{player_col}'")

# Remove repeated header rows
df = df[df[player_col] != 'Player']

# Drop any rows where Player column is missing
df = df.dropna(subset=[player_col])

# Optional: reset index
df = df.reset_index(drop=True)

# Save clean CSV
df.to_csv("players.csv", index=False)
print("\n✅ players.csv saved successfully!")
print(f"Total players: {len(df)}")
print("Columns:", list(df.columns))