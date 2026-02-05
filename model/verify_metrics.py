"""
Verification script for Evaluation Metrics Module
"""
import pandas as pd
import numpy as np
import os
import sys

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from evaluation_metrics import run_comprehensive_evaluation

def create_mock_data():
    """Create mock data for testing metrics."""
    np.random.seed(42)
    n = 200
    
    # Mock categories
    positions = ['FW', 'MF', 'DF', 'GK']
    clubs = ['Bayern', 'Dortmund', 'Leipzig', 'Leverkusen', 'Union', 'Freiburg']
    
    df = pd.DataFrame({
        'Player': [f'Player_{i}' for i in range(n)],
        'Position': np.random.choice(positions, n),
        'Age': np.random.randint(16, 21, n),
        'Club': np.random.choice(clubs, n),
        'Born_std': np.random.randint(2004, 2009, n),
        
        # Current Rating targets
        'true_current': np.random.uniform(40, 70, n),
        # Predicted current (with some noise)
        'pred_current': np.random.uniform(40, 70, n),
        
        # Next Season targets
        'true_next': np.random.uniform(45, 75, n),
        'pred_next': np.random.uniform(45, 75, n),
        
        # Peak Potential targets
        'true_peak': np.random.uniform(60, 95, n),
        'pred_peak': np.random.uniform(60, 95, n)
    })
    
    # Make predictions slightly related to true values
    df['pred_current'] = df['true_current'] + np.random.normal(0, 2, n)
    df['pred_next'] = df['true_next'] + np.random.normal(0, 3, n)
    df['pred_peak'] = df['true_peak'] + np.random.normal(0, 5, n)
    
    # Add birth month if we want to test exact feature
    df['BirthMonth'] = np.random.randint(1, 13, n)
    
    return df

def run_verification():
    print("🚀 Starting Evaluation Metrics Verification...")
    
    df = create_mock_data()
    
    targets_config = [
        {'true': 'true_current', 'pred': 'pred_current', 'name': 'Current Rating'},
        {'true': 'true_next', 'pred': 'pred_next', 'name': 'Next-Season Rating'},
        {'true': 'true_peak', 'pred': 'pred_peak', 'name': 'Peak Potential'}
    ]
    
    output_path = os.path.join('outputs', 'test_evaluation_report.csv')
    
    # Run evaluation
    run_comprehensive_evaluation(df, targets_config, output_path)
    
    if os.path.exists(output_path):
        print(f"\n✅ SUCCESS: Report generated at {output_path}")
    else:
        print(f"\n❌ FAILURE: Report NOT generated")

if __name__ == "__main__":
    run_verification()
