"""
Direct xG/xA Calculator - FIXED VERSION
==========================================
Simplified calculator that doesn't break other stats.
Works for all positions including GK.
"""

import pandas as pd
import numpy as np
from typing import Dict

class DirectXGCalculator:
    """
    Direct xG/xA calculator that preserves existing stats.
    For GK, xG/xA are set to 0.
    """
    
    def calculate_xg_xa(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculate xG and xA directly from goals and assists.
        For GK: xG = 0, xA = 0
        """
        print("\n📊 Calculating xG/xA directly from goals/assists...")
        
        # Make a copy to avoid modifying original
        result_df = df.copy()
        
        # Initialize columns if they don't exist
        if 'xG' not in result_df.columns:
            result_df['xG'] = 0.0
        if 'xA' not in result_df.columns:
            result_df['xA'] = 0.0
        if 'xGPer90' not in result_df.columns:
            result_df['xGPer90'] = 0.0
        if 'xAPer90' not in result_df.columns:
            result_df['xAPer90'] = 0.0
        
        # Process each row
        for idx, row in result_df.iterrows():
            position = row.get('Position', 'FW')
            
            if position == 'GK':
                # GK: no xG/xA
                result_df.at[idx, 'xG'] = 0.0
                result_df.at[idx, 'xA'] = 0.0
                result_df.at[idx, 'xGPer90'] = 0.0
                result_df.at[idx, 'xAPer90'] = 0.0
            else:
                # For outfield players
                goals = row.get('Goals', 0)
                assists = row.get('Assists', 0)
                minutes = row.get('Minutes', 0)
                
                # Calculate xG as 85% of goals (conservative)
                xg = goals * 0.85
                
                # Calculate xA as 75% of assists (conservative)
                xa = assists * 0.75
                
                # Calculate per90
                nineties = minutes / 90.0 if minutes > 0 else 0
                xg_per_90 = xg / nineties if nineties > 0 else 0
                xa_per_90 = xa / nineties if nineties > 0 else 0
                
                result_df.at[idx, 'xG'] = round(xg, 2)
                result_df.at[idx, 'xA'] = round(xa, 2)
                result_df.at[idx, 'xGPer90'] = round(xg_per_90, 3)
                result_df.at[idx, 'xAPer90'] = round(xa_per_90, 3)
        
        print(f"✅ xG/xA calculated for {len(result_df)} players")
        print(f"   • Outfield players: {len(result_df[result_df['Position'] != 'GK'])}")
        print(f"   • Goalkeepers (xG/xA = 0): {len(result_df[result_df['Position'] == 'GK'])}")
        
        return result_df