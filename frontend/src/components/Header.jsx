import { useLocation, useNavigate } from 'react-router-dom'

const Header = ({ currentUser, setCurrentUser, onLogout }) => {
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    onLogout()
    navigate('/')
  }

  const isAdmin = currentUser && currentUser.role === 'admin'

  return (
    <header className="nav-header">
      <div className="nav-container">
        <a href="/" className="nav-brand">
          <img 
            src="/lifeboats_logo_2025_master.svg" 
            alt="RNLI Lifeboats" 
            style={{ 
              height: '100%', 
              width: 'auto',
              maxHeight: '3rem',
              objectFit: 'contain'
            }} 
          />
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
              {/* Only show Results tab for admin users */}
              {isAdmin && (
                <a 
                  href="/results" 
                  className={`nav-link ${location.pathname === '/results' ? 'active' : ''}`}
                >
                  Results
                </a>
              )}
            </>
          )}
          
          {currentUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={handleLogout}
                className="btn-logout"
                style={{ padding: '8px 16px', fontSize: '0.875rem' }}
              >
                Logout
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ color: 'var(--rnli-white)', fontWeight: '600' }}>
                  Welcome, {currentUser.username || currentUser}
                </span>
                {isAdmin && (
                  <span className="admin-badge">
                    <span>🔧</span>Admin
                  </span>
                )}
              </div>
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