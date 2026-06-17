import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { FiEye, FiEyeOff, FiLogIn, FiAlertCircle } from 'react-icons/fi';

export default function Login() {
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  useEffect(() => {
    if (isAuthenticated) navigate('/predictions');
    if (location.state?.message) toast.success(location.state.message);
  }, [isAuthenticated, navigate, location.state]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    if (result.success) {
      toast.success('Welcome back!');
      navigate('/predictions');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="lgn-wrap">
      <div className="lgn-card">
        {/* ── Navy header ── */}
        <div className="lgn-header">
          <span className="lgn-goldbar" aria-hidden="true" />
          <span className="lgn-kicker">RNLI Premier League</span>
          <h1 className="lgn-title mt-2">Welcome Back</h1>
          <p className="lgn-sub">Sign in to make your predictions</p>
        </div>

        {/* ── Form section ── */}
        <div className="lgn-body">
          {error && (
            <div className="lgn-error">
              <FiAlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="lgn-label">Email Address</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="lgn-input"
                required
                autoComplete="email"
                placeholder="you@rnli.org"
              />
            </div>

            <div>
              <label htmlFor="password" className="lgn-label">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="lgn-input pr-11"
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="lgn-submit"
            >
              {loading ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-2 border-[#003087]/30 border-t-[#003087]" />Signing in…</>
              ) : (
                <><FiLogIn className="w-4 h-4" />Sign In</>
              )}
            </button>
          </form>

          {/* Invite-only note */}
          <p className="lgn-invite-note">
            This is an invite-only competition. Contact an admin if you need access.
          </p>

          {/* Dev accounts */}
          {import.meta.env.DEV && (
            <div className="lgn-dev-panel">
              <p className="lgn-dev-title">Demo Accounts</p>
              <p className="lgn-dev-row">
                <span className="lgn-dev-role">Admin</span>
                <code>admin@rnli.org</code>
                <span className="lgn-dev-sep">/</span>
                <code>changeme123</code>
              </p>
              <p className="lgn-dev-row">
                <span className="lgn-dev-role">User</span>
                <code>joe@test.com</code>
                <span className="lgn-dev-sep">/</span>
                <code>test123</code>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
