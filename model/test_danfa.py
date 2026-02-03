"""
Test hybrid system with elite Bundesliga U19 players
Tests: Danfa (31 goals), Pejčinović (28 goals), and others
"""

import pandas as pd
import numpy as np
import os
from performance_calculator_fixed import HybridPerformanceCalculator, calculate_all_potentials_hybrid

print("=" * 80)
print("HYBRID SYSTEM TEST: ELITE BUNDESLIGA U19 PLAYERS")
print("=" * 80)

# Set model paths
model_path = os.path.join('saved_models', 'youth_potential_model.pkl')
scaler_path = os.path.join('saved_models', 'feature_scaler.pkl')

calculator = HybridPerformanceCalculator(model_path, scaler_path)

# ========== TEST PLAYERS ==========
test_players = []

# 1. Iaia Danfa - 2024-25 (31 goals in 26 games - SUPER ELITE)
danfa_2025 = pd.Series({
    'Player': 'Iaia Danfa',
    'Position': 'FW',
    'Goals': 31,
    'Assists': 5,
    'Matches': 26,
    'Minutes': 2328,
    'Age': 18,
    'Club': 'Berliner AK',
    'Season': '2024-25',
    'xGPer90': 0.95,
    'xAPer90': 0.18,
    'GoalsPer90': 31 / (2328/90),
    'Team Success_PPM': 1.8,
    'Team Success_+/-': 15,
    # Additional features for ML model
    'Starts': 26,
    'xG': 31 * 0.95 / 90 * 2328 / 90,  # Estimate
    'xA': 5 * 0.18 / 90 * 2328 / 90,   # Estimate
    'Shots': 120,  # Estimate
    'ShotsOnTarget': 60,  # Estimate
    'PassesCompleted': 350,  # Estimate
    'PassCompletionPct': 78,  # Estimate
    'ProgressivePasses': 45,  # Estimate
    'Tackles': 15,  # Estimate
    'Interceptions': 10,  # Estimate
    'DribblesCompleted': 80,  # Estimate
    'Touches': 850  # Estimate
})
test_players.append(('Iaia Danfa (2024-25)', danfa_2025, 92, 95))

# 2. Iaia Danfa - 2025-26 (8 goals in 8 games)
danfa_2026 = pd.Series({
    'Player': 'Iaia Danfa',
    'Position': 'FW',
    'Goals': 8,
    'Assists': 0,
    'Matches': 8,
    'Minutes': 622,
    'Age': 19,
    'Club': 'Gladbach',
    'Season': '2025-26',
    'xGPer90': 0.90,
    'xAPer90': 0.10,
    'GoalsPer90': 8 / (622/90),
    'Team Success_PPM': 1.5,
    'Team Success_+/-': 5,
    # Additional features
    'Starts': 8,
    'xG': 8 * 0.90 / 90 * 622 / 90,
    'xA': 0,
    'Shots': 35,
    'ShotsOnTarget': 18,
    'PassesCompleted': 120,
    'PassCompletionPct': 75,
    'ProgressivePasses': 15,
    'Tackles': 5,
    'Interceptions': 3,
    'DribblesCompleted': 25,
    'Touches': 280
})
test_players.append(('Iaia Danfa (2025-26)', danfa_2026, 82, 87))

# 3. Dženan Pejčinović - 2023-24 (28 goals in 18 games)
pejcinovic_2024 = pd.Series({
    'Player': 'Dženan Pejčinović',
    'Position': 'FW',
    'Goals': 28,
    'Assists': 3,
    'Matches': 18,
    'Minutes': 1531,
    'Age': 18,
    'Club': 'Wolfsburg',
    'Season': '2023-24',
    'xGPer90': 1.40,
    'xAPer90': 0.15,
    'GoalsPer90': 28 / (1531/90),
    'Team Success_PPM': 2.0,
    'Team Success_+/-': 40,
    # Additional features
    'Starts': 18,
    'xG': 28 * 1.40 / 90 * 1531 / 90,
    'xA': 3 * 0.15 / 90 * 1531 / 90,
    'Shots': 110,
    'ShotsOnTarget': 55,
    'PassesCompleted': 300,
    'PassCompletionPct': 80,
    'ProgressivePasses': 40,
    'Tackles': 12,
    'Interceptions': 8,
    'DribblesCompleted': 70,
    'Touches': 750
})
test_players.append(('Dženan Pejčinović (2023-24)', pejcinovic_2024, 91, 94))

# 4. Dženan Pejčinović - 2024-25 (2 goals in 13 games)
pejcinovic_2025 = pd.Series({
    'Player': 'Dženan Pejčinović',
    'Position': 'FW',
    'Goals': 2,
    'Assists': 1,
    'Matches': 13,
    'Minutes': 984,
    'Age': 19,
    'Club': 'Wolfsburg',
    'Season': '2024-25',
    'xGPer90': 0.18,
    'xAPer90': 0.09,
    'GoalsPer90': 2 / (984/90),
    'Team Success_PPM': 1.0,
    'Team Success_+/-': -6,
    # Additional features
    'Starts': 13,
    'xG': 2 * 0.18 / 90 * 984 / 90,
    'xA': 1 * 0.09 / 90 * 984 / 90,
    'Shots': 25,
    'ShotsOnTarget': 10,
    'PassesCompleted': 200,
    'PassCompletionPct': 72,
    'ProgressivePasses': 20,
    'Tackles': 8,
    'Interceptions': 6,
    'DribblesCompleted': 30,
    'Touches': 400
})
test_players.append(('Dženan Pejčinović (2024-25)', pejcinovic_2025, 65, 75))

# 5. Paris Brunner - 2023-24 (20 goals in 22 games)
brunner_2024 = pd.Series({
    'Player': 'Paris Brunner',
    'Position': 'FW',
    'Goals': 20,
    'Assists': 6,
    'Matches': 22,
    'Minutes': 1850,
    'Age': 19,
    'Club': 'Dortmund',
    'Season': '2023-24',
    'xGPer90': 0.85,
    'xAPer90': 0.25,
    'GoalsPer90': 20 / (1850/90),
    'Team Success_PPM': 1.9,
    'Team Success_+/-': 25,
    # Additional features
    'Starts': 22,
    'xG': 20 * 0.85 / 90 * 1850 / 90,
    'xA': 6 * 0.25 / 90 * 1850 / 90,
    'Shots': 95,
    'ShotsOnTarget': 48,
    'PassesCompleted': 320,
    'PassCompletionPct': 79,
    'ProgressivePasses': 38,
    'Tackles': 10,
    'Interceptions': 7,
    'DribblesCompleted': 65,
    'Touches': 720
})
test_players.append(('Paris Brunner (2023-24)', brunner_2024, 87, 91))

# 6. Winsley Boteli - 2023-24 (21 goals in 21 games)
boteli_2024 = pd.Series({
    'Player': 'Winsley Boteli',
    'Position': 'FW',
    'Goals': 21,
    'Assists': 4,
    'Matches': 21,
    'Minutes': 1750,
    'Age': 19,
    'Club': 'Mönchengladbach',
    'Season': '2023-24',
    'xGPer90': 0.90,
    'xAPer90': 0.20,
    'GoalsPer90': 21 / (1750/90),
    'Team Success_PPM': 1.7,
    'Team Success_+/-': 18,
    # Additional features
    'Starts': 21,
    'xG': 21 * 0.90 / 90 * 1750 / 90,
    'xA': 4 * 0.20 / 90 * 1750 / 90,
    'Shots': 100,
    'ShotsOnTarget': 50,
    'PassesCompleted': 310,
    'PassCompletionPct': 77,
    'ProgressivePasses': 35,
    'Tackles': 9,
    'Interceptions': 6,
    'DribblesCompleted': 60,
    'Touches': 700
})
test_players.append(('Winsley Boteli (2023-24)', boteli_2024, 88, 92))

# 7. Average Bundesliga U19 forward
avg_player = pd.Series({
    'Player': 'Average Player',
    'Position': 'FW',
    'Goals': 5,
    'Assists': 3,
    'Matches': 20,
    'Minutes': 1600,
    'Age': 18,
    'Club': 'Average Club',
    'Season': '2024-25',
    'xGPer90': 0.28,
    'xAPer90': 0.17,
    'GoalsPer90': 5 / (1600/90),
    'Team Success_PPM': 1.5,
    'Team Success_+/-': 0,
    # Additional features
    'Starts': 15,
    'xG': 5 * 0.28 / 90 * 1600 / 90,
    'xA': 3 * 0.17 / 90 * 1600 / 90,
    'Shots': 45,
    'ShotsOnTarget': 20,
    'PassesCompleted': 250,
    'PassCompletionPct': 75,
    'ProgressivePasses': 25,
    'Tackles': 8,
    'Interceptions': 5,
    'DribblesCompleted': 40,
    'Touches': 500
})
test_players.append(('Average Player', avg_player, 68, 75))

# ========== RUN TESTS ==========
print("\n🧪 TESTING HYBRID SYSTEM...")
print("-" * 80)

results = []
all_pass = True

for player_name, stats, min_expected, max_expected in test_players:
    result = calculator.calculate_potential(stats)
    potential = result['PredictedPotential']
    
    # Check if within expected range
    passed = min_expected <= potential <= max_expected
    
    results.append({
        'Player': player_name,
        'Goals': stats['Goals'],
        'Matches': stats['Matches'],
        'Age': stats['Age'],
        'Potential': potential,
        'Performance': result['PerformanceScore'],
        'MLDevelopment': result['MLDevelopmentScore'],
        'ExpectedRange': f"{min_expected}-{max_expected}",
        'Passed': passed,
        'Tags': result.get('Tags', '')
    })
    
    if not passed:
        all_pass = False

# Print detailed results
print("\n📊 TEST RESULTS:")
print("=" * 80)
for res in results:
    status = "✓ PASS" if res['Passed'] else "✗ FAIL"
    color = "\033[92m" if res['Passed'] else "\033[91m"
    reset = "\033[0m"
    
    print(f"\n{color}{status}{reset}: {res['Player']}")
    print(f"   Goals: {res['Goals']} in {res['Matches']} games (Age: {res['Age']})")
    print(f"   Potential: {res['Potential']:.1f} (Expected: {res['ExpectedRange']})")
    print(f"   Performance: {res['Performance']:.1f} (70% weight)")
    print(f"   ML Development: {res['MLDevelopment']:.1f} (30% weight)")
    if res['Tags']:
        print(f"   Tags: {res['Tags']}")

print("\n" + "=" * 80)
print("📈 HYBRID SYSTEM SUMMARY:")
print("-" * 80)

passed_count = sum(1 for r in results if r['Passed'])
total_count = len(results)

print(f"Passed: {passed_count}/{total_count} tests")

if all_pass:
    print("\n✅ ALL TESTS PASSED! Hybrid system working correctly.")
else:
    print("\n❌ SOME TESTS FAILED! Check the calculations.")

# Show distribution
print("\n🎯 HYBRID RATING DISTRIBUTION:")
print("-" * 80)

elite = [r for r in results if r['Potential'] >= 90]
top = [r for r in results if 85 <= r['Potential'] < 90]
good = [r for r in results if 75 <= r['Potential'] < 85]
average = [r for r in results if r['Potential'] < 75]

print(f"Elite (90+): {len(elite)} players")
for player in elite:
    print(f"   • {player['Player']}: {player['Potential']:.1f}")

print(f"\nTop (85-90): {len(top)} players")
for player in top:
    print(f"   • {player['Player']}: {player['Potential']:.1f}")

print(f"\nGood (75-85): {len(good)} players")
for player in good:
    print(f"   • {player['Player']}: {player['Potential']:.1f}")

print(f"\nAverage (<75): {len(average)} players")
for player in average:
    print(f"   • {player['Player']}: {player['Potential']:.1f}")

print(f"\n⚖️  HYBRID SYSTEM BREAKDOWN:")
print("-" * 80)
print("   • 70%: Rule-based performance (goals, assists, xG, etc.)")
print("   • 30%: ML development potential (age, consistency, features)")
print("   • Combined: Final potential score")
print("   • Elite players: 90-95 range")
print("   • Average players: 65-75 range")
print("   • Max potential: 100 (extremely rare)")

print(f"\n✅ EXPECTED REALISTIC OUTCOME:")
print("   • Danfa 2024-25: 92-95 (SUPER ELITE)")
print("   • Pejčinović 2023-24: 91-94 (SUPER ELITE)")
print("   • Boteli/Brunner: 87-92 (ELITE)")
print("   • Average player: 68-75 (AVERAGE)")
print("   • Using trained ML model for 30% of calculation ✓")