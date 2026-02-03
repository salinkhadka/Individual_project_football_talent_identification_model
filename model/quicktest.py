"""
Quick Test Script - Verify All Fixes Before Full Training
==========================================================
Run this to check if the fixes are working properly
"""

import pandas as pd
import numpy as np
from data_loader import load_data
from feature_engineering import engineer_features

print("\n" + "=" * 70)
print("QUICK FIX VERIFICATION TEST")
print("=" * 70)

try:
    # Test 1: Data Loading
    print("\n✓ Test 1: Loading all 4 seasons...")
    df = load_data(fill_missing=True)
    print(f"   Loaded {len(df)} total records")
    print(f"   Unique players: {df['Player'].nunique()}")
    print(f"   Seasons: {df['Season'].unique()}")
    
    # Test 2: Feature Engineering
    print("\n✓ Test 2: Engineering features...")
    df_eng = engineer_features(df)
    
    # Test 3: Age Calculation
    print("\n✓ Test 3: Checking age calculation...")
    print(f"   Age range: {df_eng['Age_std'].min():.0f} - {df_eng['Age_std'].max():.0f}")
    print(f"   Average age: {df_eng['Age_std'].mean():.1f}")
    
    # Test 4: Peak Potential vs Current Rating
    print("\n✓ Test 4: Checking Potential >= Current logic...")
    
    # Overall check
    potential_higher = (df_eng['peak_potential'] >= df_eng['current_rating']).mean()
    print(f"   All players: {potential_higher*100:.1f}% have Potential >= Current")
    
    # Youth check (under 20)
    youth = df_eng[df_eng['Age_std'] < 20]
    youth_potential_higher = (youth['peak_potential'] >= youth['current_rating']).mean()
    print(f"   Youth (<20): {youth_potential_higher*100:.1f}% have Potential >= Current")
    
    # Very young check (15-17)
    very_young = df_eng[df_eng['Age_std'] <= 17]
    if len(very_young) > 0:
        vv_potential_higher = (very_young['peak_potential'] >= very_young['current_rating']).mean()
        avg_gain = (very_young['peak_potential'] - very_young['current_rating']).mean()
        print(f"   Very young (≤17): {vv_potential_higher*100:.1f}% have Potential >= Current")
        print(f"   Average potential gain for ≤17: +{avg_gain:.1f} points")
    
    # Test 5: Position Distribution
    print("\n✓ Test 5: Position-based ratings...")
    latest_season = df_eng[df_eng['Season'] == df_eng['Season'].max()]
    
    pos_stats = latest_season.groupby('Pos_std').agg({
        'current_rating': 'mean',
        'peak_potential': 'mean',
        'Performance_Gls': 'mean',
        'Player': 'count'
    }).round(1)
    pos_stats.columns = ['Avg Current', 'Avg Potential', 'Avg Goals', 'Count']
    print(pos_stats)
    
    # Test 6: Sample Players
    print("\n✓ Test 6: Sample player examples (latest season)...")
    sample = latest_season.nlargest(5, 'peak_potential')[
        ['Player', 'Pos_std', 'Age_std', 'current_rating', 'peak_potential', 
         'Performance_Gls', 'Playing Time_90s_std']
    ].round(1)
    print(sample.to_string(index=False))
    
    # Test 7: Check for backwards cases
    print("\n✓ Test 7: Checking for backwards predictions...")
    backwards = df_eng[df_eng['peak_potential'] < df_eng['current_rating']]
    backwards_youth = backwards[backwards['Age_std'] < 20]
    
    print(f"   Total backwards cases: {len(backwards)} ({len(backwards)/len(df_eng)*100:.1f}%)")
    print(f"   Youth backwards cases: {len(backwards_youth)} (should be 0!)")
    
    if len(backwards_youth) > 0:
        print("\n   ⚠️  WARNING: Found youth with Current > Potential!")
        print(backwards_youth[['Player', 'Age_std', 'Pos_std', 'current_rating', 'peak_potential']].head())
    else:
        print("   ✅ PERFECT! No youth players with backwards predictions!")
    
    # Summary
    print("\n" + "=" * 70)
    print("VERIFICATION SUMMARY")
    print("=" * 70)
    
    checks = []
    checks.append(("Data loaded", len(df) > 1000))
    checks.append(("All 4 seasons present", len(df['Season'].unique()) == 4))
    checks.append(("Age calculated", 'Age_std' in df_eng.columns))
    checks.append(("Age range OK (14-22)", df_eng['Age_std'].min() >= 14 and df_eng['Age_std'].max() <= 22))
    checks.append(("Youth Potential >= Current", youth_potential_higher > 0.95))
    checks.append(("No backwards youth", len(backwards_youth) == 0))
    checks.append(("Defenders valued", pos_stats.loc['DF', 'Avg Potential'] > 30))
    
    print("\n")
    all_passed = True
    for check_name, passed in checks:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"{status}: {check_name}")
        if not passed:
            all_passed = False
    
    if all_passed:
        print("\n" + "=" * 70)
        print("🎉 ALL CHECKS PASSED! Ready to train!")
        print("=" * 70)
        print("\nNext step: Run 'python train.py'")
    else:
        print("\n" + "=" * 70)
        print("⚠️  SOME CHECKS FAILED - Review above")
        print("=" * 70)

except Exception as e:
    print(f"\n❌ Test failed with error:")
    print(f"   {str(e)}")
    import traceback
    traceback.print_exc()