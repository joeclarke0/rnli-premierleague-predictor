# 🏆 RNLI Premier League Predictor – Backend

This is the backend for a mobile-friendly Premier League score prediction app, built for a group of friends using FastAPI and **Supabase**.

### 🔧 Features

- User prediction submission for all 38 gameweeks
- Admin entry of real results
- Leaderboard calculation:
  - ✅ 5 pts for exact score
  - ⚖️ 2 pts for correct result (win/draw/loss)
  - ❌ 0 pts for incorrect prediction
- Gameweek support with fixture filtering
- Supabase Postgres database for reliable backend
- FastAPI-powered API with mobile support in mind
- Built with an RNLI-inspired theme

---

## ⚙️ Tech Stack

- **Python 3.9+**
- **FastAPI** for API routes
- **Uvicorn** as dev server
- **Supabase** for hosted Postgres DB
- **supabase-py** as Python client
- **dotenv** for local config
- **Git + GitHub** for version control

---

## 🚀 Running Locally

1. Clone the repo:

```bash
git clone https://github.com/joeclarke0/rnli-premierleague-predictor.git
cd rnli-premierleague-predictor
```

2. Create a `.env` file with:

```env
SUPABASE_URL="https://your-project-name.supabase.co"
SUPABASE_KEY="your-public-anon-key"
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Start the server:

```bash
uvicorn main:app --reload
```

5. Open Swagger docs:

[http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

Built with ❤️ by Joe Clarke and the RNLI prediction crew
