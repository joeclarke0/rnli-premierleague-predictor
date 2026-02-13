import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiTarget, FiAward, FiTrendingUp, FiUsers, FiCheckCircle, FiStar } from 'react-icons/fi';

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Create an Account',
    desc: 'Sign up in seconds. No fees, no fuss — just you vs your colleagues.',
    icon: <FiUsers className="w-6 h-6" />,
  },
  {
    step: '02',
    title: 'Submit Predictions',
    desc: 'Predict the score of every Premier League fixture before kick-off.',
    icon: <FiTarget className="w-6 h-6" />,
  },
  {
    step: '03',
    title: 'Earn Points',
    desc: '5 points for an exact score, 2 for the correct result. Every game counts.',
    icon: <FiAward className="w-6 h-6" />,
  },
  {
    step: '04',
    title: 'Top the Leaderboard',
    desc: 'Track your rank week-by-week and claim bragging rights at the end of the season.',
    icon: <FiTrendingUp className="w-6 h-6" />,
  },
];

const FEATURES = [
  { icon: '⚽', title: '380 Fixtures', desc: 'Every Premier League match across all 38 gameweeks.' },
  { icon: '📊', title: 'Live Leaderboard', desc: 'See where you stand overall and drill into any gameweek.' },
  { icon: '🏆', title: 'Seasonal Competition', desc: 'Compete from August to May for the top spot.' },
  { icon: '⚡', title: 'Instant Results', desc: 'Points update automatically the moment results are entered.' },
  { icon: '📱', title: 'Any Device', desc: 'Works beautifully on mobile, tablet, and desktop.' },
  { icon: '⚓', title: 'For the RNLI', desc: 'Built with pride by colleagues who support the RNLI mission.' },
];

export default function Home() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="space-y-16">
      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-rnli-blue via-rnli-blue-light to-blue-700 text-white rounded-2xl shadow-2xl px-8 py-16 text-center">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-white opacity-5 rounded-full" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-rnli-yellow opacity-10 rounded-full" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white bg-opacity-15 text-rnli-yellow text-sm font-bold px-4 py-1.5 rounded-full mb-6 tracking-wide uppercase">
            <FiStar className="w-3.5 h-3.5" />
            Premier League 2024/25
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black mb-4 leading-tight">
            ⚓ RNLI Predictor
          </h1>
          <p className="text-lg sm:text-xl text-blue-100 mb-2 max-w-xl mx-auto">
            The Premier League prediction game for RNLI colleagues.
          </p>
          <p className="text-blue-200 text-sm mb-10 max-w-md mx-auto">
            Predict scores, climb the leaderboard, and prove you know football.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            {isAuthenticated() ? (
              <>
                <Link to="/predictions" className="btn-secondary text-base px-8 py-3 shadow-lg">
                  Make Predictions
                </Link>
                <Link to="/dashboard" className="bg-white text-rnli-blue hover:bg-gray-100 font-semibold px-8 py-3 rounded-lg transition-colors duration-200 text-base shadow">
                  My Dashboard
                </Link>
              </>
            ) : (
              <>
                <Link to="/register" className="btn-secondary text-base px-8 py-3 shadow-lg">
                  Get Started — It's Free
                </Link>
                <Link to="/login" className="bg-white text-rnli-blue hover:bg-gray-100 font-semibold px-8 py-3 rounded-lg transition-colors duration-200 text-base shadow">
                  Login
                </Link>
              </>
            )}
          </div>
          {isAuthenticated() && (
            <p className="mt-6 text-blue-200 text-sm">
              Welcome back, <span className="font-semibold text-white">{user?.username}</span>! Ready to predict?
            </p>
          )}
        </div>
      </div>

      {/* ── Scoring System ── */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="card border-t-4 border-green-500 text-center">
          <div className="text-4xl font-black text-green-600 mb-2">5 pts</div>
          <div className="font-bold text-lg mb-1">Exact Score</div>
          <p className="text-sm text-gray-500">Predict both scores perfectly</p>
        </div>
        <div className="card border-t-4 border-blue-400 text-center">
          <div className="text-4xl font-black text-blue-600 mb-2">2 pts</div>
          <div className="font-bold text-lg mb-1">Correct Result</div>
          <p className="text-sm text-gray-500">Get the win, loss, or draw right</p>
        </div>
        <div className="card border-t-4 border-gray-300 text-center">
          <div className="text-4xl font-black text-gray-400 mb-2">0 pts</div>
          <div className="font-bold text-lg mb-1">Incorrect</div>
          <p className="text-sm text-gray-500">Better luck next time!</p>
        </div>
      </div>

      {/* ── How It Works ── */}
      <div>
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-rnli-blue mb-2">How It Works</h2>
          <p className="text-gray-500 max-w-md mx-auto text-sm">
            From sign-up to season champion in four simple steps.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.step} className="card text-center group hover:shadow-lg transition-shadow">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rnli-blue text-white mb-4 mx-auto group-hover:bg-rnli-yellow group-hover:text-gray-900 transition-colors">
                {item.icon}
              </div>
              <div className="text-xs font-bold text-rnli-yellow tracking-widest uppercase mb-2">
                Step {item.step}
              </div>
              <h3 className="font-bold text-rnli-blue mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features Grid ── */}
      <div>
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black text-rnli-blue mb-2">Everything You Need</h2>
          <p className="text-gray-500 max-w-md mx-auto text-sm">
            Built specifically for RNLI colleagues, with all the features to make the season memorable.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="card flex gap-4 items-start hover:shadow-lg transition-shadow">
              <div className="text-3xl flex-shrink-0">{f.icon}</div>
              <div>
                <h3 className="font-bold text-rnli-blue mb-1">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      {!isAuthenticated() && (
        <div className="card bg-gradient-to-r from-rnli-blue to-rnli-blue-light text-white text-center py-12">
          <h2 className="text-3xl font-black mb-3">Ready to Play?</h2>
          <p className="mb-8 text-blue-200 max-w-md mx-auto">
            Join your RNLI colleagues, submit your first predictions, and start climbing the leaderboard.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link to="/register" className="btn-secondary text-base px-8 py-3">
              Create Free Account
            </Link>
            <Link to="/leaderboard" className="bg-white text-rnli-blue hover:bg-gray-100 font-semibold px-8 py-3 rounded-lg transition-colors text-base">
              View Leaderboard
            </Link>
          </div>
          <p className="mt-6 text-xs text-blue-300 flex items-center justify-center gap-1">
            <FiCheckCircle className="w-3 h-3" /> Free to use · No credit card required
          </p>
        </div>
      )}
    </div>
  );
}
