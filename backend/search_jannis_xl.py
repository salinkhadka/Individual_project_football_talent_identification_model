import pandas as pd

def search_jannis_xl():
    path = r'..\model\outputs\bundesliga_comprehensive_analysis.xlsx'
    xl = pd.ExcelFile(path)
    for sheet in xl.sheet_names:
        df = pd.read_excel(path, sheet_name=sheet)
        if 'Player' in df.columns:
            matches = df[df['Player'].str.contains('Bärtl', na=False)]
            if not matches.empty:
                print(f"Found in sheet: {sheet}")
                print(f"Columns: {list(df.columns)}")
                # Print the row for Jannis
                print(f"Data: {matches.iloc[0].to_dict()}")

if __name__ == "__main__":
    search_jannis_xl()
