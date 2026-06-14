import csv
import uuid
from supabase_client import supabase

def import_fixtures():
    """Import fixtures from CSV into Supabase"""
    
    fixtures_data = []
    
    # Read the CSV file
    with open('../fixtures.csv', 'r') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            fixture = {
                "gameweek": int(row['week']),
                "home_team": row['home'],
                "away_team": row['away'],
                "date": row['date'],
                "kickoff_time": row['time']
            }
            fixtures_data.append(fixture)
    
    print(f"📊 Found {len(fixtures_data)} fixtures to import")
    
    # Import to Supabase
    try:
        response = supabase.table("fixtures").insert(fixtures_data).execute()
        print(f"✅ Successfully imported {len(response.data)} fixtures")
        return response.data
    except Exception as e:
        print(f"❌ Error importing fixtures: {e}")
        return None

if __name__ == "__main__":
    print("🚀 Starting fixtures import...")
    import_fixtures() 