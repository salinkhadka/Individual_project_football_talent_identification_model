from models import Database
from calculator import PotentialCalculator
import sqlite3

def backfill():
    print("🚀 Starting database backfill...")
    db = Database()
    calc = PotentialCalculator()
    
    conn = db.get_connection()
    cursor = conn.cursor()
    
    # Get all player records
    cursor.execute("SELECT * FROM players")
    players = cursor.fetchall()
    print(f"📋 Found {len(players)} player records to process.")
    
    updates = []
    processed = 0
    
    for row in players:
        player_dict = dict(row)
        # Recalculate everything
        new_scores = calc.calculate_potential(player_dict)
        
        # Prepare update
        updates.append((
            new_scores['predicted_potential'],
            new_scores['performance_score'],
            new_scores['base_performance_score'],
            new_scores['ml_development_score'],
            new_scores['confidence'],
            new_scores['elite_bonus'],
            new_scores['sample_penalty'],
            player_dict['id']
        ))
        
        processed += 1
        if processed % 1000 == 0:
            print(f"   • Calculated {processed}/{len(players)}...")

    # Bulk update using a single transaction
    print("💾 Saving updates to database...")
    cursor.executemany("""
        UPDATE players 
        SET predicted_potential = ?,
            performance_score = ?,
            base_performance_score = ?,
            ml_development_score = ?,
            confidence = ?,
            elite_bonus = ?,
            sample_penalty = ?
        WHERE id = ?
    """, updates)
    
    conn.commit()
    conn.close()
    
    print(f"✅ Successfully backfilled {len(updates)} records!")

if __name__ == "__main__":
    backfill()
