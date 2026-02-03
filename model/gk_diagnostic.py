import pandas as pd

# Load one GK file
df = pd.read_csv('../data/goalkeeping_stats_2024-25.csv')

# Check first 10 rows of key columns
print("First 10 GKs - Key Stats:")
print(df[['Player', 'MP', 'Min', 'CS', 'CS%', 'GA', 'GA90', 'Save%', 'Saves']].head(10))

print("\n\nData types:")
print(df[['CS%', 'GA90', 'Save%']].dtypes)

print("\n\nUnique values in Save%:")
print(df['Save%'].value_counts())

print("\n\nUnique values in CS%:")
print(df['CS%'].value_counts().head(20))