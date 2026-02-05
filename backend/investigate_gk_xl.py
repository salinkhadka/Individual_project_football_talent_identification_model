import pandas as pd
import json

def investigate():
    path = r'..\model\outputs\bundesliga_comprehensive_analysis.xlsx'
    xl = pd.ExcelFile(path)
    sheet = 'Top 25 GK'
    df = pd.read_excel(path, sheet_name=sheet)
    
    print(f"Columns in {sheet}:")
    for col in df.columns:
        print(f" - {col}")
        
    jannis = df[df['Player'].str.contains('Bärtl', na=False)]
    if not jannis.empty:
        print("\nData for Jannis Bärtl:")
        print(json.dumps(jannis.iloc[0].to_dict(), indent=2, default=str))

if __name__ == "__main__":
    investigate()
