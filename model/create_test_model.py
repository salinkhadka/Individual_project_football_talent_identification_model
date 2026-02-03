"""
Create a simple test ML model if the original is missing.
"""
import joblib
import numpy as np
from xgboost import XGBRegressor
import os

# Create a simple XGBoost model
model = XGBRegressor(
    n_estimators=100,
    max_depth=5,
    learning_rate=0.1,
    random_state=42
)

# Train on dummy data
X_train = np.random.randn(1000, 20)
y_train = 60 + 30 * np.random.rand(1000)  # 60-90 range
model.fit(X_train, y_train)

# Save it
os.makedirs('./saved_models', exist_ok=True)
joblib.dump(model, './saved_models/potential_predictor.pkl')
print("✓ Test ML model created")