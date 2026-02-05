import pandas as pd
import json

def get_row():
    path = r'..\model\outputs\bundesliga_comprehensive_analysis.xlsx'
    df = pd.read_excel(path, sheet_name='All Seasons Data')
    print(f"Columns: {list(df.columns)}")

if __name__ == "__main__":
    get_row()
