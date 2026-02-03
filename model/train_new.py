"""
Train Youth Potential Model - OBJECTIVE SYSTEM
===============================================
Note: ML model used for feature extraction, not direct prediction.
Final potential calculated using objective formula in performance_calculator.py
"""

import pandas as pd
import numpy as np
import os
import joblib
from datetime import datetime
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor

from config_new import (
    DATA_DIR, MODEL_DIR, OUTPUT_DIR,
    XGB_PARAMS, VAL_SPLIT, RANDOM_STATE,
    MODEL_FILENAME, SCALER_FILENAME,
    CORE_FEATURES, ENGINEERED_FEATURES, CATEGORICAL_FEATURES
)


def load_and_process_teacher_data(save_processed=False):
    """
    Load teacher's dataset.
    
    This function should load your teacher_data.csv and process it.
    Modify the file path and column mappings as needed.
    """
    from config_new import TEACHER_DATA_FILE, TEACHER_COLUMNS
    
    teacher_path = os.path.join(DATA_DIR, TEACHER_DATA_FILE)
    
    if not os.path.exists(teacher_path):
        raise FileNotFoundError(
            f"Teacher data not found at {teacher_path}\n"
            f"Please ensure {TEACHER_DATA_FILE} is in the {DATA_DIR} directory."
        )
    
    # Load data
    df = pd.read_csv(teacher_path)
    
    # Rename columns to standard format
    df = df.rename(columns=TEACHER_COLUMNS)
    
    # Basic cleaning
    numeric_cols = df.select_dtypes(include=[np.number]).columns
    for col in numeric_cols:
        df[col] = df[col].fillna(0)
    
    if save_processed:
        processed_path = os.path.join(OUTPUT_DIR, 'processed_teacher_data.csv')
        df.to_csv(processed_path, index=False)
        print(f"✓ Processed teacher data saved: {processed_path}")
    
    return df


class PotentialModelTrainer:
    """Train model for feature extraction (not direct prediction)."""
    
    def __init__(self):
        self.df = None
        self.model = None
        self.scaler = None
        self.feature_names = None
        self.metrics = {}
        
        # Create directories
        os.makedirs(MODEL_DIR, exist_ok=True)
        os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    def load_data(self):
        """Load and prepare teacher's data."""
        print("\n" + "=" * 70)
        print("LOADING TRAINING DATA")
        print("=" * 70)
        
        self.df = load_and_process_teacher_data(save_processed=True)
        
        print(f"\n✓ Training data loaded: {len(self.df)} players")
    
    def engineer_features(self):
        """Create engineered features."""
        print("\n" + "=" * 70)
        print("FEATURE ENGINEERING")
        print("=" * 70)
        
        df = self.df.copy()
        
        # 1. Minutes per match
        if 'MinutesPerMatch' not in df.columns:
            df['MinutesPerMatch'] = df.apply(
                lambda row: row['Minutes'] / row['Matches'] if row['Matches'] > 0 else 0,
                axis=1
            )
        
        # 2. Goals per match
        if 'GoalsPerMatch' not in df.columns:
            df['GoalsPerMatch'] = df.apply(
                lambda row: row['Goals'] / row['Matches'] if row['Matches'] > 0 else 0,
                axis=1
            )
        
        # 3. Start percentage
        if 'StartPercentage' not in df.columns:
            df['StartPercentage'] = df.apply(
                lambda row: row['Starts'] / row['Matches'] if row['Matches'] > 0 else 0,
                axis=1
            )
        
        # 4. Completion rate (if available)
        if 'PassCompletionPct' in df.columns:
            df['CompletionRate'] = df['PassCompletionPct'] / 100.0
        else:
            df['CompletionRate'] = 0.75  # Default
        
        # 5. Attacking contribution
        df['AttackingContribution'] = df['Goals'] + df.get('Assists', 0)
        
        # 6. Defensive contribution (if available)
        if 'Tackles' in df.columns and 'Interceptions' in df.columns:
            df['DefensiveContribution'] = df['Tackles'] + df['Interceptions']
        else:
            df['DefensiveContribution'] = 0
        
        # 7. Physicality score (if available)
        if 'Height' in df.columns and 'Weight' in df.columns:
            # Normalize height and weight
            df['PhysicalityScore'] = (
                (df['Height'] - df['Height'].mean()) / df['Height'].std() +
                (df['Weight'] - df['Weight'].mean()) / df['Weight'].std()
            ) / 2
        else:
            df['PhysicalityScore'] = 0
        
        # 8. Consistency score (based on minutes played)
        df['ConsistencyScore'] = df.apply(
            lambda row: (row['Minutes'] / (row['Matches'] * 90)) if row['Matches'] > 0 else 0,
            axis=1
        ).clip(0, 1)
        
        # 9. Age bonus (younger = more potential)
        df['AgeBonus'] = df['Age'].apply(lambda x: max(0, 25 - x) / 10)
        
        # 10. Position-adjusted rating
        # Use current ability as base, adjust by position averages
        if 'CurrentAbility' in df.columns:
            pos_avg = df.groupby('Position')['CurrentAbility'].transform('mean')
            df['PositionAdjustedRating'] = df['CurrentAbility'] - pos_avg
        else:
            df['PositionAdjustedRating'] = 0
        
        self.df = df
        
        print("\n✓ Feature engineering complete")
        print(f"   • Total features created: {len(ENGINEERED_FEATURES)}")
    
    def prepare_training_data(self):
        """Prepare features and targets for training."""
        print("\n" + "=" * 70)
        print("PREPARING TRAINING DATA")
        print("=" * 70)
        
        df = self.df.copy()
        
        # Select features that exist in the data
        available_features = []
        
        # Core features
        for feat in CORE_FEATURES:
            if feat in df.columns:
                available_features.append(feat)
        
        # Engineered features
        for feat in ENGINEERED_FEATURES:
            if feat in df.columns:
                available_features.append(feat)
        
        print(f"\n📊 Available features: {len(available_features)}")
        
        # Handle categorical features (one-hot encoding)
        if 'Position' in available_features:
            df = pd.get_dummies(df, columns=['Position'], prefix='Pos')
            
            # Remove original Position, add encoded columns
            available_features.remove('Position')
            position_cols = [col for col in df.columns if col.startswith('Pos_')]
            available_features.extend(position_cols)
        
        self.feature_names = available_features
        
        # Prepare X and y
        X = df[available_features].fillna(0).values
        
        # Target: PotentialAbility from teacher's data
        if 'PotentialAbility' not in df.columns:
            raise ValueError("Teacher data must have 'PotentialAbility' column")
        
        y = df['PotentialAbility'].values
        
        print(f"   • Features: {X.shape[1]}")
        print(f"   • Samples: {X.shape[0]}")
        print(f"   • Target range: {y.min():.1f} - {y.max():.1f}")
        
        # Train/validation split
        X_train, X_val, y_train, y_val = train_test_split(
            X, y, test_size=VAL_SPLIT, random_state=RANDOM_STATE, shuffle=True
        )
        
        print(f"\n✓ Data split:")
        print(f"   • Training: {len(X_train)} samples")
        print(f"   • Validation: {len(X_val)} samples")
        
        # Scale features
        print("\n🔧 Scaling features...")
        self.scaler = StandardScaler()
        X_train = self.scaler.fit_transform(X_train)
        X_val = self.scaler.transform(X_val)
        
        print("✓ Features scaled")
        
        return X_train, X_val, y_train, y_val
    
    def train_model(self, X_train, y_train, X_val, y_val):
        """Train XGBoost model."""
        print("\n" + "=" * 70)
        print("MODEL TRAINING")
        print("=" * 70)
        
        print(f"\n🎯 Training XGBoost Regressor...")
        print(f"   • Estimators: {XGB_PARAMS['n_estimators']}")
        print(f"   • Learning rate: {XGB_PARAMS['learning_rate']}")
        print(f"   • Max depth: {XGB_PARAMS['max_depth']}")
        
        print("\n⚠️  NOTE: This model is used for feature extraction.")
        print("   Final potential is calculated using objective formula.")
        
        self.model = XGBRegressor(**XGB_PARAMS)
        
        # Train
        self.model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            verbose=False
        )
        
        print("\n✓ Training complete!")
        
        # Evaluate
        print("\n" + "=" * 70)
        print("MODEL EVALUATION")
        print("=" * 70)
        
        self.metrics['train'] = self._evaluate(X_train, y_train, "Training")
        self.metrics['val'] = self._evaluate(X_val, y_val, "Validation")
    
    def _evaluate(self, X, y, dataset_name):
        """Evaluate model performance."""
        predictions = self.model.predict(X)
        
        mae = mean_absolute_error(y, predictions)
        rmse = np.sqrt(mean_squared_error(y, predictions))
        r2 = r2_score(y, predictions)
        
        metrics = {'MAE': mae, 'RMSE': rmse, 'R2': r2}
        
        print(f"\n{dataset_name} Set:")
        print(f"   MAE:  {mae:.3f}")
        print(f"   RMSE: {rmse:.3f}")
        print(f"   R²:   {r2:.3f}")
        
        return metrics
    
    def analyze_feature_importance(self):
        """Analyze and display feature importance."""
        print("\n" + "=" * 70)
        print("FEATURE IMPORTANCE")
        print("=" * 70)
        
        importance = self.model.feature_importances_
        
        importance_df = pd.DataFrame({
            'Feature': self.feature_names,
            'Importance': importance
        }).sort_values('Importance', ascending=False)
        
        print("\n📊 Top 15 Most Important Features:")
        print(importance_df.head(15).to_string(index=False))
        
        # Save to CSV
        importance_path = os.path.join(OUTPUT_DIR, 'feature_importance.csv')
        importance_df.to_csv(importance_path, index=False)
        print(f"\n💾 Feature importance saved: {importance_path}")
        
        return importance_df
    
    def save_model(self):
        """Save trained model and scaler."""
        print("\n" + "=" * 70)
        print("SAVING MODEL")
        print("=" * 70)
        
        # Save model
        model_path = os.path.join(MODEL_DIR, MODEL_FILENAME)
        joblib.dump(self.model, model_path)
        print(f"💾 Model saved: {model_path}")
        
        # Save scaler
        scaler_path = os.path.join(MODEL_DIR, SCALER_FILENAME)
        joblib.dump(self.scaler, scaler_path)
        print(f"💾 Scaler saved: {scaler_path}")
        
        # Save feature names
        features_path = os.path.join(MODEL_DIR, 'feature_names.txt')
        with open(features_path, 'w') as f:
            for feat in self.feature_names:
                f.write(f"{feat}\n")
        print(f"💾 Feature names saved: {features_path}")
        
        # Save training summary
        summary_path = os.path.join(OUTPUT_DIR, 'training_summary.txt')
        with open(summary_path, 'w') as f:
            f.write("=" * 70 + "\n")
            f.write("YOUTH POTENTIAL MODEL - TRAINING SUMMARY\n")
            f.write("=" * 70 + "\n\n")
            f.write(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write("NOTE: This model is used for feature extraction.\n")
            f.write("Final potential calculated using objective formula.\n\n")
            f.write(f"Training samples: {len(self.df)}\n")
            f.write(f"Features: {len(self.feature_names)}\n\n")
            
            f.write("PERFORMANCE METRICS\n")
            f.write("-" * 70 + "\n\n")
            
            for dataset, metrics in self.metrics.items():
                f.write(f"{dataset.upper()} SET:\n")
                f.write(f"  MAE:  {metrics['MAE']:.3f}\n")
                f.write(f"  RMSE: {metrics['RMSE']:.3f}\n")
                f.write(f"  R²:   {metrics['R2']:.3f}\n\n")
        
        print(f"💾 Training summary saved: {summary_path}")
    
    def run_full_pipeline(self):
        """Run complete training pipeline."""
        print("\n" + "=" * 80)
        print("YOUTH POTENTIAL MODEL - TRAINING PIPELINE")
        print("=" * 80)
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        print("\n📌 TRAINING NOTE:")
        print("   This model learns patterns from teacher's data but")
        print("   final predictions use objective performance formula.")
        
        # Step 1: Load data
        self.load_data()
        
        # Step 2: Engineer features
        self.engineer_features()
        
        # Step 3: Prepare training data
        X_train, X_val, y_train, y_val = self.prepare_training_data()
        
        # Step 4: Train model
        self.train_model(X_train, y_train, X_val, y_val)
        
        # Step 5: Analyze feature importance
        self.analyze_feature_importance()
        
        # Step 6: Save model
        self.save_model()
        
        print("\n" + "=" * 70)
        print("TRAINING COMPLETE!")
        print("=" * 70)
        print(f"Finished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        print("\n📁 Output files:")
        print(f"   • Model: {MODEL_DIR}/{MODEL_FILENAME}")
        print(f"   • Scaler: {MODEL_DIR}/{SCALER_FILENAME}")
        print(f"   • Feature importance: {OUTPUT_DIR}/feature_importance.csv")
        print(f"   • Training summary: {OUTPUT_DIR}/training_summary.txt")
        
        print("\n🎯 Next step: Run 'python predict_scraped.py' to predict on Bundesliga data!")


def main():
    """Main training function."""
    trainer = PotentialModelTrainer()
    trainer.run_full_pipeline()
    return trainer


if __name__ == "__main__":
    try:
        trainer = main()
        print("\n✅ Training pipeline completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Training failed: {str(e)}")
        import traceback
        traceback.print_exc()