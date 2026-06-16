# RNLI Premier League Predictor — Admin Guide

**App URL:** https://rnli-premierleague-predictor.vercel.app

---

## What is this app?

A Premier League score prediction game for RNLI colleagues. Players predict the scoreline of each fixture before kickoff. Points are awarded based on accuracy, and a live leaderboard tracks the standings across the season.

**Scoring:**
- 5 pts — Exact score (e.g. predicted 2-1, result was 2-1)
- 2 pts — Correct result (e.g. predicted 2-1, result was 1-0 — both a home win)
- 0 pts — Incorrect

---

## Admin vs Player

Regular players can:
- Register an account and log in
- Submit predictions before kickoff
- View the leaderboard, fixtures, and results

Admins can do everything players can, plus:
- Upload fixture lists (CSV)
- Enter match results
- Manage users (view all accounts, reset passwords, promote to admin)
- Mark fixtures as postponed
- See who hasn't submitted predictions yet

Your admin badge appears in the top-right nav when logged in.

---

## Logging In

Go to https://rnli-premierleague-predictor.vercel.app and click **Login**.

| Name | Email | Temp Password |
|------|-------|---------------|
| Joe | jea.clarke.9307@gmail.com | RnliAdmin2026 |
| Rob | rob_shanley@rnli.org.uk | RnliRob2026 |
| Wayne | wayne_morris@rnli.org.uk | RnliWayne2026 |

**Change your password after first login:** Admin Panel → Users → find your account → Reset Password.

---

## Weekly Admin Workflow

### Before the gameweek starts

1. Make sure fixtures for the gameweek are uploaded (see Uploading Fixtures below)
2. Check **Admin Panel → Missing** to see who hasn't submitted predictions yet — you can chase them directly

### After the matches are played

1. Go to **Results** in the top navigation
2. Select the gameweek
3. Enter the final score for each fixture and click **Submit**
4. The leaderboard updates automatically

### Correcting a result

If you entered a wrong score, just go back to Results, select the same gameweek, re-enter the correct score and submit. It overwrites the previous entry — no harm done.

---

## Uploading Fixtures

Fixtures are uploaded as a CSV file. You only need to do this once per gameweek (or once for the whole season if you have all dates upfront).

**Go to:** Admin Panel → Fixtures → Upload CSV

### CSV format

Your file must have these columns (column names are flexible — the app normalises them):

| Column | Required | Notes |
|--------|----------|-------|
| week | Yes | Gameweek number (1–38) |
| date | Yes | Format: YYYY-MM-DD (e.g. 2026-08-15) |
| home | Yes | Home team name |
| away | Yes | Away team name |
| time | No | Kickoff time in HH:MM (e.g. 15:00) — used to lock predictions at kickoff |

**Example:**
```
week,date,home,away,time
1,2026-08-15,Arsenal,Manchester City,12:30
1,2026-08-15,Chelsea,Liverpool,15:00
```

**Important notes:**
- Uploading is safe to repeat — it upserts (updates existing, adds new). It will never delete fixtures or wipe predictions.
- If you include kickoff times, predictions for that fixture automatically lock when the match kicks off. Without a time, predictions stay open.
- Use consistent team names across uploads (e.g. always "Manchester City", never "Man City") — the app matches on exact name.

---

## Postponed Fixtures

If a match is postponed:

1. Go to **Admin Panel → Fixtures**
2. Find the fixture and toggle it to **Postponed**

Postponed fixtures are excluded from scoring and shown with a badge on the Predictions and Results pages. When the match is rescheduled, update the fixture date and toggle the status back to active.

---

## Managing Users

**Go to:** Admin Panel → Users

From here you can:
- See all registered accounts and their roles
- **Reset a player's password** — click the reset icon next to their name and set a new temporary password for them to use
- **Promote a user to admin** — change their role to Admin

### Adding a new admin

If you want to make someone an admin who has already registered:
1. Admin Panel → Users → find their account → change role to Admin

If you need to create a brand new admin account from scratch, contact Joe — it requires a quick database command.

---

## Leaderboard

The leaderboard updates automatically whenever results are entered. Players can view:
- **Overall** — total points across the season
- **By Gameweek** — points for a specific week

Stats shown include current rank, recent form, best gameweek score, and total gameweeks played.

---

## Known Quirks & Limits

- **Cold start:** The backend runs on Render's free tier. If nobody has visited the app in a while (30–60 mins), the first page load may be slow while the server wakes up. Subsequent loads are fast.
- **Prediction lock:** Once a fixture's kickoff time passes, predictions for that match are locked — players will see a "Locked" badge and cannot change their pick. This only applies if kickoff times were included in the CSV upload.
- **No email notifications:** The app doesn't send reminder emails. If you want to chase players who haven't predicted, check Admin Panel → Missing and contact them directly.
- **Password reset:** Players cannot reset their own passwords. If someone is locked out, an admin resets it for them via Admin Panel → Users.

---

## Season Reset (end of season)

When a new season starts:

1. Upload the new season's fixtures CSV — existing fixtures remain but new gameweek numbers are added
2. Go to Admin Panel → Overview and update the season label
3. Confirm all admins still have the Admin role (Admin Panel → Users)
4. Optionally rotate the secret key to force everyone to re-login (contact Joe for this)
5. Do a quick smoke test — make a prediction, enter a result, check the leaderboard

---

## Something broken?

Contact Joe — he manages the hosting and codebase.

| Issue | Who to contact |
|-------|----------------|
| App not loading / errors | Joe |
| Player locked out | Any admin (password reset via Admin Panel) |
| Wrong result entered | Any admin (re-submit on Results page) |
| Fixture missing | Any admin (re-upload CSV) |
