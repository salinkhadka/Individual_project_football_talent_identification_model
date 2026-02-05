"""
Evaluation Metrics Module for Youth Player Potential Prediction - ACADEMIC VERSION
================================================================================
Provides functions for:
1. Regression metrics (MAE, RMSE, R2, Bias/MRE)
2. Ranking consistency (Spearman correlation)
3. Confidence calibration (error bounds ±1, ±2, ±3)
4. Fairness evaluation with bias and calibration per group
5. Fairness gap analysis (Best vs Worst group MAE)
"""

import pandas as pd
import numpy as np
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from scipy.stats import spearmanr
import os

def evaluate_regression_metrics(y_true, y_pred, target_name):
    """Calculate standard regression metrics including Mean Residual Error (Bias)."""
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)
    bias = np.mean(y_pred - y_true) # Mean Residual Error
    
    return {
        'Target': target_name,
        'MAE': round(mae, 3),
        'RMSE': round(rmse, 3),
        'R2': round(r2, 3),
        'Bias': round(bias, 3)
    }

def calculate_ranking_consistency(y_true, y_pred, target_name):
    """Calculate Spearman Rank Correlation for ranking quality."""
    corr, _ = spearmanr(y_true, y_pred)
    return {
        'Target': target_name,
        'Spearman_Rank_Corr': round(corr, 3)
    }

def evaluate_calibration(y_true, y_pred, target_name, thresholds=[1, 2, 3]):
    """Evaluate proportion of predictions within error bounds."""
    residuals = np.abs(y_true - y_pred)
    results = {'Target': target_name}
    
    for t in thresholds:
        within_bounds = (residuals <= t).mean()
        results[f'Within_±{t}_pts'] = round(within_bounds, 3)
        
    return results

def evaluate_fairness_metrics(df, y_true_col, y_pred_col, group_col):
    """Evaluate fairness by comparing metrics across groups."""
    if group_col not in df.columns:
        return []
        
    groups = df[group_col].unique()
    fairness_results = []
    
    for group in groups:
        group_df = df[df[group_col] == group]
        if len(group_df) < 2:
            continue
            
        y_true = group_df[y_true_col]
        y_pred = group_df[y_pred_col]
        
        mae = mean_absolute_error(y_true, y_pred)
        rmse = np.sqrt(mean_squared_error(y_true, y_pred))
        bias = np.mean(y_pred - y_true)
        within_2 = (np.abs(y_true - y_pred) <= 2).mean()
        
        fairness_results.append({
            'Group_Col': group_col,
            'Group': group,
            'Count': len(group_df),
            'Mean_Predicted': round(y_pred.mean(), 3),
            'MAE': round(mae, 3),
            'RMSE': round(rmse, 3),
            'Mean_Residual_Error': round(bias, 3),
            'Within_±2_pts': round(within_2, 3)
        })
        
    return fairness_results

def calculate_fairness_summary(fair_df):
    """Calculate summary of fairness gaps."""
    if fair_df.empty:
        return pd.DataFrame()
        
    summary = []
    for (target, group_col), group_data in fair_df.groupby(['Target', 'Group_Col']):
        best_mae = group_data['MAE'].min()
        worst_mae = group_data['MAE'].max()
        mae_gap = worst_mae - best_mae
        
        summary.append({
            'Target': target,
            'Feature': group_col,
            'Best_Group_MAE': best_mae,
            'Worst_Group_MAE': worst_mae,
            'MAE_Gap': round(mae_gap, 3)
        })
        
    return pd.DataFrame(summary)

def derive_club_size_tier(df, squad_col='Club'):
    """Categorize clubs by size based on appearance frequency."""
    if squad_col not in df.columns:
        return df
    counts = df[squad_col].value_counts()
    q33 = counts.quantile(0.33)
    q66 = counts.quantile(0.66)
    
    def get_tier(club):
        c = counts.get(club, 0)
        if c >= q66: return 'Large'
        if c >= q33: return 'Medium'
        return 'Small'
        
    df['Club_Size_Tier'] = df[squad_col].apply(get_tier)
    return df

def run_comprehensive_evaluation(df, targets_config, base_path='outputs/'):
    """Run full evaluation suite and save multiple reports."""
    all_reg = []
    all_fair = []
    
    # Pre-process cohorts
    if 'Age' in df.columns:
        df['Age_Group'] = pd.cut(df['Age'], bins=[0, 17, 19, 21, 100], labels=['U17', 'U19', 'U21', 'Senior'])
    df = derive_club_size_tier(df)
    
    fair_groups = ['Position', 'Age_Group', 'Club_Size_Tier']
    fair_groups = [g for g in fair_groups if g in df.columns]

    for target in targets_config:
        y_true = df[target['true']]
        y_pred = df[target['pred']]
        name = target['name']
        
        # Regression + Ranking + Calibration
        metrics = evaluate_regression_metrics(y_true, y_pred, name)
        metrics.update(calculate_ranking_consistency(y_true, y_pred, name))
        metrics.update(evaluate_calibration(y_true, y_pred, name))
        all_reg.append(metrics)
        
        # Fairness
        for group in fair_groups:
            res = evaluate_fairness_metrics(df, target['true'], target['pred'], group)
            for r in res:
                r['Target'] = name
                all_fair.append(r)
                    
    reg_df = pd.DataFrame(all_reg)
    fair_df = pd.DataFrame(all_fair)
    gap_df = calculate_fairness_summary(fair_df)
    
    # Save reports
    os.makedirs(base_path, exist_ok=True)
    reg_df.to_csv(os.path.join(base_path, 'regression_metrics_report.csv'), index=False)
    fair_df.to_csv(os.path.join(base_path, 'fairness_metrics_report.csv'), index=False)
    gap_df.to_csv(os.path.join(base_path, 'fairness_gap_report.csv'), index=False)
    
    # Consolidation for main report
    output_csv = os.path.join(base_path, 'evaluation_metrics_report.csv')
    with open(output_csv, 'w') as f:
        f.write("# REGRESSION & RANKING SUMMARY\n")
        reg_df.to_csv(f, index=False)
        f.write("\n# FAIRNESS GAPS (BEST VS WORST MAE)\n")
        gap_df.to_csv(f, index=False)
        f.write("\n# RAW FAIRNESS DATA\n")
        fair_df.to_csv(f, index=False)

    return reg_df, fair_df, gap_df

def print_evaluation_summary(title, reg_df, fair_df, gap_df):
    """Print clean formatted summary to console."""
    print(f"\n{'='*40}")
    print(f" {title}")
    print(f"{'='*40}")
    
    print("\n--- Regression & Ranking ---")
    print(reg_df.to_string(index=False))
    
    if not gap_df.empty:
        print("\n--- Fairness Gap Analysis ---")
        print(gap_df.to_string(index=False))

    # Pass/Warning logic (Academic standard)
    spearman = reg_df['Spearman_Rank_Corr'].mean()
    r2 = reg_df['R2'].mean()
    
    print("\n" + "-"*40)
    if r2 > 0.70 and spearman > 0.50:
        print("✅ STATUS: PASS (A-grade reliability)")
    elif r2 > 0.40:
        print("⚠️ STATUS: WARNING (Moderate reliability)")
    else:
        print("❌ STATUS: CRITICAL (Low reliability)")
    print("-"*40)
