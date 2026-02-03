"""
Training Pipeline for Youth Player Potential Model
===================================================

This script orchestrates the entire training process:
1. Load multi-season data
2. Engineer features
3. Initialize model
4. Prepare train/val/test splits
5. Train multi-output model
6. Evaluate performance
7. Save results and model
"""

import pandas as pd
import numpy as np
import os
from datetime import datetime
import matplotlib.pyplot as plt
import seaborn as sns

from config import (
    TRAIN_SEASONS, VAL_SEASON, TEST_SEASON, OUTPUT_DIR,
    SAVE_PROCESSED_DATA, PROCESSED_DATA_FILENAME
)
from data_loader import load_data
from feature_engineering import engineer_features, FeatureEngineer
from model import YouthPotentialModel


class TrainingPipeline:
    """
    Complete training pipeline for the youth potential model.
    """
    
    def __init__(self):
        self.df = None
        self.df_engineered = None
        self.model = None
        self.metrics = {}
        self.feature_engineer = FeatureEngineer()
        
        # Create output directory
        os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    def run(self, skip_load: bool = False, df_preloaded: pd.DataFrame = None):
        """
        Run the complete training pipeline.
        
        Args:
            skip_load: If True, use df_preloaded instead of loading
            df_preloaded: Pre-loaded DataFrame (if skip_load=True)
        """
        print("\n" + "=" * 70)
        print("YOUTH PLAYER POTENTIAL MODEL - TRAINING PIPELINE")
        print("=" * 70)
        print(f"Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Step 1: Load data
        if skip_load and df_preloaded is not None:
            self.df = df_preloaded
            print("\n✓ Using pre-loaded data")
        else:
            print("\n" + "=" * 70)
            print("STEP 1: DATA LOADING")
            print("=" * 70)
            self.df = load_data(fill_missing=True)
        
        # Step 2: Feature engineering
        print("\n" + "=" * 70)
        print("STEP 2: FEATURE ENGINEERING")
        print("=" * 70)
        self.df_engineered = engineer_features(self.df)
        
        # Save processed data
        if SAVE_PROCESSED_DATA:
            output_path = os.path.join(OUTPUT_DIR, PROCESSED_DATA_FILENAME)
            self.df_engineered.to_csv(output_path, index=False)
            print(f"\n💾 Processed data saved: {output_path}")
        
        # Step 3: Initialize model first (needed for prepare_data)
        print("\n" + "=" * 70)
        print("STEP 3: INITIALIZING MODEL")
        print("=" * 70)
        self.model = YouthPotentialModel()
        print("✓ Model initialized")
        
        # Step 4: Prepare train/val/test splits
        print("\n" + "=" * 70)
        print("STEP 4: PREPARING DATA SPLITS")
        print("=" * 70)
        X_train, y_train, X_val, y_val, X_test, y_test = self._prepare_splits()
        
        # Step 5: Train model
        print("\n" + "=" * 70)
        print("STEP 5: MODEL TRAINING")
        print("=" * 70)
        self.metrics = self.model.fit(X_train, y_train, X_val, y_val)
        
        # Step 6: Final evaluation on test set (if available)
        if X_test is not None and len(X_test) > 0:
            print("\n" + "=" * 70)
            print("STEP 6: FINAL TEST SET EVALUATION")
            print("=" * 70)
            test_metrics = self.model._evaluate(X_test, y_test, "Test")
            self.metrics['test'] = test_metrics
        
        # Step 7: Analyze results
        print("\n" + "=" * 70)
        print("STEP 7: RESULTS ANALYSIS")
        print("=" * 70)
        self._analyze_results()
        
        # Step 8: Save model
        print("\n" + "=" * 70)
        print("STEP 8: SAVING MODEL")
        print("=" * 70)
        self.model.save()
        
        print("\n" + "=" * 70)
        print("TRAINING COMPLETE!")
        print("=" * 70)
        print(f"Finished: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        return self.model, self.metrics
    
    def _prepare_splits(self):
        """
        Split data by season into train/val/test.
        
        Returns:
            Tuple of (X_train, y_train, X_val, y_val, X_test, y_test)
        """
        feature_cols = self.feature_engineer.get_feature_columns()
        target_cols = self.feature_engineer.get_target_columns()
        
        # Training set
        train_mask = self.df_engineered['Season'].isin(TRAIN_SEASONS)
        train_df = self.df_engineered[train_mask]
        X_train, y_train = self.model.prepare_data(train_df, feature_cols, target_cols)
        
        print(f"✓ Training set: {len(train_df)} samples from {TRAIN_SEASONS}")
        
        # Validation set
        val_mask = self.df_engineered['Season'] == VAL_SEASON
        val_df = self.df_engineered[val_mask]
        X_val, y_val = self.model.prepare_data(val_df, feature_cols, target_cols)
        
        print(f"✓ Validation set: {len(val_df)} samples from {VAL_SEASON}")
        
        # Test set (if available)
        if TEST_SEASON in self.df_engineered['Season'].unique():
            test_mask = self.df_engineered['Season'] == TEST_SEASON
            test_df = self.df_engineered[test_mask]
            X_test, y_test = self.model.prepare_data(test_df, feature_cols, target_cols)
            print(f"✓ Test set: {len(test_df)} samples from {TEST_SEASON}")
        else:
            X_test, y_test = None, None
            print(f"⚠️  Test set ({TEST_SEASON}) not available")
        
        return X_train, y_train, X_val, y_val, X_test, y_test
    
    def _analyze_results(self):
        """
        Analyze and visualize training results.
        """
        # 1. Feature Importance
        print("\n📊 Top 15 Most Important Features:")
        importance_df = self.model.get_feature_importance(top_n=15)
        print(importance_df[['feature', 'importance', 'next_season_importance', 
                            'peak_potential_importance']].to_string(index=False))
        
        # Save importance
        importance_path = os.path.join(OUTPUT_DIR, 'feature_importance.csv')
        importance_df.to_csv(importance_path, index=False)
        print(f"\n💾 Feature importance saved: {importance_path}")
        
        # 2. Prediction Analysis on Validation Set
        print("\n🔍 Prediction Analysis (Validation Set):")
        
        val_mask = self.df_engineered['Season'] == VAL_SEASON
        val_df = self.df_engineered[val_mask].copy()
        
        feature_cols = self.feature_engineer.get_feature_columns()
        X_val = self.model.prepare_data(val_df, feature_cols)
        
        predictions = self.model.predict(X_val)
        val_df['predicted_next_season'] = predictions[:, 0]
        val_df['predicted_peak_potential'] = predictions[:, 1]
        
        # Key insight: For youth players, potential should exceed current rating
        young_players = val_df[val_df['Age_std'] < 23]
        if len(young_players) > 0:
            potential_higher = (young_players['predicted_peak_potential'] > 
                              young_players['current_rating']).mean()
            print(f"   • Youth players with Potential > Current: {potential_higher*100:.1f}%")
        
        # Save predictions
        pred_cols = ['Player', 'Season', 'Age_std', 'Pos_std', 
                    'current_rating', 'predicted_next_season', 'predicted_peak_potential',
                    'next_season_rating', 'peak_potential']
        
        predictions_path = os.path.join(OUTPUT_DIR, 'validation_predictions.csv')
        val_df[pred_cols].to_csv(predictions_path, index=False)
        print(f"\n💾 Validation predictions saved: {predictions_path}")
        
        # 3. Summary Statistics
        print("\n📈 Model Performance Summary:")
        for dataset_type in ['train', 'val', 'test']:
            if dataset_type in self.metrics and self.metrics[dataset_type]:
                print(f"\n   {dataset_type.upper()} SET:")
                for target, metrics in self.metrics[dataset_type].items():
                    print(f"      {target}:")
                    print(f"         MAE:  {metrics['MAE']:.3f}")
                    print(f"         RMSE: {metrics['RMSE']:.3f}")
                    print(f"         R²:   {metrics['R2']:.3f}")
        
        # Save metrics
        metrics_path = os.path.join(OUTPUT_DIR, 'training_metrics.txt')
        with open(metrics_path, 'w') as f:
            f.write("=" * 70 + "\n")
            f.write("YOUTH PLAYER POTENTIAL MODEL - TRAINING METRICS\n")
            f.write("=" * 70 + "\n\n")
            f.write(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            for dataset_type in ['train', 'val', 'test']:
                if dataset_type in self.metrics and self.metrics[dataset_type]:
                    f.write(f"\n{dataset_type.upper()} SET:\n")
                    f.write("-" * 50 + "\n")
                    for target, metrics in self.metrics[dataset_type].items():
                        f.write(f"\n{target}:\n")
                        f.write(f"  MAE:  {metrics['MAE']:.3f}\n")
                        f.write(f"  RMSE: {metrics['RMSE']:.3f}\n")
                        f.write(f"  R²:   {metrics['R2']:.3f}\n")
        
        print(f"\n💾 Metrics saved: {metrics_path}")
    
    def get_model(self):
        """Get the trained model."""
        return self.model
    
    def get_processed_data(self):
        """Get the processed DataFrame with all features."""
        return self.df_engineered


# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    """
    Main training function.
    """
    pipeline = TrainingPipeline()
    model, metrics = pipeline.run()
    
    print("\n" + "=" * 70)
    print("NEXT STEPS")
    print("=" * 70)
    print("\n1. Check output files in:", OUTPUT_DIR)
    print("   • processed_players_multiseason.csv - Full dataset with features")
    print("   • feature_importance.csv - Most important features")
    print("   • validation_predictions.csv - Model predictions")
    print("   • training_metrics.txt - Performance metrics")
    print("\n2. Use the trained model:")
    print("   • Model saved in: saved_models/")
    print("   • Load with: from model import load_model")
    print("\n3. Find top prospects:")
    print("   • Run: python predict.py")
    print("   • This will rank all players by potential")
    
    return model, metrics


if __name__ == "__main__":
    try:
        model, metrics = main()
        print("\n✅ Training pipeline completed successfully!")
        
    except Exception as e:
        print(f"\n❌ Training failed: {str(e)}")
        import traceback
        traceback.print_exc()