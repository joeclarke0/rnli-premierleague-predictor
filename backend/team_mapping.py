"""
Maps football-data.org team name variants to the local DB team names.

HOW TO MAINTAIN:
- Add an entry whenever a new team is promoted to the PL (season start).
- If the API's shortName already matches your DB name exactly, no entry needed.
- Run GET /admin/fixtures/sync/preview to see any "unmapped" teams in the console log.
- Keys are lowercased during lookup so casing doesn't matter.
"""

# Map from football-data.org name/shortName variants → local DB team name.
# Covers the 2025/26 Premier League season.
TEAM_NAME_MAP: dict[str, str] = {
    # Arsenal
    "arsenal fc": "Arsenal",
    "arsenal": "Arsenal",

    # Aston Villa
    "aston villa fc": "Aston Villa",
    "aston villa": "Aston Villa",

    # Bournemouth
    "afc bournemouth": "Bournemouth",
    "bournemouth": "Bournemouth",

    # Brentford
    "brentford fc": "Brentford",
    "brentford": "Brentford",

    # Brighton
    "brighton & hove albion fc": "Brighton",
    "brighton & hove albion": "Brighton",
    "brighton": "Brighton",

    # Chelsea
    "chelsea fc": "Chelsea",
    "chelsea": "Chelsea",

    # Coventry City
    "coventry city fc": "Coventry City",
    "coventry city": "Coventry City",
    "coventry": "Coventry City",

    # Crystal Palace
    "crystal palace fc": "Crystal Palace",
    "crystal palace": "Crystal Palace",

    # Everton
    "everton fc": "Everton",
    "everton": "Everton",

    # Fulham
    "fulham fc": "Fulham",
    "fulham": "Fulham",

    # Hull City
    "hull city fc": "Hull City",
    "hull city": "Hull City",
    "hull": "Hull City",

    # Ipswich — CSV uses "Ipswich Town"
    "ipswich town fc": "Ipswich Town",
    "ipswich town": "Ipswich Town",
    "ipswich": "Ipswich Town",

    # Leeds United
    "leeds united fc": "Leeds United",
    "leeds united": "Leeds United",
    "leeds": "Leeds United",

    # Leicester — CSV uses "Leicester City"
    "leicester city fc": "Leicester City",
    "leicester city": "Leicester City",
    "leicester": "Leicester City",

    # Liverpool
    "liverpool fc": "Liverpool",
    "liverpool": "Liverpool",

    # Man City — CSV uses "Manchester City"
    "manchester city fc": "Manchester City",
    "manchester city": "Manchester City",
    "man city": "Manchester City",

    # Man United — CSV uses "Manchester Utd"
    "manchester united fc": "Manchester Utd",
    "manchester united": "Manchester Utd",
    "man united": "Manchester Utd",
    "man utd": "Manchester Utd",

    # Newcastle — CSV uses "Newcastle Utd"
    "newcastle united fc": "Newcastle Utd",
    "newcastle united": "Newcastle Utd",
    "newcastle": "Newcastle Utd",

    # Nottingham Forest — CSV uses "Nottingham Forest"
    "nottingham forest fc": "Nottingham Forest",
    "nottingham forest": "Nottingham Forest",
    "nott'm forest": "Nottingham Forest",
    "nottm forest": "Nottingham Forest",

    # Southampton
    "southampton fc": "Southampton",
    "southampton": "Southampton",

    # Sunderland
    "sunderland afc": "Sunderland",
    "sunderland": "Sunderland",

    # Tottenham — CSV uses "Tottenham"
    "tottenham hotspur fc": "Tottenham",
    "tottenham hotspur": "Tottenham",
    "tottenham": "Tottenham",
    "spurs": "Tottenham",

    # West Ham
    "west ham united fc": "West Ham",
    "west ham united": "West Ham",
    "west ham": "West Ham",

    # Wolves
    "wolverhampton wanderers fc": "Wolves",
    "wolverhampton wanderers": "Wolves",
    "wolverhampton": "Wolves",
    "wolves": "Wolves",
}


def map_team_name(api_name: str) -> str | None:
    """
    Return the local DB team name for a football-data.org team name.
    Returns None if the name is not in the map (log this for manual review).
    Falls back to direct match if the api_name lowercased is in our map.
    """
    return TEAM_NAME_MAP.get(api_name.lower().strip())
