# 🏆 RNLI Premier League Predictor – Fullstack App

A mobile-friendly Premier League prediction app, built for a group of friends and powered by FastAPI (backend) and React (frontend), with data managed in Supabase.

---

## 📦 Project Structure

```
rnli-premierleague-predictor/
├── backend/               # FastAPI backend (existing)
│   ├── main.py
│   ├── routes/
│   ├── supabase_client.py
│   └── requirements.txt
│
├── frontend/              # React or Next.js frontend (new)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/      # API fetch wrappers
│   │   └── App.jsx
│   ├── .env.local         # API URL config
│   ├── package.json
│   └── README.md
│
├── .gitignore
├── .env
└── README.md              # You're reading it!
```

---

## 🔧 Features

### ✅ Backend (FastAPI)
- User prediction submission for all 38 gameweeks
- Admin entry of real results
- Leaderboard calculation:
  - ✅ 5 pts for exact score
  - ⚖️ 2 pt for correct result
  - ❌ 0 pts for incorrect
- Gameweek filtering for fixtures
- Supabase as a real-time Postgres database

### 💻 Frontend (React/Next.js)
- Mobile-first design with RNLI-inspired theme
- Login screen (user/admin distinction later)
- Prediction form for each fixture
- Leaderboard view per gameweek
- Admin results entry panel

---

## ⚙️ Tech Stack

- **Python 3.9+** – backend logic
- **FastAPI + Uvicorn** – API
- **Supabase (Postgres)** – DB
- **React / Vite or Next.js** – frontend framework
- **Tailwind CSS** – UI styling
- **dotenv + GitHub** – config and versioning

---

## 🚀 Running Locally

### 1. Clone the repo:
```bash
git clone https://github.com/joeclarke0/rnli-premierleague-predictor.git
cd rnli-premierleague-predictor
```

### 2. Backend Setup:
```bash
cd backend
pip install -r requirements.txt
```
Create `.env` in `/backend`:
```env
SUPABASE_URL="https://your-project-name.supabase.co"
SUPABASE_KEY="your-public-anon-key"
```
Start dev server:
```bash
uvicorn main:app --reload
```
Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Frontend Setup:
```bash
cd ../frontend
npm install
npm run dev
```
Create `.env.local` in `/frontend`:
```env
VITE_API_URL=http://localhost:8000
```

App: [http://localhost:5173](http://localhost:5173) or port shown in terminal

---

## ✅ To Do (Next Steps)
- [ ] Build frontend pages (Predictions, Results, Leaderboard)
- [ ] Hook up API fetch logic to FastAPI endpoints
- [ ] Add role-based access (user/admin)
- [ ] Style everything with Tailwind (RNLI theme)
- [ ] Deploy backend (Railway/Fly.io) and frontend (Vercel/Netlify)

---

Built with ❤️ by Joe Clarke and the RNLI prediction crew ⚓️
