import pandas as pd

def inspect_excel():
    path = r'..\model\outputs\bundesliga_comprehensive_analysis.xlsx'
    try:
        xl = pd.ExcelFile(path)
        print(f"Sheets: {xl.sheet_names}")
        for sheet in xl.sheet_names:
            df = pd.read_excel(path, sheet_name=sheet, nrows=0)
            print(f"\nSheet: {sheet}")
            print(f"Columns: {list(df.columns)}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_excel()
