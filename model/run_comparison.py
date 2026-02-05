"""
Run Model Comparison
====================
Executable script to compare multiple models for youth potential prediction.
"""

from comparison_framework import ModelComparer
from xgboost import XGBRegressor
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.svm import SVR
from config_new import XGB_PARAMS

def main():
    comparer = ModelComparer()
    comparer.prepare_data()
    
    # Define models
    comparer.add_model("XGBoost (Current Params)", XGBRegressor(**XGB_PARAMS))
    comparer.add_model("Random Forest (100 trees)", RandomForestRegressor(n_estimators=100, random_state=42))
    comparer.add_model("Gradient Boosting", GradientBoostingRegressor(n_estimators=100, random_state=42))
    comparer.add_model("Ridge Regression", Ridge(alpha=1.0))
    comparer.add_model("SVR (RBF Kernel)", SVR(C=1.0, epsilon=0.1))
    
    # Run comparison
    results_df = comparer.run_comparison()
    
    # Display results
    print("\n📊 Final Comparison Results:")
    print(results_df.to_string(index=False))
    
    # Save report
    comparer.save_report(results_df)

if __name__ == "__main__":
    main()
