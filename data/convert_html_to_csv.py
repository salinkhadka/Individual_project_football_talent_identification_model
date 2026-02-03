import pandas as pd
import os
from io import StringIO

def load_html_table(filename):
    base_path = os.path.dirname(__file__)
    full_path = os.path.join(base_path, filename)
    with open(full_path, "r", encoding="utf-8") as f:
        html = f.read()
    tables = pd.read_html(StringIO(html))
    return tables[0]

print("🔍 Loading HTML tables...")
df_std = load_html_table("playersmain.html")
df_match = load_html_table("playersmain_match.html")

# ----------- FLATTEN COLUMNS -----------------
def flatten_columns(df):
    new_cols = []
    for col in df.columns:
        if isinstance(col, tuple):
            parts = [str(x) for x in col if str(x) and not str(x).startswith("Unnamed")]
            new_cols.append("_".join(parts) if parts else str(col[-1]))
        else:
            new_cols.append(str(col))
    df.columns = new_cols
    return df

df_std = flatten_columns(df_std)
df_match = flatten_columns(df_match)

print("\nCleaned Standard Columns:", df_std.columns.tolist()[:10])
print("Cleaned Matches Columns:", df_match.columns.tolist()[:10])

# ------ FIX PLAYER COLUMN NAME --------
player_col_std = [c for c in df_std.columns if "Player" in c or c == "Player"][0]
player_col_match = [c for c in df_match.columns if "Player" in c or c == "Player"][0]

df_std = df_std.rename(columns={player_col_std: "Player"})
df_match = df_match.rename(columns={player_col_match: "Player"})

# Remove repeated header rows
df_std = df_std[df_std["Player"] != "Player"]
df_match = df_match[df_match["Player"] != "Player"]

# Reset index
df_std.reset_index(drop=True, inplace=True)
df_match.reset_index(drop=True, inplace=True)

print(f"\nRows in df_std: {len(df_std)}")
print(f"Rows in df_match: {len(df_match)}")

# ------- Keep only players appearing in both -------
common_players = set(df_std["Player"]) & set(df_match["Player"])
print(f"Common players: {len(common_players)}")

df_std = df_std[df_std["Player"].isin(common_players)]
df_match = df_match[df_match["Player"].isin(common_players)]

# -------- Drop fully null columns ------------
null_cols_std = df_std.columns[df_std.isnull().all()].tolist()
null_cols_match = df_match.columns[df_match.isnull().all()].tolist()

if null_cols_std:
    print(f"Dropping null columns from std: {null_cols_std}")
    df_std = df_std.drop(columns=null_cols_std)

if null_cols_match:
    print(f"Dropping null columns from match: {null_cols_match}")
    df_match = df_match.drop(columns=null_cols_match)

# -------------- MERGE -------------------
df_merged = pd.merge(df_std, df_match, on="Player", suffixes=("_std", "_match"))

# -------------- DROP DUPLICATE RIGHT-SIDE COLUMNS -------------
duplicate_pairs = [
    ("Nation_std", "Nation_match"),
    ("Pos_std", "Pos_match"),
    ("Squad_std", "Squad_match"),
    ("Playing Time_Min_std", "Playing Time_Min_match"),
    ("Playing Time_Starts", "Playing Time_MP_match"),
    ("Born_std", "Born_match"),
]

cols_to_drop = []

for left, right in duplicate_pairs:
    if right in df_merged.columns:
        cols_to_drop.append(right)

# Also drop unwanted columns requested:
cols_to_drop += [
    "Age_std",
    "Performance_CrdY",
    "Performance_CrdR",
    "Age_match"
]

cols_to_drop = [c for c in cols_to_drop if c in df_merged.columns]

print(f"\nDropping duplicate/unwanted columns: {cols_to_drop}")
df_merged = df_merged.drop(columns=cols_to_drop)

# Drop Rk / Matches if exist
extra_drop = [c for c in df_merged.columns if c in 
              ["Rk", "Rk_std", "Rk_match", "Matches", "Matches_std", "Matches_match"]]

if extra_drop:
    print(f"Dropping unnecessary ranking/matches columns: {extra_drop}")
    df_merged = df_merged.drop(columns=extra_drop)

# -------- SAVE CSV --------
output_path = os.path.join(os.path.dirname(__file__), "players_2025-26.csv")

try:
    df_merged.to_csv(output_path, index=False)
    print("\n✅ Merged players.csv saved!")
except PermissionError:
    output_path = os.path.join(os.path.dirname(__file__), "players_2025-26.csv")
    df_merged.to_csv(output_path, index=False)
    print(f"\n⚠️ File locked. Saved as players_2025-26.csv instead!")

print(f"Total players: {len(df_merged)}")
print(f"Total columns: {len(df_merged.columns)}")
print("\nFinal column names:")
for i, col in enumerate(df_merged.columns, 1):
    print(f"  {i}. {col}")
