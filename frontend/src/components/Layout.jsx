import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout, isAdmin, isAuthenticated } = useAuth();
  const location = useLocation();

  const isActive = (path) => {
    return location.pathname === path;
  };

  const navLinkClass = (path) => {
    return `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive(path)
        ? 'bg-rnli-blue-light text-white'
        : 'text-white hover:bg-rnli-blue-light hover:text-white'
    }`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="bg-rnli-blue text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <Link to="/" className="flex items-center space-x-3">
              <div className="text-2xl font-bold">
                ⚓
              </div>
              <div>
                <div className="text-xl font-bold">RNLI Predictor</div>
                <div className="text-xs text-rnli-yellow">Premier League 24/25</div>
              </div>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-4">
              <Link to="/" className={navLinkClass('/')}>
                Home
              </Link>
              <Link to="/fixtures" className={navLinkClass('/fixtures')}>
                Fixtures
              </Link>
              {isAuthenticated() && (
                <Link to="/predictions" className={navLinkClass('/predictions')}>
                  Predictions
                </Link>
              )}
              <Link to="/leaderboard" className={navLinkClass('/leaderboard')}>
                Leaderboard
              </Link>
              {isAdmin() && (
                <Link to="/results" className={navLinkClass('/results')}>
                  Results
                </Link>
              )}
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {isAuthenticated() ? (
                <>
                  <span className="text-sm">
                    👋 {user?.username}
                    {isAdmin() && <span className="ml-2 text-rnli-yellow font-semibold">(Admin)</span>}
                  </span>
                  <button
                    onClick={logout}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-white hover:text-rnli-yellow text-sm font-medium transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="bg-rnli-yellow hover:bg-rnli-yellow-dark text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden pb-4 space-y-2">
            <Link to="/" className={`block ${navLinkClass('/')}`}>
              Home
            </Link>
            <Link to="/fixtures" className={`block ${navLinkClass('/fixtures')}`}>
              Fixtures
            </Link>
            {isAuthenticated() && (
              <Link to="/predictions" className={`block ${navLinkClass('/predictions')}`}>
                Predictions
              </Link>
            )}
            <Link to="/leaderboard" className={`block ${navLinkClass('/leaderboard')}`}>
              Leaderboard
            </Link>
            {isAdmin() && (
              <Link to="/results" className={`block ${navLinkClass('/results')}`}>
                Results (Admin)
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-rnli-yellow text-gray-900 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold">
              ⚓ Built with ❤️ by the RNLI Prediction Crew
            </p>
            <p className="text-xs mt-1">
              Supporting the Royal National Lifeboat Institution
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
