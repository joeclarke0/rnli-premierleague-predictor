import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import Login from './pages/Login'
import Predictions from './pages/Predictions'
import Leaderboard from './pages/Leaderboard'
import Results from './pages/Results'
import Admin from './pages/Admin'
import sessionManager from './utils/session'
import api from './services/api'

// Protected Route component
const ProtectedRoute = ({ children, currentUser }) => {
  console.log('🛡️ ProtectedRoute check:', { 
    currentUser: !!currentUser, 
    path: window.location.pathname,
    userDetails: currentUser ? { id: currentUser.id, username: currentUser.username } : null
  })
  
  if (!currentUser) {
    console.log('🚫 Redirecting to login - no currentUser')
    return <Navigate to="/login" replace />
  }
  
  console.log('✅ ProtectedRoute passed - user authenticated:', currentUser.username)
  return children
}

// Admin Protected Route component
const AdminProtectedRoute = ({ children, currentUser }) => {
  console.log('🔧 AdminProtectedRoute check:', { 
    currentUser: !!currentUser, 
    isAdmin: currentUser?.role === 'admin',
    path: window.location.pathname,
    userDetails: currentUser ? { id: currentUser.id, username: currentUser.username, role: currentUser.role } : null
  })
  
  if (!currentUser) {
    console.log('🚫 Redirecting to login - no currentUser')
    return <Navigate to="/login" replace />
  }
  
  if (currentUser.role !== 'admin') {
    console.log('🚫 Redirecting to home - user is not admin')
    return <Navigate to="/" replace />
  }
  
  console.log('✅ AdminProtectedRoute passed - user is admin:', currentUser.username)
  return children
}

function App() {
  const [currentUser, setCurrentUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  // Check for existing session on app load
  useEffect(() => {
    const initializeSession = async () => {
      console.log('🔍 Initializing session...')
      try {
        const session = sessionManager.getSession()
        console.log('📋 Session found:', !!session)
        
        if (session) {
          console.log('🔐 Validating session with backend...')
          // Validate session with backend
          try {
            const response = await api.validateSession(session.token)
            console.log('✅ Backend validation response:', response.valid)
            if (response.valid) {
              console.log('👤 Setting current user:', response.user.username)
              setCurrentUser(response.user)
            } else {
              console.log('❌ Session invalid, clearing...')
              sessionManager.clearSession()
              setCurrentUser(null)
            }
          } catch (error) {
            console.error('❌ Session validation failed:', error)
            // Only clear session on actual 401 errors, not network issues
            if (error.message && error.message.includes('401')) {
              console.log('🚫 Unauthorized, clearing session...')
              sessionManager.clearSession()
              setCurrentUser(null)
            } else {
              // For network errors, use local session data as fallback
              console.log('🌐 Network error during validation, using local session...')
              setCurrentUser(session.user)
            }
          }
        } else {
          console.log('📭 No session found')
        }
      } catch (error) {
        console.error('❌ Error initializing session:', error)
        // Don't clear session on general errors
      } finally {
        console.log('🏁 Session initialization complete')
        setIsLoading(false)
      }
    }

    initializeSession()
  }, [])

  // Set up session expiration check - but don't validate with backend on every check
  useEffect(() => {
    const checkSessionExpiration = () => {
      const session = sessionManager.getSession()
      if (!session) {
        console.log('📭 No session found during expiration check')
        setCurrentUser(null)
        return
      }

      if (sessionManager.isSessionExpiringSoon()) {
        console.log('⏰ Session expiring soon, refreshing...')
        sessionManager.refreshSession()
      }
    }

    // Check every minute
    const interval = setInterval(checkSessionExpiration, 60000)
    
    return () => clearInterval(interval)
  }, [])

  const handleLogout = () => {
    sessionManager.clearSession()
    setCurrentUser(null)
  }

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="loading-spinner"></div>
      </div>
    )
  }
  
  return (
    <Router>
      <div style={{ minHeight: '100vh' }}>
        <Header currentUser={currentUser} setCurrentUser={setCurrentUser} onLogout={handleLogout} />
        <main className="main-container">
          <Routes>
            <Route path="/" element={<Home currentUser={currentUser} />} />
            <Route path="/login" element={<Login setCurrentUser={setCurrentUser} />} />
            <Route 
              path="/predictions" 
              element={
                <ProtectedRoute currentUser={currentUser}>
                  <Predictions currentUser={currentUser} />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/leaderboard" 
              element={
                <ProtectedRoute currentUser={currentUser}>
                  <Leaderboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/results" 
              element={
                <AdminProtectedRoute currentUser={currentUser}>
                  <Results currentUser={currentUser} />
                </AdminProtectedRoute>
              } 
            />
            <Route 
              path="/admin" 
              element={
                <AdminProtectedRoute currentUser={currentUser}>
                  <Admin currentUser={currentUser} />
                </AdminProtectedRoute>
              } 
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  )
}

export default App 