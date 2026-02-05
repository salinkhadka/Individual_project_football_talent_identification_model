import pandas as pd

def list_all():
    path = r'..\model\outputs\bundesliga_comprehensive_analysis.xlsx'
    xl = pd.ExcelFile(path)
    print(f"Sheets: {xl.sheet_names}")
    for sheet in xl.sheet_names:
        df = pd.read_excel(path, sheet_name=sheet, nrows=0)
        if any(col in df.columns for col in ['SavePercentage', 'Save%', 'Performance_Save%']):
            print(f"Sheet '{sheet}' has GK columns!")

if __name__ == "__main__":
    list_all()
