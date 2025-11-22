"""
Talent Identification System - Flask Backend API
Serves predictions and top player rankings
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend access

# ==================== LOAD MODEL & DATA ====================
MODEL_PATH = "model/talent_model.pkl"
SCALER_PATH = "model/scaler.pkl"
TOP_PLAYERS_PATH = "model/top_players.csv"

print("\n" + "="*60)
print("TALENT IDENTIFICATION SYSTEM - BACKEND API")
print("="*60)

# Load model
try:
    model = joblib.load(MODEL_PATH)
    model_info = joblib.load(SCALER_PATH)
    feature_cols = model_info['feature_cols']
    scaler = model_info['scaler']
    print(f"✓ Model loaded from {MODEL_PATH}")
    print(f"✓ Features: {feature_cols}")
    MODEL_LOADED = True
except Exception as e:
    print(f"⚠ Could not load model: {e}")
    MODEL_LOADED = False

# Load top players
try:
    top_players_df = pd.read_csv(TOP_PLAYERS_PATH)
    print(f"✓ Loaded {len(top_players_df)} top players from {TOP_PLAYERS_PATH}")
    TOP_PLAYERS_LOADED = True
except Exception as e:
    print(f"⚠ Could not load top players: {e}")
    TOP_PLAYERS_LOADED = False

print("="*60 + "\n")

# ==================== API ENDPOINTS ====================

@app.route('/')
def home():
    """API info endpoint"""
    return jsonify({
        "service": "Talent Identification System API",
        "version": "1.0",
        "endpoints": {
            "/top_players": "GET - Retrieve top N players (default 50)",
            "/predict": "POST - Predict potential for a single player",
            "/feature_importance": "GET - Get model feature importances",
            "/stats": "GET - Get system statistics"
        },
        "model_loaded": MODEL_LOADED,
        "top_players_loaded": TOP_PLAYERS_LOADED
    })

@app.route('/top_players', methods=['GET'])
def get_top_players():
    """
    Get top N players ranked by potential
    Query params: n (default 50)
    
    Example curl:
    curl http://127.0.0.1:5000/top_players?n=20
    """
    if not TOP_PLAYERS_LOADED:
        return jsonify({"error": "Top players data not loaded"}), 500
    
    n = request.args.get('n', default=50, type=int)
    n = min(n, len(top_players_df))  # Cap at available players
    
    # Get top N and add rank
    result = top_players_df.head(n).copy()
    # result.insert(0, 'Rank', range(1, len(result) + 1))
    
    # Convert to JSON-friendly format
    players_list = result.to_dict(orient='records')
    
    return jsonify({
        "count": len(players_list),
        "players": players_list
    })

@app.route('/predict', methods=['POST'])
def predict_potential():
    """
    Predict potential for a single player
    Expects JSON body with player statistics
    
    Example curl:
    curl -X POST http://127.0.0.1:5000/predict \
      -H "Content-Type: application/json" \
      -d '{"G_per90": 0.5, "A_per90": 0.3, "Minutes_per_match": 75, "Start_rate": 0.8, "Age_factor": 0.9, "Discipline_score": 0.95, "MP": 20, "90s": 15}'
    """
    if not MODEL_LOADED:
        return jsonify({"error": "Model not loaded"}), 500
    
    try:
        data = request.get_json()
        
        # Extract features in correct order
        features = []
        for col in feature_cols:
            if col not in data:
                return jsonify({"error": f"Missing feature: {col}"}), 400
            features.append(float(data[col]))
        
        # Predict
        features_array = np.array(features).reshape(1, -1)
        prediction = model.predict(features_array)[0]
        
        return jsonify({
            "potential_score": round(float(prediction), 2),
            "features_used": dict(zip(feature_cols, features)),
            "interpretation": get_interpretation(prediction)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/feature_importance', methods=['GET'])
def get_feature_importance():
    """
    Get feature importances from the trained model
    
    Example curl:
    curl http://127.0.0.1:5000/feature_importance
    """
    if not MODEL_LOADED:
        return jsonify({"error": "Model not loaded"}), 500
    
    if not hasattr(model, 'feature_importances_'):
        return jsonify({"error": "Model does not support feature importances"}), 400
    
    importances = {
        feat: round(float(imp), 4)
        for feat, imp in zip(feature_cols, model.feature_importances_)
    }
    
    # Sort by importance
    sorted_importances = dict(
        sorted(importances.items(), key=lambda x: x[1], reverse=True)
    )
    
    return jsonify({
        "feature_importances": sorted_importances,
        "model_type": type(model).__name__
    })

@app.route('/stats', methods=['GET'])
def get_stats():
    """
    Get system statistics
    
    Example curl:
    curl http://127.0.0.1:5000/stats
    """
    stats = {
        "model_loaded": MODEL_LOADED,
        "top_players_loaded": TOP_PLAYERS_LOADED
    }
    
    if TOP_PLAYERS_LOADED:
        stats.update({
            "total_players": len(top_players_df),
            "avg_potential": round(float(top_players_df['PotentialScore'].mean()), 2),
            "max_potential": round(float(top_players_df['PotentialScore'].max()), 2),
            "min_potential": round(float(top_players_df['PotentialScore'].min()), 2)
        })
    
    if MODEL_LOADED:
        stats["features_used"] = feature_cols
        stats["model_type"] = type(model).__name__
    
    return jsonify(stats)

# ==================== HELPER FUNCTIONS ====================

def get_interpretation(score):
    """Provide human-readable interpretation of potential score"""
    if score >= 80:
        return "Exceptional talent - Top tier prospect"
    elif score >= 70:
        return "High potential - Strong prospect"
    elif score >= 60:
        return "Good potential - Promising player"
    elif score >= 50:
        return "Moderate potential - Developing player"
    else:
        return "Emerging talent - Needs development"

# ==================== RUN SERVER ====================

if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 Starting Flask server...")
    print("="*60)
    print(f"📍 Server: http://127.0.0.1:5000")
    print(f"📊 Endpoints: http://127.0.0.1:5000/")
    print(f"🏆 Top Players: http://127.0.0.1:5000/top_players")
    print(f"🔮 Predict: http://127.0.0.1:5000/predict (POST)")
    print("="*60 + "\n")
    
    app.run(debug=True, host='127.0.0.1', port=5000)