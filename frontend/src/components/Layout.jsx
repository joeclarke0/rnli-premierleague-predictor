import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { FiMenu, FiX, FiLogOut, FiUser, FiSun, FiMoon } from 'react-icons/fi';

export default function Layout({ children }) {
  const { user, logout, isAdmin, isAuthenticated } = useAuth();
  const { seasonName } = useSettings();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // default dark
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const isActive = (path) => location.pathname === path;

  const navLinkClass = (path) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive(path)
        ? 'bg-rnli-blue-light text-white'
        : 'text-white hover:bg-rnli-blue-light hover:text-white'
    }`;

  const mobileNavLinkClass = (path) =>
    `block px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
      isActive(path)
        ? 'bg-rnli-blue-light text-white'
        : 'text-white hover:bg-rnli-blue-light'
    }`;

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/fixtures', label: 'Fixtures' },
    ...(isAuthenticated() ? [{ to: '/predictions', label: 'Predictions' }] : []),
    { to: '/leaderboard', label: 'Leaderboard' },
    ...(isAuthenticated() ? [{ to: '/dashboard', label: 'Dashboard' }] : []),
    ...(isAdmin() ? [{ to: '/results', label: 'Results' }] : []),
    ...(isAdmin() ? [{ to: '/admin', label: 'Admin Panel' }] : []),
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar */}
      <nav className="bg-rnli-blue text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 flex-shrink-0">
              <img src="/Lifeboats Logo_2025_Blue Text_RGB_MASTER.png" alt="RNLI" className="h-8 w-auto" />
              <div>
                <div className="text-lg font-bold leading-tight">RNLI Premier League</div>
                <div className="text-[10px] text-rnli-yellow leading-tight">{seasonName}</div>
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-1">
              {navLinks.map((link) => (
                <Link key={link.to} to={link.to} className={navLinkClass(link.to)}>
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Desktop User Menu */}
            <div className="hidden md:flex items-center space-x-3">
              {/* Dark / Light toggle */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg bg-white bg-opacity-10 hover:bg-opacity-20 text-white transition-colors"
                aria-label="Toggle dark mode"
              >
                {darkMode ? <FiSun className="w-4 h-4" /> : <FiMoon className="w-4 h-4" />}
              </button>
              {isAuthenticated() ? (
                <>
                  <div className="flex items-center gap-2 text-sm">
                    <FiUser className="w-4 h-4 text-rnli-yellow" />
                    <span>{user?.username}</span>
                    {isAdmin() && (
                      <span className="text-[10px] bg-rnli-yellow text-gray-900 font-bold px-1.5 py-0.5 rounded">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <button
                    onClick={logout}
                    className="flex items-center gap-1.5 bg-white bg-opacity-15 hover:bg-opacity-25 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    <FiLogOut className="w-3.5 h-3.5" />
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-white hover:text-rnli-yellow text-sm font-medium transition-colors">
                    Login
                  </Link>
                  <Link to="/register" className="bg-rnli-yellow hover:bg-rnli-yellow-dark text-gray-900 px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors">
                    Sign Up
                  </Link>
                </>
              )}
            </div>

            {/* Mobile: theme toggle + hamburger */}
            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className="p-2 rounded-lg bg-white bg-opacity-10 hover:bg-opacity-20 text-white transition-colors"
                aria-label="Toggle dark mode"
              >
                {darkMode ? <FiSun className="w-4 h-4" /> : <FiMoon className="w-4 h-4" />}
              </button>
              <button
                className="p-2 rounded-lg hover:bg-rnli-blue-light transition-colors"
                onClick={() => setMobileOpen(!mobileOpen)}
                aria-label="Toggle menu"
              >
                {mobileOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          {mobileOpen && (
            <div className="md:hidden pb-4 pt-2 border-t border-rnli-blue-light space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={mobileNavLinkClass(link.to)}
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-2 border-t border-rnli-blue-light mt-2">
                {isAuthenticated() ? (
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-sm text-blue-200">{user?.username}</span>
                    <button
                      onClick={() => { logout(); setMobileOpen(false); }}
                      className="flex items-center gap-1.5 text-sm text-white hover:text-rnli-yellow transition-colors"
                    >
                      <FiLogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-3 px-3 py-2">
                    <Link
                      to="/login"
                      className="text-sm text-white hover:text-rnli-yellow"
                      onClick={() => setMobileOpen(false)}
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      className="text-sm bg-rnli-yellow text-gray-900 px-3 py-1 rounded-lg font-semibold"
                      onClick={() => setMobileOpen(false)}
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-rnli-blue text-white py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/Lifeboats Logo_2025_Blue Text_RGB_MASTER.png" alt="RNLI" className="h-7 w-auto" />
              <div>
                <p className="font-bold text-sm">RNLI Premier League</p>
                <p className="text-xs text-blue-300">{seasonName}</p>
              </div>
            </div>
            <div className="flex gap-6 text-xs text-blue-300">
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
              <Link to="/fixtures" className="hover:text-white transition-colors">Fixtures</Link>
              <Link to="/leaderboard" className="hover:text-white transition-colors">Leaderboard</Link>
            </div>
            <p className="text-xs text-blue-300">
              Supporting the Royal National Lifeboat Institution ⚓
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
