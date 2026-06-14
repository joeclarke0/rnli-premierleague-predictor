#!/usr/bin/env python3
"""
Debug script to investigate leaderboard scoring issues.
This will help us understand why Joe has 130 points when max should be 50 per gameweek.
"""

import os
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Supabase credentials not found. Please check your .env file.")
    exit(1)

from supabase import create_client, Client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def debug_leaderboard():
    print("🔍 Debugging leaderboard scoring...")
    
    # Fetch all data
    predictions = supabase.table("predictions").select("*").execute()
    results = supabase.table("results").select("*").execute()
    users = supabase.table("users").select("*").execute()
    
    print(f"\n📊 Data Summary:")
    print(f"Predictions: {len(predictions.data)}")
    print(f"Results: {len(results.data)}")
    print(f"Users: {len(users.data)}")
    
    # Check for Joe's predictions specifically
    joe_predictions = [p for p in predictions.data if p.get('user_id') == '361a3c5d-ee29-4b67-8636-e893001ae573']
    print(f"\n👤 Joe's predictions: {len(joe_predictions)}")
    
    # Group by gameweek
    gameweek_counts = {}
    for pred in joe_predictions:
        gameweek = pred.get('gameweek')
        if gameweek not in gameweek_counts:
            gameweek_counts[gameweek] = 0
        gameweek_counts[gameweek] += 1
        print(f"  Gameweek {gameweek}: {pred.get('predicted_home')}-{pred.get('predicted_away')} for fixture {pred.get('fixture_id')}")
    
    print(f"\n📈 Joe's predictions by gameweek:")
    for gameweek, count in sorted(gameweek_counts.items()):
        print(f"  Gameweek {gameweek}: {count} predictions")
    
    # Check for duplicate predictions
    print(f"\n🔍 Checking for duplicate predictions...")
    seen_predictions = set()
    duplicates = []
    
    for pred in predictions.data:
        key = (pred.get('user_id'), pred.get('gameweek'), pred.get('fixture_id'))
        if key in seen_predictions:
            duplicates.append(pred)
        else:
            seen_predictions.add(key)
    
    print(f"Duplicate predictions found: {len(duplicates)}")
    for dup in duplicates:
        print(f"  Duplicate: User {dup.get('user_id')}, Gameweek {dup.get('gameweek')}, Fixture {dup.get('fixture_id')}")
    
    # Check results
    print(f"\n🏆 Results summary:")
    for result in results.data:
        print(f"  Fixture {result.get('fixture_id')}: {result.get('actual_home')}-{result.get('actual_away')}")
    
    # Calculate what Joe's score should be
    print(f"\n🧮 Calculating Joe's expected score...")
    result_lookup = {r["fixture_id"]: r for r in results.data}
    
    def calculate_points(pred_home, pred_away, act_home, act_away):
        if pred_home == act_home and pred_away == act_away:
            return 5
        elif (pred_home > pred_away and act_home > act_away) or \
             (pred_home < pred_away and act_home < act_away) or \
             (pred_home == pred_away and act_home == act_away):
            return 2
        return 0
    
    joe_score_by_gameweek = {}
    total_score = 0
    
    for pred in joe_predictions:
        fixture_id = pred.get('fixture_id')
        gameweek = pred.get('gameweek')
        
        if fixture_id in result_lookup:
            result = result_lookup[fixture_id]
            score = calculate_points(
                pred.get('predicted_home'), pred.get('predicted_away'),
                result.get('actual_home'), result.get('actual_away')
            )
            
            if gameweek not in joe_score_by_gameweek:
                joe_score_by_gameweek[gameweek] = 0
            joe_score_by_gameweek[gameweek] += score
            total_score += score
            
            print(f"  Gameweek {gameweek}, Fixture {fixture_id}: {pred.get('predicted_home')}-{pred.get('predicted_away')} vs {result.get('actual_home')}-{result.get('actual_away')} = {score} points")
    
    print(f"\n📊 Joe's calculated scores by gameweek:")
    for gameweek, score in sorted(joe_score_by_gameweek.items()):
        print(f"  Gameweek {gameweek}: {score} points")
    
    print(f"\n🎯 Total calculated score: {total_score}")
    print(f"Expected max per gameweek: 50 points (10 games × 5 points)")

if __name__ == "__main__":
    debug_leaderboard() 