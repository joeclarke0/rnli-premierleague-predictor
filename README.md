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
│   │   ├── predictions.py # ✅ Prediction submission with admin override
│   │   ├── results.py    # ✅ Results entry (admin only)
│   │   ├── leaderboard.py # ✅ Leaderboard calculation
│   │   └── auth.py       # ✅ Authentication system with roles
│   ├── supabase_client.py # ✅ Database operations with role support
│   ├── create_admin_user.py # ✅ Admin user setup script
│   └── setup_users_table.py # ✅ Database schema setup
├── frontend/             # React frontend (✅ COMPLETE)
│   ├── src/
│   │   ├── components/   # ✅ Header with admin badge
│   │   ├── pages/        # ✅ All pages with role-based UI
│   │   ├── services/     # ✅ API service with admin functions
│   │   └── utils/        # ✅ Session management
└── fixtures.csv          # ✅ Premier League fixture data
```

---

## 🔐 Authentication & Role-Based Access

### **User Roles**
- **`user`** (default): Regular users can submit predictions and view leaderboard
- **`admin`**: Admins can override predictions, manage results, and access all features

### **Admin Features**
- ✅ **Override Predictions**: Admins can resubmit predictions for any gameweek
- ✅ **Manage Results**: Only admins can submit/edit/delete match results
- ✅ **Delete Predictions**: Admins can delete any prediction, users can only delete their own
- ✅ **Visual Indicators**: Admin badge in header and on pages
- ✅ **Role-Based UI**: Different interfaces for admins vs regular users

### **Security**
- ✅ **JWT Tokens**: 24-hour session persistence
- ✅ **Protected Routes**: Role-based access control
- ✅ **API Authorization**: Backend validates user permissions
- ✅ **Session Management**: Secure localStorage with expiration
- ✅ **Supabase Auth**: Secure password storage and authentication

---

## 🚀 Quick Start

### **1. Backend Setup**
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000
```

### **2. Frontend Setup**
```bash
cd frontend
npm install
npm run dev
```

### **3. Database Setup**
```bash
# Add role column to users table
python setup_users_table.py

# Create admin user
python create_admin_user.py
```

### **4. Admin Access**
- **Email**: `admin@rnli.com`
- **Password**: `password`
- **Role**: `admin`

**OR**

- **Email**: `jea.clarke9307@gmail.com`
- **Password**: `password`
- **Role**: `admin`

---

## 🎯 Core Features

### **📊 Predictions System**
- ✅ **User Predictions**: Submit scores for each fixture
- ✅ **Auto 0-0**: Empty fields default to 0-0 predictions
- ✅ **Gameweek Lock**: Prevent resubmission (except admins)
- ✅ **Admin Override**: Admins can modify existing predictions
- ✅ **Visual Feedback**: Clear submission status indicators
- ✅ **Input Validation**: Real-time validation with 0-100 range enforcement
- ✅ **Error Display**: Clear error messages for invalid inputs
- ✅ **Dual Validation**: onChange and onBlur validation for better UX

### **🏆 Leaderboard**
- ✅ **Real-time Scoring**: 5 points exact, 2 points result, 0 incorrect
- ✅ **Gameweek Breakdown**: Drill-down to see weekly scores
- ✅ **Professional Design**: Clean table layout with RNLI branding
- ✅ **Responsive**: Works on all devices

### **📈 Results Management**
- ✅ **Admin Only**: Only admins can submit/edit results
- ✅ **Status Tracking**: Visual indicators for entered vs pending
- ✅ **Override Capability**: Admins can modify existing results
- ✅ **Bulk Operations**: Submit all results for a gameweek
- ✅ **Upsert Logic**: Updates existing results instead of creating duplicates
- ✅ **Input Validation**: Real-time validation with 0-100 range enforcement
- ✅ **Error Display**: Clear error messages for invalid inputs
- ✅ **Dual Validation**: onChange and onBlur validation for better UX

### **🔐 Authentication**
- ✅ **User Registration**: Email, password, username
- ✅ **Session Persistence**: 24-hour JWT tokens
- ✅ **Role-Based Access**: Different permissions for users vs admins
- ✅ **Protected Routes**: Secure navigation based on login status
- ✅ **Supabase Integration**: Secure password storage and authentication

---

## 🎨 Design & UX

### **RNLI Branding**
- ✅ **Color Scheme**: Blue (#0052CC), Orange (#FF6B35), White
- ✅ **Professional Layout**: Clean table-based design
- ✅ **Responsive Design**: Mobile-friendly interface
- ✅ **Consistent Styling**: Unified across all pages

### **User Experience**
- ✅ **Intuitive Navigation**: Clear menu structure
- ✅ **Visual Feedback**: Loading states, success/error messages
- ✅ **Admin Indicators**: Clear badges and role-based UI
- ✅ **Accessibility**: Proper contrast and readable fonts

---

## 🔧 Technical Implementation

### **Backend (FastAPI)**
- ✅ **Role-Based API**: Different endpoints for users vs admins
- ✅ **JWT Authentication**: Secure token-based sessions
- ✅ **Database Integration**: Supabase with role support
- ✅ **Error Handling**: Graceful error responses
- ✅ **CORS Support**: Frontend-backend communication
- ✅ **Upsert Operations**: Smart update/insert logic for results

### **Frontend (React)**
- ✅ **Role-Aware Components**: Different UI for admins
- ✅ **Session Management**: Secure localStorage handling
- ✅ **API Integration**: Token-based authentication
- ✅ **State Management**: React hooks for data flow
- ✅ **Responsive Design**: Mobile-first approach

### **Database (Supabase)**
- ✅ **User Roles**: `role` field in users table
- ✅ **Predictions**: User-specific prediction storage
- ✅ **Results**: Admin-managed match results
- ✅ **Fixtures**: Premier League fixture data
- ✅ **Leaderboard**: Calculated from predictions and results

---

## 📱 Pages & Features

### **🏠 Home Page**
- ✅ **Welcome Screen**: Clean landing page
- ✅ **Login Prompt**: For unauthenticated users
- ✅ **Action Cards**: Quick access to main features
- ✅ **How It Works**: Scoring system explanation

### **🔮 Predictions Page**
- ✅ **Gameweek Selection**: Choose which week to predict
- ✅ **Fixture Table**: Clean table layout for all matches
- ✅ **Score Inputs**: Easy-to-use number inputs with validation
- ✅ **Admin Override**: Admins can modify existing predictions
- ✅ **Submission Status**: Clear feedback on submission state
- ✅ **Input Validation**: Real-time validation with error display
- ✅ **Range Enforcement**: 0-100 score limits with clear feedback

### **🏆 Leaderboard Page**
- ✅ **Rankings Table**: Professional leaderboard display
- ✅ **Player Details**: Drill-down to see weekly scores
- ✅ **Visual Rankings**: Color-coded position indicators
- ✅ **Scoring System**: Footer with point breakdown

### **📊 Results Page**
- ✅ **Admin Only**: Restricted to admin users
- ✅ **Result Entry**: Input actual match scores with validation
- ✅ **Status Tracking**: Visual indicators for entered vs pending
- ✅ **Admin Management**: Delete/edit existing results
- ✅ **Override Functionality**: Update existing results instead of duplicates
- ✅ **Input Validation**: Real-time validation with error display
- ✅ **Range Enforcement**: 0-100 score limits with clear feedback

### **🔐 Login/Register Page**
- ✅ **User Registration**: Create new accounts
- ✅ **User Login**: Secure authentication
- ✅ **Session Management**: Persistent login state
- ✅ **Role Assignment**: Automatic role assignment

---

## 🛠️ Development

### **Environment Variables**
```bash
# Backend (.env)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Frontend (no env needed)
```

### **Setting Up Credentials**
1. **Create `.env` file** in the `backend/` directory
2. **Add your Supabase credentials**:
   ```
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_KEY=your-supabase-anon-key
   ```
3. **Get credentials from Supabase**:
   - Go to your Supabase project dashboard
   - Settings → API
   - Copy "Project URL" and "anon public" key
4. **Restart the backend server** after adding credentials

**Note**: The `.env` file is in `.gitignore`, so your credentials won't be committed to git.

### **Database Schema**
```sql
-- Users table with role support
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Predictions table
CREATE TABLE predictions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    gameweek INTEGER,
    fixture_id INTEGER,
    predicted_home INTEGER,
    predicted_away INTEGER,
    inserted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Results table
CREATE TABLE results (
    id UUID PRIMARY KEY,
    gameweek INTEGER,
    fixture_id INTEGER,
    actual_home INTEGER,
    actual_away INTEGER,
    inserted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### **API Endpoints**
```
GET    /                    # Health check
GET    /fixtures/          # Get fixtures (filtered by gameweek)
GET    /predictions/       # Get predictions (role-based access)
POST   /predictions/       # Submit prediction (role-based)
DELETE /predictions/{id}   # Delete prediction (admin or owner)
PUT    /predictions/{id}   # Update prediction (admin or owner)
GET    /results/           # Get results (admin only for submit)
POST   /results/           # Submit result (admin only)
DELETE /results/{id}       # Delete result (admin only)
PUT    /results/{id}       # Update result (admin only)
GET    /leaderboard/       # Get leaderboard
POST   /auth/login         # User login
POST   /auth/register      # User registration
GET    /auth/validate      # Validate session
POST   /auth/logout        # User logout
```

---

## 🚀 Deployment Ready

### **Backend Deployment**
- ✅ **Railway/Fly.io**: Ready for deployment
- ✅ **Environment Variables**: Properly configured
- ✅ **CORS Settings**: Frontend communication enabled
- ✅ **Database**: Supabase cloud database

### **Frontend Deployment**
- ✅ **Vercel/Netlify**: Ready for deployment
- ✅ **Build Configuration**: Vite build setup
- ✅ **API Integration**: Backend URL configuration
- ✅ **Static Assets**: Optimized for production

---

## 🔒 Security Features

### **Authentication**
- ✅ **JWT Tokens**: Secure session management
- ✅ **Role-Based Access**: Different permissions per user type
- ✅ **Protected Routes**: Frontend and backend validation
- ✅ **Session Expiration**: Automatic logout after 24 hours
- ✅ **Supabase Auth**: Secure password storage and validation

### **Data Protection**
- ✅ **User Isolation**: Users can only see their own predictions
- ✅ **Admin Controls**: Restricted access to sensitive operations
- ✅ **Input Validation**: Server-side and client-side validation for all inputs
- ✅ **Error Handling**: Secure error responses
- ✅ **Range Enforcement**: 0-100 score limits enforced on frontend and backend

---

## 📈 Future Enhancements

### **Planned Features**
- 🔄 **Real-time Updates**: Live leaderboard updates
- 📧 **Email Notifications**: Gameweek reminders and results
- 📊 **Advanced Analytics**: Detailed prediction statistics
- 🏆 **Season History**: Historical performance tracking
- 👥 **Team Management**: Group-based competitions

### **Technical Improvements**
- 🔄 **WebSocket Integration**: Real-time communication
- 📱 **PWA Support**: Progressive web app features
- 🎨 **Dark Mode**: User preference support
- 🌐 **Internationalization**: Multi-language support

---

## 🤝 Contributing

### **Development Workflow**
1. **Fork** the repository
2. **Create** a feature branch
3. **Implement** your changes
4. **Test** thoroughly
5. **Submit** a pull request

### **Code Standards**
- ✅ **TypeScript**: Frontend type safety
- ✅ **Python**: Backend code quality
- ✅ **ESLint**: Code formatting
- ✅ **Documentation**: Clear code comments

---

## 📞 Support

### **Getting Help**
- 📧 **Email**: Contact the development team
- 📖 **Documentation**: Check this README
- 🐛 **Issues**: Report bugs via GitHub
- 💡 **Feature Requests**: Suggest new features

### **Common Issues**
- **Login Problems**: Check your email/password
- **Admin Access**: Ensure role is set to 'admin'
- **Database Issues**: Verify Supabase connection
- **Frontend Errors**: Check browser console

---

## 📄 License

This project is developed for RNLI internal use. All rights reserved.

---

**🎉 Production Ready!** Your RNLI Premier League Predictor is fully functional with role-based access control, admin override capabilities, secure authentication, and a professional user interface. All features are working and tested!
