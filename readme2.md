# 🏆 RNLI Premier League Predictor

A modern, full-stack Premier League prediction application built for RNLI colleagues. Features real-time predictions, admin management, and a comprehensive leaderboard system.

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- Supabase account

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

### Environment Configuration
```bash
# Backend (.env)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🏗️ Architecture

### Tech Stack
- **Backend**: FastAPI (Python)
- **Frontend**: React 18 + Vite
- **Database**: Supabase (PostgreSQL)
- **Authentication**: JWT + Supabase Auth
- **Styling**: Custom CSS with RNLI branding

### Project Structure
```
├── backend/
│   ├── main.py              # FastAPI application
│   ├── routes/              # API endpoints
│   │   ├── auth.py          # Authentication
│   │   ├── predictions.py   # Prediction management
│   │   ├── results.py       # Results management
│   │   ├── leaderboard.py   # Leaderboard calculation
│   │   └── admin.py         # Admin operations
│   └── supabase_client.py   # Database operations
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API services
│   │   ├── contexts/        # React contexts
│   │   └── utils/           # Utility functions
│   └── public/              # Static assets
```

## 🔐 Authentication & Authorization

### User Roles
- **User**: Submit predictions, view leaderboard
- **Admin**: Full access including results management

### Security Features
- JWT token-based authentication
- Role-based access control (RBAC)
- Protected API endpoints
- Session persistence (24-hour tokens)
- Input validation (0-100 score range)

## 📊 Core Features

### Prediction System
- **Gameweek Selection**: Choose specific weeks to predict
- **Score Input**: Validated number inputs (0-100)
- **Auto Defaults**: Empty fields default to 0-0
- **Admin Override**: Admins can modify any prediction
- **Real-time Validation**: Immediate feedback on inputs

### Leaderboard
- **Real-time Scoring**: 5 points exact, 2 points result
- **Gameweek Breakdown**: Detailed weekly scores
- **Professional Design**: Clean, responsive layout
- **Ranking System**: Visual position indicators

### Results Management (Admin Only)
- **Bulk Operations**: Submit all results for a gameweek
- **Status Tracking**: Visual indicators for entered/pending
- **Override Capability**: Modify existing results
- **Upsert Logic**: Smart update/insert operations

## 🎨 Design System

### RNLI Branding
- **Primary Colors**: Blue (#1E40AF), Orange (#EA580C), White
- **Typography**: Clean, readable fonts
- **Layout**: Mobile-first responsive design
- **Dark Mode**: Full theme support

### User Experience
- **Intuitive Navigation**: Clear menu structure
- **Visual Feedback**: Loading states and notifications
- **Admin Indicators**: Clear role-based UI elements
- **Accessibility**: Proper contrast and keyboard navigation

## 🔧 API Reference

### Authentication Endpoints
```
POST   /auth/login          # User login
POST   /auth/register       # User registration
GET    /auth/validate       # Session validation
POST   /auth/logout         # User logout
```

### Core Endpoints
```
GET    /fixtures/           # Get fixtures by gameweek
GET    /predictions/        # Get user predictions
POST   /predictions/        # Submit prediction
PUT    /predictions/{id}    # Update prediction
DELETE /predictions/{id}    # Delete prediction
GET    /results/            # Get match results
POST   /results/            # Submit result (admin)
PUT    /results/{id}        # Update result (admin)
DELETE /results/{id}        # Delete result (admin)
GET    /leaderboard/        # Get leaderboard
```

### Admin Endpoints
```
GET    /admin/users         # Get all users (admin)
```

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Predictions Table
```sql
CREATE TABLE predictions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    gameweek INTEGER,
    fixture_id INTEGER,
    predicted_home INTEGER,
    predicted_away INTEGER,
    inserted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Results Table
```sql
CREATE TABLE results (
    id UUID PRIMARY KEY,
    gameweek INTEGER,
    fixture_id INTEGER,
    actual_home INTEGER,
    actual_away INTEGER,
    inserted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🚀 Deployment

### Backend Deployment
- **Platform**: Railway, Fly.io, or Heroku
- **Environment**: Python 3.8+
- **Dependencies**: FastAPI, uvicorn, supabase
- **Configuration**: Environment variables for Supabase

### Frontend Deployment
- **Platform**: Vercel, Netlify, or GitHub Pages
- **Build**: Vite production build
- **Configuration**: API URL environment variable
- **Assets**: Optimized static files

## 🧪 Development

### Local Development
```bash
# Backend
cd backend
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm run dev
```

### Testing
- **Backend**: pytest for API testing
- **Frontend**: Manual testing with browser dev tools
- **Integration**: Full user journey testing

### Code Quality
- **Python**: Type hints and docstrings
- **JavaScript**: ESLint configuration
- **CSS**: Consistent naming conventions
- **Git**: Conventional commit messages

## 📈 Performance

### Optimizations
- **Frontend**: React.memo for component optimization
- **Backend**: Efficient database queries
- **Assets**: Optimized images and static files
- **Caching**: Browser caching for static assets

### Monitoring
- **Error Tracking**: Console logging and error boundaries
- **Performance**: React DevTools and browser profiling
- **User Analytics**: Basic usage tracking

## 🔮 Future Enhancements

### Planned Features
- Real-time updates via WebSocket
- Email notifications for results
- Advanced analytics dashboard
- Season history tracking
- Team-based competitions

### Technical Improvements
- Progressive Web App (PWA) support
- Enhanced dark mode customization
- Internationalization (i18n)
- Advanced caching strategies

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch
3. Implement changes with tests
4. Submit a pull request
5. Code review and merge

### Code Standards
- **Python**: PEP 8 compliance
- **JavaScript**: ESLint rules
- **CSS**: BEM methodology
- **Git**: Conventional commits

## 📞 Support

### Getting Help
- **Documentation**: Check this README
- **Issues**: Report bugs via GitHub
- **Feature Requests**: Use GitHub discussions

### Common Issues
- **Login Problems**: Verify email/password
- **Admin Access**: Check user role in database
- **Database Issues**: Verify Supabase connection
- **Frontend Errors**: Check browser console

---

## 📄 License

This project is developed for RNLI internal use. All rights reserved.

--- 