import { useLocation, useNavigate } from 'react-router-dom'

const Header = ({ currentUser, setCurrentUser, onLogout }) => {
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    onLogout()
    navigate('/')
  }

  return (
    <header className="nav-header">
      <div className="nav-container">
        <a href="/" className="nav-brand">
          <span style={{ fontSize: '1.5rem' }}>⚓</span>
          <span>RNLI Predictor</span>
        </a>
        
        <nav className="nav-links">
          <a 
            href="/" 
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            Home
          </a>
          
          {/* Only show these tabs when logged in */}
          {currentUser && (
            <>
              <a 
                href="/predictions" 
                className={`nav-link ${location.pathname === '/predictions' ? 'active' : ''}`}
              >
                Predictions
              </a>
              <a 
                href="/leaderboard" 
                className={`nav-link ${location.pathname === '/leaderboard' ? 'active' : ''}`}
              >
                Leaderboard
              </a>
              <a 
                href="/results" 
                className={`nav-link ${location.pathname === '/results' ? 'active' : ''}`}
              >
                Results
              </a>
            </>
          )}
          
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ color: 'var(--rnli-blue)', fontWeight: '600' }}>
                Welcome, {currentUser.username || currentUser}
              </span>
              <button
                onClick={handleLogout}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.875rem' }}
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                console.log('Login button clicked')
                navigate('/login')
              }}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.875rem' }}
            >
              Login
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}

export default Header 