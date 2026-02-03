"""
Youth Player Potential Model
=============================

Multi-output regression model that predicts:
1. Next Season Rating (short-term)
2. Peak Potential (long-term)
"""

import os
import joblib
import numpy as np
import pandas as pd
from typing import Optional, Tuple, Dict, List
from sklearn.multioutput import MultiOutputRegressor
from xgboost import XGBRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from config import XGB_PARAMS, MODEL_DIR, MULTIOUTPUT_MODEL_PATH


class YouthPotentialModel:
    """
    Multi-output model for youth player potential prediction.
    """
    
    def __init__(self, model=None):
        """
        Initialize the model.
        
        Args:
            model: Pre-trained model (for loading). If None, creates new model.
        """
        if model is None:
            # Create new model for training
            base_model = XGBRegressor(**XGB_PARAMS)
            self.model = MultiOutputRegressor(base_model)
            self.is_fitted = False
        else:
            # Load existing trained model
            self.model = model
            self.is_fitted = True
        
        self.feature_names = None
    
    def prepare_data(self, df: pd.DataFrame, feature_cols: List[str], 
                    target_cols: Optional[List[str]] = None) -> Tuple:
        """
        Prepare data for training or prediction.
        
        Args:
            df: DataFrame with features
            feature_cols: List of feature column names
            target_cols: List of target column names (None for prediction)
        
        Returns:
            If target_cols provided: (X, y)
            If target_cols is None: X only
        """
        # Ensure all features exist, fill missing with 0
        X = df[feature_cols].fillna(0).copy()
        
        # Store feature names for later
        if self.feature_names is None:
            self.feature_names = feature_cols
        
        if target_cols is not None:
            y = df[target_cols].fillna(0).values
            return X.values, y
        else:
            return X.values
    
    def fit(self, X_train: np.ndarray, y_train: np.ndarray, 
            X_val: Optional[np.ndarray] = None, 
            y_val: Optional[np.ndarray] = None) -> Dict:
        """
        Train the model.
        
        Args:
            X_train: Training features
            y_train: Training targets [next_season, peak_potential]
            X_val: Validation features (optional)
            y_val: Validation targets (optional)
        
        Returns:
            Dictionary with training metrics
        """
        print("\n🎯 Training multi-output model...")
        print(f"   • Training samples: {len(X_train)}")
        print(f"   • Features: {X_train.shape[1]}")
        print(f"   • Targets: {y_train.shape[1]} (Next Season, Peak Potential)")
        
        # Train the model
        self.model.fit(X_train, y_train)
        self.is_fitted = True
        
        print("✓ Model training complete")
        
        # Evaluate
        metrics = {}
        
        # Training set metrics
        print("\n📊 Evaluating on training set...")
        metrics['train'] = self._evaluate(X_train, y_train, "Training")
        
        # Validation set metrics
        if X_val is not None and y_val is not None:
            print("\n📊 Evaluating on validation set...")
            metrics['val'] = self._evaluate(X_val, y_val, "Validation")
        
        return metrics
    
    def _evaluate(self, X: np.ndarray, y: np.ndarray, 
                 dataset_name: str) -> Dict:
        """
        Evaluate model performance.
        
        Args:
            X: Features
            y: True targets
            dataset_name: Name of dataset for logging
        
        Returns:
            Dictionary with metrics for each target
        """
        predictions = self.predict(X)
        
        metrics = {}
        target_names = ['next_season_rating', 'peak_potential']
        
        for i, target_name in enumerate(target_names):
            y_true = y[:, i]
            y_pred = predictions[:, i]
            
            mae = mean_absolute_error(y_true, y_pred)
            rmse = np.sqrt(mean_squared_error(y_true, y_pred))
            r2 = r2_score(y_true, y_pred)
            
            metrics[target_name] = {
                'MAE': mae,
                'RMSE': rmse,
                'R2': r2
            }
            
            print(f"\n   {target_name}:")
            print(f"      MAE:  {mae:.3f}")
            print(f"      RMSE: {rmse:.3f}")
            print(f"      R²:   {r2:.3f}")
        
        return metrics
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        Make predictions.
        
        Args:
            X: Features
        
        Returns:
            Predictions array [next_season, peak_potential]
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted before making predictions")
        
        return self.model.predict(X)
    
    def get_feature_importance(self, top_n: int = 20) -> pd.DataFrame:
        """
        Get feature importance scores.
        
        Args:
            top_n: Number of top features to return
        
        Returns:
            DataFrame with feature importance
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted before getting feature importance")
        
        # Get importance from each estimator
        importances = []
        for estimator in self.model.estimators_:
            importances.append(estimator.feature_importances_)
        
        # Average importance across outputs
        avg_importance = np.mean(importances, axis=0)
        
        # Create DataFrame
        importance_df = pd.DataFrame({
            'feature': self.feature_names,
            'importance': avg_importance,
            'next_season_importance': importances[0],
            'peak_potential_importance': importances[1]
        })
        
        # Sort and return top N
        importance_df = importance_df.sort_values('importance', ascending=False)
        return importance_df.head(top_n)
    
    def save(self, path: Optional[str] = None):
        """
        Save the trained model.
        
        Args:
            path: Save path (uses default if None)
        """
        if not self.is_fitted:
            raise ValueError("Cannot save unfitted model")
        
        if path is None:
            path = MULTIOUTPUT_MODEL_PATH
        
        # Create directory if needed
        os.makedirs(os.path.dirname(path), exist_ok=True)
        
        # Save model
        joblib.dump(self.model, path)
        print(f"\n💾 Model saved: {path}")


def load_model(model_path: Optional[str] = None) -> YouthPotentialModel:
    """
    Load a trained model from disk.
    
    Args:
        model_path: Path to model file (uses default if None)
    
    Returns:
        YouthPotentialModel instance with loaded model
    """
    if model_path is None:
        model_path = MULTIOUTPUT_MODEL_PATH
    
    if not os.path.exists(model_path):
        raise FileNotFoundError(
            f"Model not found at {model_path}. "
            "Please train the model first by running: python train.py"
        )
    
    # Load the sklearn model
    trained_model = joblib.load(model_path)
    
    # Wrap in our class
    wrapper = YouthPotentialModel(model=trained_model)
    
    print(f"✓ Model loaded from: {model_path}")
    
    return wrapper


# ============================================================================
# TESTING
# ============================================================================

if __name__ == "__main__":
    print("\n🧪 Testing Model Module...")
    
    # Test model creation
    print("\n1️⃣ Testing model creation...")
    model = YouthPotentialModel()
    print(f"   ✓ Model created: {type(model.model)}")
    
    # Test with dummy data
    print("\n2️⃣ Testing with dummy data...")
    n_samples = 100
    n_features = 42
    n_targets = 2
    
    X_train = np.random.randn(n_samples, n_features)
    y_train = np.random.randn(n_samples, n_targets) * 10 + 50  # Scale to ~40-60 range
    
    X_val = np.random.randn(20, n_features)
    y_val = np.random.randn(20, n_targets) * 10 + 50
    
    # Train
    print("\n3️⃣ Testing training...")
    metrics = model.fit(X_train, y_train, X_val, y_val)
    print(f"   ✓ Training complete")
    
    # Predict
    print("\n4️⃣ Testing prediction...")
    predictions = model.predict(X_val)
    print(f"   ✓ Predictions shape: {predictions.shape}")
    print(f"   ✓ Sample prediction: [{predictions[0, 0]:.2f}, {predictions[0, 1]:.2f}]")
    
    # Save/load
    print("\n5️⃣ Testing save/load...")
    test_path = os.path.join(MODEL_DIR, "test_model.pkl")
    os.makedirs(MODEL_DIR, exist_ok=True)
    
    model.save(test_path)
    loaded_model = load_model(test_path)
    
    # Verify loaded model works
    loaded_predictions = loaded_model.predict(X_val)
    assert np.allclose(predictions, loaded_predictions), "Loaded model predictions don't match!"
    print(f"   ✓ Save/load successful")
    
    # Cleanup
    if os.path.exists(test_path):
        os.remove(test_path)
    
    print("\n✅ All model tests passed!")