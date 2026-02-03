import pandas as pd
import os
from bs4 import BeautifulSoup

# =============================================================================
# EXTRACT ALL DATA DIRECTLY FROM HTML
# =============================================================================

def extract_keeper_data(filename):
    """Extract all goalkeeper data directly from HTML"""
    base_path = os.path.dirname(__file__)
    full_path = os.path.join(base_path, filename)

    if not os.path.exists(full_path):
        print(f"❌ File not found: {full_path}")
        return None

    with open(full_path, "r", encoding="utf-8") as f:
        html = f.read()

    soup = BeautifulSoup(html, 'html.parser')
    table = soup.find('table', {'id': 'stats_keeper'})
    
    if not table:
        print("❌ Could not find table in HTML")
        return None
    
    # Column mapping based on data-stat attributes
    stat_columns = {
        'player': 'Player',
        'nationality': 'Nation',
        'position': 'Pos',
        'team': 'Squad',
        'age': 'Age',
        'birth_year': 'Born',
        'gk_games': 'MP',
        'gk_games_starts': 'Starts',
        'gk_minutes': 'Min',
        'minutes_90s': '90s',
        'gk_goals_against': 'GA',
        'gk_goals_against_per90': 'GA90',
        'gk_shots_on_target_against': 'SoTA',
        'gk_saves': 'Saves',
        'gk_save_pct': 'Save%',
        'gk_wins': 'W',
        'gk_ties': 'D',
        'gk_losses': 'L',
        'gk_clean_sheets': 'CS',
        'gk_clean_sheets_pct': 'CS%',
        'gk_pens_att': 'PKatt',
        'gk_pens_allowed': 'PKA',
        'gk_pens_saved': 'PKsv',
        'gk_pens_missed': 'PKm',
        'gk_pens_save_pct': 'PK_Save%'
    }
    
    data = []
    rows = table.find('tbody').find_all('tr')
    
    print(f"\n🔍 Found {len(rows)} rows in HTML")
    
    # Debug: Check first few rows for GA data
    print("\n🔍 Checking first 5 rows for GA data:")
    for i, row in enumerate(rows[:5]):
        player_cell = row.find('td', {'data-stat': 'player'})
        ga_cell = row.find('td', {'data-stat': 'gk_goals_against'})
        if player_cell:
            player_name = player_cell.get_text(strip=True)
            ga_value = ga_cell.get_text(strip=True) if ga_cell else "N/A"
            ga_classes = ga_cell.get('class', []) if ga_cell else []
            has_iz = 'iz' in ga_classes
            print(f"  Row {i}: {player_name} - GA: '{ga_value}' | has 'iz' class: {has_iz}")
    
    # Check if GA data exists anywhere in the table
    has_ga_data = False
    for row in rows:
        ga_cell = row.find('td', {'data-stat': 'gk_goals_against'})
        if ga_cell:
            ga_text = ga_cell.get_text(strip=True)
            ga_classes = ga_cell.get('class', [])
            if ga_text and 'iz' not in ga_classes:
                has_ga_data = True
                break
    
    if not has_ga_data:
        print("\n⚠️  WARNING: This data source does not contain GA (Goals Against) statistics!")
        print("    The 'iz' class indicates intentionally missing/unavailable data.")
        print("    This is common for youth leagues where advanced stats aren't tracked.\n")
    
    for row in rows:
        # Skip header rows
        if row.find('th', {'data-stat': 'ranker'}):
            ranker = row.find('th', {'data-stat': 'ranker'}).get_text(strip=True)
            if ranker == 'Rk':
                continue
        
        row_data = {}
        
        # Extract each stat
        for stat_name, col_name in stat_columns.items():
            cell = row.find(['td', 'th'], {'data-stat': stat_name})
            if cell:
                # First try to get text content
                value = cell.get_text(strip=True)
                
                # If empty, check for csk attribute (which might contain the actual value)
                if not value or value == '':
                    value = cell.get('csk', '')
                
                # If still empty, check data-tip or other attributes
                if not value or value == '':
                    value = cell.get('data-tip', '')
                
                if value and value not in ['', 'nan']:
                    row_data[col_name] = value
                else:
                    row_data[col_name] = None
            else:
                row_data[col_name] = None
        
        # Only add row if it has a player name
        if row_data.get('Player'):
            data.append(row_data)
    
    df = pd.DataFrame(data)
    
    print(f"✅ Extracted {len(df)} players from HTML")
    print(f"✅ Columns: {len(df.columns)}")
    
    return df


print("🔍 Loading Keepers HTML table...")
df = extract_keeper_data("keepers.html")

if df is None:
    exit()


# =============================================================================
# CLEAN DATA
# =============================================================================

# Clean Nation (e.g., "de GER" → "GER")
if "Nation" in df.columns:
    df["Nation"] = df["Nation"].astype(str).apply(
        lambda x: x.split()[-1] if x and x != "None" and x != "nan" else ""
    )

# Clean Minutes (remove commas)
if "Min" in df.columns:
    df["Min"] = df["Min"].str.replace(",", "").str.replace(" ", "")

# Convert numeric columns
numeric_cols = [
    "Age", "MP", "Starts", "Min", "90s",
    "GA", "GA90", "SoTA", "Saves",
    "Save%", "CS", "CS%", "PKatt",
    "PKA", "PKsv", "PKm", "PK_Save%", "W", "D", "L"
]

for col in numeric_cols:
    if col in df.columns:
        df[col] = pd.to_numeric(df[col], errors="coerce")

# Convert Born to integer
if "Born" in df.columns:
    df["Born"] = pd.to_numeric(df["Born"], errors="coerce").astype('Int64')

# Remove duplicates
df = df.drop_duplicates()


# =============================================================================
# VERIFY GA AND GA90
# =============================================================================

print("\n🔍 Verifying GA and GA90 columns:")
if "GA" in df.columns:
    non_null_ga = df["GA"].notna().sum()
    print(f"  GA: {non_null_ga}/{len(df)} non-null values")
    if non_null_ga > 0:
        print(f"  Sample GA values: {df['GA'].dropna().head(5).tolist()}")
    else:
        print(f"  ⚠️  All GA values are null - data not available in source!")
else:
    print("  ❌ GA column missing!")

if "GA90" in df.columns:
    non_null_ga90 = df["GA90"].notna().sum()
    print(f"  GA90: {non_null_ga90}/{len(df)} non-null values")
    if non_null_ga90 > 0:
        print(f"  Sample GA90 values: {df['GA90'].dropna().head(5).tolist()}")
    else:
        print(f"  ⚠️  All GA90 values are null - data not available in source!")
else:
    print("  ❌ GA90 column missing!")


# =============================================================================
# DATA AVAILABILITY REPORT
# =============================================================================

print("\n📊 Data Availability Summary:")
print("="*60)
for col in df.columns:
    non_null = df[col].notna().sum()
    pct = (non_null / len(df)) * 100
    status = "✅" if pct > 0 else "❌"
    print(f"{status} {col:20s}: {non_null:3d}/{len(df):3d} ({pct:5.1f}%)")


# =============================================================================
# SAVE OUTPUT
# =============================================================================

output_filename = "goalkeeping_stats.csv"
output_path = os.path.join(os.path.dirname(__file__), output_filename)

try:
    df.to_csv(output_path, index=False)
    print(f"\n✅ Saved: {output_filename}")
except PermissionError:
    print(f"\n⚠️ File locked. Could not save {output_filename}.")


print(f"\nTotal players: {len(df)}")
print(f"Total columns: {len(df.columns)}")
print("\nFinal columns:")
for i, col in enumerate(df.columns, 1):
    print(f"  {i}. {col}")

# Show first few rows for verification
print("\n📊 First 3 rows preview:")
print(df.head(3).to_string())

print("\n" + "="*60)
print("NOTE: If GA/GA90/SoTA/Saves/Save% are all null, this is expected")
print("for youth leagues where these advanced stats are not tracked.")
print("="*60)