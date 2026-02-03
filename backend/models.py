"""
Database Models for Bundesliga Youth Potential App - COMPLETE FIXED
Robust handling of best potential queries + saves column
"""
import sqlite3
from typing import List, Dict, Optional
import json


class Database:
    """SQLite database handler - FIXED with robust queries"""
    
    def __init__(self, db_path: str = "database.db"):
        self.db_path = db_path
        self.has_best_potential_column = self._check_and_init_column()
    
    def get_connection(self):
        """Get database connection"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn
    
    def _check_and_init_column(self) -> bool:
        """Check if is_best_potential column exists and add if needed"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            # Check if column exists
            cursor.execute("PRAGMA table_info(players)")
            columns = [col[1] for col in cursor.fetchall()]
            
            if 'is_best_potential' not in columns:
                print("⚠️  Adding is_best_potential column...")
                cursor.execute("ALTER TABLE players ADD COLUMN is_best_potential BOOLEAN DEFAULT 0")
                conn.commit()
                print("✅ Added is_best_potential column")
                self._update_best_potential_flags_internal(conn)
                return True
            else:
                print("✅ is_best_potential column exists")
            
            # Check if saves column exists (for GK stats)
            if 'saves' not in columns:
                print("⚠️  Adding saves column for goalkeepers...")
                cursor.execute("ALTER TABLE players ADD COLUMN saves INTEGER DEFAULT NULL")
                conn.commit()
                print("✅ Added saves column")
            
            return True
        except sqlite3.OperationalError as e:
            print(f"⚠️  Column handling issue: {e}")
            return False
        finally:
            conn.close()
    
    def _clean_row_nulls(self, row_dict: Dict) -> Dict:
        """Clean NULL values from a row dictionary"""
        for key in row_dict:
            if row_dict[key] is None:
                # Set sensible defaults based on field type
                if any(x in key.lower() for x in ['score', 'potential', 'rating', 'per_90', 'percentage', 'multiplier', 'bonus', 'penalty', 'weight']):
                    row_dict[key] = 0.0
                elif any(x in key.lower() for x in ['matches', 'starts', 'minutes', 'goals', 'assists', 'age', 'nineties', 'saves']):
                    row_dict[key] = 0
                elif key in ['confidence']:
                    row_dict[key] = 'Medium'
                elif key in ['tags', 'club', 'nation', 'position', 'player_name', 'season']:
                    row_dict[key] = ''
        return row_dict
    
    def _update_best_potential_flags_internal(self, conn):
        """Internal method to update best potential flags"""
        cursor = conn.cursor()
        
        # Reset all best potential flags
        cursor.execute("UPDATE players SET is_best_potential = 0")
        
        # For each player, find the season with highest predicted_potential
        cursor.execute("""
            SELECT player_name, MAX(predicted_potential) as max_potential
            FROM players 
            GROUP BY player_name
        """)
        
        max_potentials = cursor.fetchall()
        
        updated_count = 0
        for row in max_potentials:
            cursor.execute("""
                UPDATE players 
                SET is_best_potential = 1
                WHERE player_name = ? AND predicted_potential = ?
            """, (row['player_name'], row['max_potential']))
            updated_count += cursor.rowcount
        
        conn.commit()
        print(f"✅ Updated best potential flags for {updated_count} players")
    
    def update_best_potential_flags(self):
        """Update is_best_potential flag for each player"""
        conn = self.get_connection()
        self._update_best_potential_flags_internal(conn)
        conn.close()
    
    def get_top_prospects(self, limit: int = 100, position: str = None) -> List[Dict]:
        """Get top prospects - uses subquery if column doesn't exist"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        if self.has_best_potential_column:
            # Use optimized query with column
            query = """
                SELECT * FROM players 
                WHERE is_best_potential = 1
                AND predicted_potential IS NOT NULL
            """
            params = []
            
            if position:
                query += " AND position = ?"
                params.append(position)
            
            query += " ORDER BY predicted_potential DESC LIMIT ?"
            params.append(limit)
        else:
            # Fallback: use subquery to get best potential
            query = """
                SELECT p1.* 
                FROM players p1
                INNER JOIN (
                    SELECT player_name, MAX(predicted_potential) as max_potential
                    FROM players 
                    WHERE predicted_potential IS NOT NULL
                    GROUP BY player_name
                ) p2 ON p1.player_name = p2.player_name 
                      AND p1.predicted_potential = p2.max_potential
            """
            params = []
            
            if position:
                query += " WHERE p1.position = ?"
                params.append(position)
            
            query += " ORDER BY p1.predicted_potential DESC LIMIT ?"
            params.append(limit)
        
        cursor.execute(query, params)
        rows = cursor.fetchall()
        conn.close()
        
        # Convert to dict and clean NULL values
        return [self._clean_row_nulls(dict(row)) for row in rows]
    
    def search_players(self, query: str, position: str = None, 
                      season: str = None) -> List[Dict]:
        """Search players by name, club, or position - return BEST potential season"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Use subquery approach (works regardless of column existence)
        sql = """
            SELECT p1.* 
            FROM players p1
            INNER JOIN (
                SELECT player_name, MAX(predicted_potential) as max_potential
                FROM players 
                WHERE (player_name LIKE ? OR club LIKE ?)
                AND predicted_potential IS NOT NULL
                GROUP BY player_name
            ) p2 ON p1.player_name = p2.player_name 
                  AND p1.predicted_potential = p2.max_potential
        """
        params = [f"%{query}%", f"%{query}%"]
        
        conditions = []
        if position:
            conditions.append("p1.position = ?")
            params.append(position)
        
        if season:
            conditions.append("p1.season = ?")
            params.append(season)
        
        if conditions:
            sql += " WHERE " + " AND ".join(conditions)
        
        sql += " ORDER BY p1.predicted_potential DESC"
        
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        conn.close()
        
        return [self._clean_row_nulls(dict(row)) for row in rows]
    
    def get_player_progression(self, player_name: str) -> List[Dict]:
        """Get all seasons for a specific player"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM players 
            WHERE player_name = ?
            ORDER BY season DESC
        """, (player_name,))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [self._clean_row_nulls(dict(row)) for row in rows]
    
    def get_player_by_id(self, player_id: int) -> Optional[Dict]:
        """Get specific player record by ID"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM players WHERE id = ?", (player_id,))
        row = cursor.fetchone()
        conn.close()
        
        return self._clean_row_nulls(dict(row)) if row else None
    
    def get_player_best_season(self, player_name: str) -> Optional[Dict]:
        """Get player's BEST season (highest potential)"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM players 
            WHERE player_name = ?
            AND predicted_potential IS NOT NULL
            ORDER BY predicted_potential DESC
            LIMIT 1
        """, (player_name,))
        
        row = cursor.fetchone()
        conn.close()
        
        return self._clean_row_nulls(dict(row)) if row else None
    
    def get_all_seasons(self) -> List[str]:
        """Get all unique seasons"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT DISTINCT season FROM players ORDER BY season DESC")
        rows = cursor.fetchall()
        conn.close()
        
        return [row['season'] for row in rows]
    
    def get_all_clubs(self) -> List[str]:
        """Get all unique clubs"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT DISTINCT club FROM players WHERE club IS NOT NULL AND club != '' ORDER BY club")
        rows = cursor.fetchall()
        conn.close()
        
        return [row['club'] for row in rows]
    
    def get_statistics(self) -> Dict:
        """Get database statistics - using BEST potential"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Total unique players
        cursor.execute("SELECT COUNT(DISTINCT player_name) as count FROM players")
        total_players = cursor.fetchone()['count']
        
        # Total records
        cursor.execute("SELECT COUNT(*) as count FROM players")
        total_records = cursor.fetchone()['count']
        
        # Players by position (BEST potential) - using subquery
        cursor.execute("""
            SELECT p.position, COUNT(DISTINCT p.player_name) as count 
            FROM players p
            INNER JOIN (
                SELECT player_name, MAX(predicted_potential) as max_potential
                FROM players 
                GROUP BY player_name
            ) best ON p.player_name = best.player_name 
                   AND p.predicted_potential = best.max_potential
            GROUP BY p.position
        """)
        by_position = {row['position']: row['count'] for row in cursor.fetchall()}
        
        # Average potential by position (BEST potential)
        cursor.execute("""
            SELECT p.position, AVG(p.predicted_potential) as avg_potential 
            FROM players p
            INNER JOIN (
                SELECT player_name, MAX(predicted_potential) as max_potential
                FROM players 
                GROUP BY player_name
            ) best ON p.player_name = best.player_name 
                   AND p.predicted_potential = best.max_potential
            GROUP BY p.position
        """)
        avg_potential = {row['position']: round(row['avg_potential'], 1) 
                        for row in cursor.fetchall()}
        
        # Overall stats (BEST potential)
        cursor.execute("""
            SELECT 
                AVG(p.predicted_potential) as avg_potential,
                MAX(p.predicted_potential) as max_potential,
                COUNT(*) as elite_count
            FROM players p
            INNER JOIN (
                SELECT player_name, MAX(predicted_potential) as max_potential
                FROM players 
                GROUP BY player_name
            ) best ON p.player_name = best.player_name 
                   AND p.predicted_potential = best.max_potential
            WHERE p.predicted_potential >= 70
        """)
        overall = cursor.fetchone()
        
        conn.close()
        
        return {
            'total_players': total_players,
            'total_records': total_records,
            'by_position': by_position,
            'avg_potential_by_position': avg_potential,
            'avg_potential': round(overall['avg_potential'], 1) if overall['avg_potential'] else 0,
            'max_potential': round(overall['max_potential'], 1) if overall['max_potential'] else 0,
            'elite_count': overall['elite_count'] or 0
        }
    
    def add_to_watchlist(self, player_id: int) -> bool:
        """Add player to watchlist"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                INSERT OR IGNORE INTO watchlist (player_id, added_date)
                VALUES (?, datetime('now'))
            """, (player_id,))
            conn.commit()
            success = cursor.rowcount > 0
            conn.close()
            return success
        except Exception as e:
            conn.close()
            print(f"Error adding to watchlist: {e}")
            return False
    
    def remove_from_watchlist(self, player_id: int) -> bool:
        """Remove player from watchlist"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM watchlist WHERE player_id = ?", (player_id,))
        conn.commit()
        success = cursor.rowcount > 0
        conn.close()
        return success
    
    def get_watchlist(self) -> List[Dict]:
        """Get all players in watchlist"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT w.player_id, p.player_name, p.club as team, p.position,
                   p.predicted_potential as peak_potential, 
                   p.performance_score as current_rating
            FROM watchlist w
            JOIN players p ON w.player_id = p.id
            ORDER BY w.added_date DESC
        """)
        
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    
    def get_all_teams(self) -> List[Dict]:
        """Get all teams with analytics - using BEST potential"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT 
                p.club as team,
                COUNT(DISTINCT p.player_name) as player_count,
                AVG(p.predicted_potential) as avg_potential,
                AVG(p.performance_score) as avg_current,
                MAX(p.predicted_potential) as max_potential
            FROM players p
            INNER JOIN (
                SELECT player_name, MAX(predicted_potential) as max_potential
                FROM players
                GROUP BY player_name
            ) best ON p.player_name = best.player_name 
                   AND p.predicted_potential = best.max_potential
            WHERE p.club IS NOT NULL AND p.club != ''
            GROUP BY p.club
            ORDER BY avg_potential DESC
        """)
        
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    
    def get_team_players(self, team_name: str) -> List[Dict]:
        """Get all players for a specific team - BEST potential season"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT p.*
            FROM players p
            INNER JOIN (
                SELECT player_name, MAX(predicted_potential) as max_potential
                FROM players
                WHERE club = ?
                GROUP BY player_name
            ) best ON p.player_name = best.player_name 
                   AND p.predicted_potential = best.max_potential
            ORDER BY p.predicted_potential DESC
        """, (team_name,))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    
    def get_top_players_by_position(self, position: str, limit: int = 25) -> List[Dict]:
        """Get top players by position (BEST potential)"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT p.*
            FROM players p
            INNER JOIN (
                SELECT player_name, MAX(predicted_potential) as max_potential
                FROM players
                WHERE position = ?
                GROUP BY player_name
            ) best ON p.player_name = best.player_name 
                   AND p.predicted_potential = best.max_potential
            ORDER BY p.predicted_potential DESC
            LIMIT ?
        """, (position, limit))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]
    
    def clear_all_data(self):
        """Clear all player data"""
        conn = self.get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM players")
        conn.commit()
        conn.close()
        print("🗑️  Database cleared")
    
    def insert_player(self, player_data: Dict):
        """Insert or replace a player record"""
        conn = self.get_connection()
        cursor = conn.cursor()
        
        # Get existing columns
        cursor.execute("PRAGMA table_info(players)")
        existing_columns = {col[1] for col in cursor.fetchall()}
        
        # Filter player_data to only include existing columns
        filtered_data = {k: v for k, v in player_data.items() if k in existing_columns}
        
        if not filtered_data:
            conn.close()
            return
        
        # Build dynamic insert
        columns = list(filtered_data.keys())
        placeholders = ', '.join(['?' for _ in columns])
        column_names = ', '.join(columns)
        values = [filtered_data[col] for col in columns]
        
        cursor.execute(f"""
            INSERT OR REPLACE INTO players ({column_names})
            VALUES ({placeholders})
        """, values)
        
        conn.commit()
        conn.close()
    
    def bulk_insert_players(self, players: List[Dict]):
        """Bulk insert players"""
        for player_data in players:
            self.insert_player(player_data)
        print(f"✅ Inserted {len(players)} player records")