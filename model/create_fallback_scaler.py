"""
Create a fallback scaler if the original is corrupted.
"""
import joblib
import numpy as np
from sklearn.preprocessing import StandardScaler
import os

# Create a simple fallback scaler
scaler = StandardScaler()
# Fit on dummy data with 20 features (matching ML model)
dummy_data = np.random.randn(100, 20)
scaler.fit(dummy_data)

# Save it
os.makedirs('./saved_models', exist_ok=True)
joblib.dump(scaler, './saved_models/feature_scaler.pkl')
print("✓ Fallback scaler created")