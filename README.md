# 🏆 RNLI Premier League Predictor – Fullstack App

A modern, mobile-friendly Premier League prediction app built for RNLI colleagues, powered by FastAPI (backend) and React (frontend), with real-time data managed in Supabase.

---

## 📦 Project Structure

```
rnli-premierleague-predictor/
├── backend/               # FastAPI backend (✅ COMPLETE)
│   ├── main.py           # ✅ FastAPI server with CORS
│   ├── routes/           # ✅ All API endpoints working
│   │   ├── fixtures.py   # ✅ Fixture management
│   │   ├── predictions.py # ✅ Prediction submission
│   │   ├── results.py    # ✅ Results entry
│   │   ├── leaderboard.py # ✅ Leaderboard calculation
│   │   └── auth.py       # ✅ Authentication system
│   ├── supabase_client.py # ✅ Database connection
│   ├── import_fixtures.py # ✅ Data import script
│   └── requirements.txt
│
├── frontend/              # React frontend (✅ COMPLETE)
│   ├── src/
│   │   ├── components/   # ✅ Header component
│   │   ├── pages/        # ✅ All pages built
│   │   │   ├── Home.jsx  # ✅ Landing page
│   │   │   ├── Login.jsx # ✅ User authentication
│   │   │   ├── Predictions.jsx # ✅ Prediction interface
│   │   │   ├── Leaderboard.jsx # ✅ Rankings display
│   │   │   └── Results.jsx # ✅ Admin results entry
│   │   ├── services/     # ✅ API integration
│   │   ├── utils/        # ✅ Session management
│   │   └── App.jsx       # ✅ Main app with routing
│   ├── package.json
│   └── vite.config.js
│
├── fixtures.csv           # ✅ 380 fixtures imported
├── .env                   # ✅ Supabase credentials
└── README.md              # You're reading it!
```

---

## 🎨 Design & Features

### ✅ Modern RNLI Styling
- ✅ **Professional Color Scheme**: RNLI blue (#1E40AF) and orange (#EA580C)
- ✅ **Clean Typography**: Modern system fonts with proper hierarchy
- ✅ **Table-Based Layout**: Professional table design across all pages
- ✅ **Responsive Design**: Mobile-first approach
- ✅ **Smooth Animations**: Hover effects and transitions
- ✅ **Consistent Theme**: Unified styling across all pages

### ✅ Enhanced User Experience
- ✅ **Large Input Boxes**: Easy-to-use prediction forms
- ✅ **Auto 0-0 Handling**: Default scores without forced input
- ✅ **Gameweek Protection**: Prevents re-submission of completed weeks
- ✅ **Visual Feedback**: Clear status messages and confirmations
- ✅ **Sleek Leaderboard**: Rank badges and professional table design
- ✅ **Status Indicators**: Visual feedback for entered vs pending data

---

## 🔧 Core Features

### ✅ Backend (FastAPI) - COMPLETE
- ✅ **Prediction Management**: Submit and retrieve predictions by user/gameweek
- ✅ **Results Entry**: Admin interface for actual match results
- ✅ **Leaderboard Calculation**: 
  - ✅ 5 points for exact score prediction
  - ✅ 2 points for correct result (win/draw/loss)
  - ✅ 0 points for incorrect prediction
- ✅ **Authentication System**: JWT-based user authentication
- ✅ **Gameweek Filtering**: Organize fixtures by Premier League gameweeks
- ✅ **Supabase Integration**: Real-time PostgreSQL database
- ✅ **Data Import**: All 380 Premier League fixtures imported

### ✅ Frontend (React) - COMPLETE
- ✅ **Modern UI**: Professional RNLI-themed design
- ✅ **Navigation**: Clean header with conditional visibility
- ✅ **Prediction Interface**: Large, user-friendly input forms
- ✅ **Leaderboard Display**: Sleek table with rank badges
- ✅ **Results Management**: Admin panel for match results
- ✅ **Authentication**: Login/register with session persistence
- ✅ **Responsive Design**: Works perfectly on all devices
- ✅ **Protected Routes**: Secure access to authenticated pages

---

## ⚙️ Tech Stack

- **Python 3.9+** – Backend logic ✅
- **FastAPI + Uvicorn** – RESTful API ✅
- **Supabase (PostgreSQL)** – Real-time database ✅
- **React 18 + Vite** – Frontend framework ✅
- **Modern CSS** – Custom styling with CSS variables ✅
- **React Router** – Client-side navigation ✅
- **JWT Authentication** – Secure user sessions ✅

---

## 🚀 Running Locally

### 1. Clone the repository:
```bash
git clone https://github.com/joeclarke0/rnli-premierleague-predictor.git
cd rnli-premierleague-predictor
```

### 2. Backend Setup (✅ WORKING):
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```
- **API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/](http://localhost:8000/)

### 3. Frontend Setup (✅ WORKING):
```bash
cd frontend
npm install
npm run dev
```
- **App URL**: [http://localhost:5173](http://localhost:5173)

---

## ✅ Current Status

### ✅ Backend - FULLY FUNCTIONAL
- ✅ **API Server**: Running on `http://127.0.0.1:8000`
- ✅ **All Endpoints**: `/fixtures`, `/predictions`, `/results`, `/leaderboard`, `/auth/*`
- ✅ **Database**: 380 fixtures imported to Supabase
- ✅ **CORS**: Configured for frontend communication
- ✅ **Authentication**: JWT-based user management
- ✅ **Documentation**: Swagger docs at `/docs`

### ✅ Frontend - FULLY FUNCTIONAL
- ✅ **Modern React App**: Built with Vite for fast development
- ✅ **RNLI Theme**: Professional blue and orange color scheme
- ✅ **Prediction Interface**: Large input boxes with auto 0-0 handling
- ✅ **Leaderboard**: Sleek design with rank badges and hover effects
- ✅ **Results Entry**: Admin panel for match result submission
- ✅ **Authentication**: Login/register with 24-hour session persistence
- ✅ **Mobile Responsive**: Perfect on all screen sizes
- ✅ **API Integration**: Seamless backend communication
- ✅ **Protected Routes**: Secure navigation for authenticated users

---

## 🎯 App Features

### 🏠 Home Page
- ✅ **Welcome Section**: RNLI branding with anchor icon
- ✅ **Conditional Content**: Shows different content for logged-in vs logged-out users
- ✅ **Feature Cards**: Quick navigation to main functions (when logged in)
- ✅ **Login Prompt**: Clear call-to-action for unauthenticated users
- ✅ **How It Works**: Clear explanation of the prediction system

### ⚽ Predictions Page
- ✅ **Gameweek Selector**: Choose from 38 Premier League gameweeks
- ✅ **Professional Table**: Clean table layout matching leaderboard design
- ✅ **Fixture Display**: Team names, dates, and kickoff times
- ✅ **Score Input**: Large, user-friendly prediction forms
- ✅ **Auto Submission**: 0-0 defaults without forced input
- ✅ **Re-submission Protection**: Prevents duplicate entries
- ✅ **Visual Feedback**: Clear status messages and confirmations
- ✅ **Instructions Footer**: Helpful guidance for users

### 🏆 Leaderboard Page
- ✅ **Professional Table**: Clean design with proper spacing
- ✅ **Rank Badges**: Gold, silver, bronze for top 3 positions
- ✅ **Gameweek Breakdown**: Detailed score analysis per player
- ✅ **Scoring System**: Clear explanation of point allocation (5/2/0)
- ✅ **Interactive Details**: Expandable player statistics
- ✅ **Status Indicators**: Visual feedback for all gameweeks

### 📊 Results Page
- ✅ **Admin Interface**: Secure results entry for administrators
- ✅ **Professional Table**: Consistent styling with other pages
- ✅ **Gameweek Organization**: Filter fixtures by Premier League gameweeks
- ✅ **Result Input**: Professional forms for actual match scores
- ✅ **Status Tracking**: Visual indicators for entered vs pending results
- ✅ **Bulk Submission**: Submit all results for a gameweek at once
- ✅ **Visual Confirmation**: Clear display of entered results

### 🔐 Authentication System
- ✅ **User Registration**: Create new accounts with email and username
- ✅ **User Login**: Secure authentication with JWT tokens
- ✅ **Session Management**: 24-hour session persistence
- ✅ **Protected Routes**: Secure access to authenticated pages
- ✅ **Navigation Integration**: Conditional header visibility
- ✅ **Session Validation**: Backend token verification

---

## 🎯 Next Steps
1. ✅ **Backend Complete** - All API endpoints working perfectly
2. ✅ **Frontend Complete** - Modern, responsive interface
3. ✅ **Styling Complete** - Professional RNLI theme
4. ✅ **Authentication Complete** - JWT-based user management
5. 🆕 **Deployment** - Backend (Railway/Fly.io) and frontend (Vercel/Netlify)
6. 🆕 **Real-time Updates** - Live leaderboard updates
7. 🆕 **Email Notifications** - Gameweek reminders and results
8. 🆕 **Enhanced Security** - Password hashing and email verification

---

## 🏆 Scoring System

- **🎯 Exact Score**: 5 points for perfect prediction
- **✅ Correct Result**: 2 points for right outcome (win/draw/loss)
- **❌ Wrong Result**: 0 points for incorrect prediction

---

## 🔐 Authentication Features

- **User Registration**: Create accounts with email and username
- **Secure Login**: JWT-based authentication with 24-hour sessions
- **Session Persistence**: Automatic login state management
- **Protected Routes**: Secure access to predictions, leaderboard, and results
- **Conditional Navigation**: Header shows different options based on login status

---

Built with ❤️ by Joe Clarke and the RNLI prediction crew ⚓️

*Last updated: August 2024*
