# 🏆 RNLI Premier League Predictor – Backend

This is the backend for a mobile-friendly Premier League score prediction app, built for a group of friends using FastAPI and Google Sheets.

### 🔧 Features

- User prediction submission for all 38 gameweeks
- Admin entry of real results
- Leaderboard calculation:
  - ✅ 3 pts for exact score
  - ⚖️ 1 pt for correct result (win/draw/loss)
  - ❌ 0 pts for incorrect prediction
- Gameweek support
- Google Sheets as a lightweight backend
- FastAPI-powered API with mobile support in mind
- Built with an RNLI-inspired theme

---

## ⚙️ Tech Stack

- **Python 3.9+**
- **FastAPI** for API routes
- **Uvicorn** as dev server
- **Google Sheets API** via `gspread`
- **dotenv** for local config
- **Git + GitHub** for version control

---

## 🚀 Running Locally

1. Clone the repo:

```bash
git clone https://github.com/joeclarke0/rnli-premierleague-predictor.git
cd rnli-premierleague-predictor
