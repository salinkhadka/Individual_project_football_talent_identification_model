"""
Model Comparison Framework
==========================
This module provides a framework to compare different ML models for 
youth player potential prediction using the same feature engineering pipeline.
"""

import pandas as pd
import numpy as np
import os
import joblib
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from scipy.stats import spearmanr

# Models to compare
from xgboost import XGBRegressor
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import Ridge
from sklearn.svm import SVR

from config_new import (
    DATA_DIR, OUTPUT_DIR, 
    VAL_SPLIT, RANDOM_STATE,
    CORE_FEATURES, ENGINEERED_FEATURES
)
from train_new import load_and_process_teacher_data

class ModelComparer:
    """Framework to compare multiple models on the same dataset."""
    
    def __init__(self):
        self.df = None
        self.models = {}
        self.results = []
        self.feature_names = None
        self.scaler = StandardScaler()
        
        os.makedirs(OUTPUT_DIR, exist_ok=True)

    def prepare_data(self):
        """Load and engineer features exactly like train_new.py."""
        print("📊 Loading and preparing data for comparison...")
        self.df = load_and_process_teacher_data()
        
        df = self.df.copy()
        
        # Feature Engineering (Mirroring train_new.py)
        df['MinutesPerMatch'] = df.apply(lambda r: r['Minutes'] / r['Matches'] if r['Matches'] > 0 else 0, axis=1)
        df['GoalsPerMatch'] = df.apply(lambda r: r['Goals'] / r['Matches'] if r['Matches'] > 0 else 0, axis=1)
        df['StartPercentage'] = df.apply(lambda r: r['Starts'] / r['Matches'] if r['Matches'] > 0 else 0, axis=1)
        df['CompletionRate'] = (df['PassCompletionPct'] / 100.0) if 'PassCompletionPct' in df.columns else 0.75
        df['AttackingContribution'] = df['Goals'] + df.get('Assists', 0)
        df['DefensiveContribution'] = df.get('Tackles', 0) + df.get('Interceptions', 0)
        df['PhysicalityScore'] = 0 # Baseline simplification
        df['ConsistencyScore'] = df.apply(lambda r: (r['Minutes'] / (r['Matches'] * 90)) if r['Matches'] > 0 else 0, axis=1).clip(0, 1)
        df['AgeBonus'] = df['Age'].apply(lambda x: max(0, 25 - x) / 10)
        
        if 'CurrentAbility' in df.columns:
            pos_avg = df.groupby('Position')['CurrentAbility'].transform('mean')
            df['PositionAdjustedRating'] = df['CurrentAbility'] - pos_avg
        else:
            df['PositionAdjustedRating'] = 0

        # One-hot encoding for Position
        df = pd.get_dummies(df, columns=['Position'], prefix='Pos')
        
        # Identify features
        available_features = [f for f in CORE_FEATURES if f in df.columns and f != 'Position']
        available_features += [f for f in ENGINEERED_FEATURES if f in df.columns]
        position_cols = [col for col in df.columns if col.startswith('Pos_')]
        self.feature_names = available_features + position_cols
        
        X = df[self.feature_names].fillna(0).values
        y = df['PotentialAbility'].values
        
        self.X_train, self.X_val, self.y_train, self.y_val = train_test_split(
            X, y, test_size=VAL_SPLIT, random_state=RANDOM_STATE
        )
        
        self.X_train = self.scaler.fit_transform(self.X_train)
        self.X_val = self.scaler.transform(self.X_val)
        
        print(f"✅ Data ready: {len(self.X_train)} training samples, {len(self.X_val)} validation samples")
        print(f"✅ Features: {len(self.feature_names)}")

    def add_model(self, name, model):
        """Add a model to the comparison."""
        self.models[name] = model

    def run_comparison(self):
        """Train and evaluate all models."""
        print("\n🚀 Running Model Comparison...")
        
        for name, model in self.models.items():
            print(f"   Training {name}...")
            start_time = datetime.now()
            model.fit(self.X_train, self.y_train)
            duration = (datetime.now() - start_time).total_seconds()
            
            # Predict
            y_pred = model.predict(self.X_val)
            
            # Metrics
            mae = mean_absolute_error(self.y_val, y_pred)
            rmse = np.sqrt(mean_squared_error(self.y_val, y_pred))
            r2 = r2_score(self.y_val, y_pred)
            spearman, _ = spearmanr(self.y_val, y_pred)
            
            self.results.append({
                'Model': name,
                'MAE': round(mae, 3),
                'RMSE': round(rmse, 3),
                'R2': round(r2, 3),
                'Spearman': round(spearman, 3),
                'TrainTimeSec': round(duration, 2)
            })
            
        return pd.DataFrame(self.results).sort_values('R2', ascending=False)

    def save_report(self, results_df):
        """Save comparison report and summary."""
        report_path = os.path.join(OUTPUT_DIR, 'model_comparison_report.csv')
        results_df.to_csv(report_path, index=False)
        
        summary_path = os.path.join(OUTPUT_DIR, 'model_comparison_summary.txt')
        with open(summary_path, 'w') as f:
            f.write("=" * 60 + "\n")
            f.write("MODEL COMPARISON SUMMARY\n")
            f.write("=" * 60 + "\n")
            f.write(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write(results_df.to_string(index=False))
            f.write("\n\n" + "=" * 60 + "\n")
            
        print(f"\n💾 Report saved to: {report_path}")
        print(f"💾 Summary saved to: {summary_path}")
