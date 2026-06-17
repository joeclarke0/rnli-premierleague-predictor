import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import {
  FiTarget,
  FiAward,
  FiTrendingUp,
  FiUsers,
  FiCheckCircle,
  FiArrowRight,
  FiZap,
} from 'react-icons/fi';

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Get Invited',
    desc: 'Join via an invite link from an admin — then you\'re in and ready to play.',
    icon: <FiUsers className="w-5 h-5" />,
  },
  {
    step: '02',
    title: 'Call The Scores',
    desc: 'Predict the scoreline of every Premier League fixture before kick-off.',
    icon: <FiTarget className="w-5 h-5" />,
  },
  {
    step: '03',
    title: 'Bank The Points',
    desc: '5 for an exact score, 2 for the right result. Every match on the card counts.',
    icon: <FiAward className="w-5 h-5" />,
  },
  {
    step: '04',
    title: 'Top The Table',
    desc: 'Track your rank week by week and claim the bragging rights come May.',
    icon: <FiTrendingUp className="w-5 h-5" />,
  },
];

const FEATURES = [
  { icon: '⚽', title: '380 Fixtures', desc: 'Every Premier League match across all 38 gameweeks.' },
  { icon: '📊', title: 'Live Leaderboard', desc: 'See where you stand overall and drill into any gameweek.' },
  { icon: '🏆', title: 'Season-Long', desc: 'Compete from the August kick-off to the final whistle in May.' },
  { icon: '⚡', title: 'Instant Scoring', desc: 'Points update the moment results are entered. No waiting.' },
  { icon: '📱', title: 'Any Device', desc: 'Plays beautifully on mobile, tablet and desktop.' },
  { icon: '⚓', title: 'For the RNLI', desc: 'Built with pride by colleagues who back the RNLI mission.' },
];

function HeroWaves() {
  return (
    <>
      <div className="home-wave home-wave--back" aria-hidden="true">
        <svg viewBox="0 0 1440 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0,40 C180,80 360,0 540,30 C720,60 900,10 1080,35 C1260,60 1380,30 1440,40 L1440,90 L0,90 Z"
            fill="#FFB81C"
          />
        </svg>
      </div>
      <div className="home-wave home-wave--front" aria-hidden="true">
        <svg viewBox="0 0 1440 90" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0,55 C200,20 380,75 560,50 C760,22 940,72 1140,48 C1300,28 1390,55 1440,50 L1440,90 L0,90 Z"
            fill="#1a4a9f"
          />
        </svg>
      </div>
    </>
  );
}

export default function Home() {
  const { isAuthenticated, user } = useAuth();
  const { seasonName } = useSettings();

  return (
    <div className="space-y-12 sm:space-y-20">
      {/* ── Hero ── */}
      <section className="home-hero px-6 sm:px-10 lg:px-14 pt-8 sm:pt-16 pb-24 sm:pb-32">
        <div className="relative z-10 grid lg:grid-cols-12 gap-10 items-center">
          {/* Left: editorial copy */}
          <div className="lg:col-span-7">
            <div className="home-season-pill mb-6">
              <span className="dot" />
              Premier League · {seasonName}
            </div>

            <h1 className="home-hook text-5xl sm:text-6xl lg:text-7xl mb-6">
              <span className="block">PREDICT.</span>
              <span className="block gold">COMPETE.</span>
              <span className="block outline">CONQUER.</span>
            </h1>

            <p className="text-lg sm:text-xl text-blue-100 max-w-xl mb-2">
              The Premier League prediction game built for RNLI colleagues.
            </p>
            <p className="text-blue-200/80 text-sm max-w-md mb-9">
              Call every scoreline, climb the leaderboard, and prove — week after week — that
              you really do know your football.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              {isAuthenticated ? (
                <>
                  <Link to="/predictions" className="btn-gold btn-gold--pulse text-base px-7 py-3.5">
                    Make Predictions <FiArrowRight className="w-4 h-4" />
                  </Link>
                  <Link to="/dashboard" className="btn-ghost-light text-base px-7 py-3.5">
                    My Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn-gold btn-gold--pulse text-base px-7 py-3.5">
                    Login to Play <FiArrowRight className="w-4 h-4" />
                  </Link>
                  <Link to="/leaderboard" className="btn-ghost-light text-base px-7 py-3.5">
                    View Leaderboard
                  </Link>
                </>
              )}
            </div>

            {isAuthenticated && (
              <p className="mt-6 text-blue-200 text-sm">
                Welcome back,{' '}
                <span className="font-bold text-white">{user?.username}</span>. The card's
                waiting — make your calls.
              </p>
            )}
          </div>

          {/* Right: stats card */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-sm">
              <div className="relative rounded-2xl bg-white/95 px-6 py-8 sm:px-8 sm:py-10 shadow-2xl">
                <div
                  className="absolute -top-3 left-6 px-3 py-1 rounded-md text-[0.65rem] font-extrabold tracking-widest uppercase text-rnli-blue-dark"
                  style={{ background: '#FFB81C' }}
                >
                  The Season
                </div>
                <div className="grid grid-cols-3 text-center divide-x divide-gray-200">
                  <div className="px-2">
                    <div className="text-2xl font-black text-rnli-blue leading-none">38</div>
                    <div className="text-[0.62rem] font-bold uppercase tracking-wider text-gray-500 mt-1">
                      Gameweeks
                    </div>
                  </div>
                  <div className="px-2">
                    <div className="text-2xl font-black text-rnli-blue leading-none">380</div>
                    <div className="text-[0.62rem] font-bold uppercase tracking-wider text-gray-500 mt-1">
                      Fixtures
                    </div>
                  </div>
                  <div className="px-2">
                    <div className="text-2xl font-black text-rnli-blue leading-none">£0</div>
                    <div className="text-[0.62rem] font-bold uppercase tracking-wider text-gray-500 mt-1">
                      To Play
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <HeroWaves />
      </section>

      {/* ── Scoring scoreboard ── */}
      <section>
        <div className="flex items-end justify-between gap-4 mb-6 flex-wrap">
          <div>
            <span className="home-kicker">The Scoring</span>
            <h2 className="home-section-title text-3xl sm:text-4xl mt-3">
              How points are won
            </h2>
          </div>
          <p className="text-sm text-gray-500 max-w-xs">
            Same rules for everyone. Nail the exact scoreline and you bank the lot.
          </p>
        </div>

        <div className="home-scoreboard grid grid-cols-1 sm:grid-cols-3">
          <div className="home-score-cell">
            <div className="home-score-num is-gold">5</div>
            <div className="home-score-label">Exact Score</div>
            <div className="home-score-sub">Both scorelines spot on</div>
          </div>
          <div className="home-score-cell">
            <div className="home-score-num is-blue">2</div>
            <div className="home-score-label">Correct Result</div>
            <div className="home-score-sub">Win, draw or loss called right</div>
          </div>
          <div className="home-score-cell">
            <div className="home-score-num is-mute">0</div>
            <div className="home-score-label">Missed It</div>
            <div className="home-score-sub">There's always next week</div>
          </div>
        </div>
      </section>

      {/* ── How it works — match programme ── */}
      <section>
        <div className="text-center mb-10">
          <span className="home-kicker">The Programme</span>
          <h2 className="home-section-title text-3xl sm:text-4xl mt-3">
            From kick-off to champion
          </h2>
          <p className="text-gray-500 max-w-md mx-auto text-sm mt-3">
            Four moves between getting your invite and lifting the bragging rights.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.step} className="home-step">
              <span className="home-step-bar" />
              <div className="flex items-start justify-between mb-4">
                <span className="home-step-num">{item.step}</span>
                <span
                  className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-white"
                  style={{ background: '#003087' }}
                >
                  {item.icon}
                </span>
              </div>
              <h3 className="font-extrabold text-lg mb-1.5 home-section-title">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section>
        <div className="text-center mb-10">
          <span className="home-kicker">The Squad Sheet</span>
          <h2 className="home-section-title text-3xl sm:text-4xl mt-3">
            Everything you need
          </h2>
          <p className="text-gray-500 max-w-md mx-auto text-sm mt-3">
            Built specifically for RNLI colleagues to make the season one to remember.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f) => (
            <div key={f.title} className="home-feature">
              <div className="home-feature-ic">{f.icon}</div>
              <div>
                <h3 className="font-extrabold mb-1 home-section-title">{f.title}</h3>
                <p className="text-sm text-gray-500">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Bottom CTA band ── */}
      {!isAuthenticated && (
        <section className="home-cta-band px-6 sm:px-12 py-10 sm:py-14">
          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 text-rnli-yellow font-extrabold text-xs uppercase tracking-widest mb-4">
              <FiZap className="w-4 h-4" />
              Invite only
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight mb-4">
              Got your invite?
              <br className="hidden sm:block" /> Let's go.
            </h2>
            <p className="text-blue-100 max-w-md mb-8">
              Log in to join your RNLI colleagues, submit your predictions, and start climbing
              the leaderboard.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/login" className="btn-gold btn-gold--pulse text-base px-7 py-3.5">
                Login to Play <FiArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/leaderboard" className="btn-ghost-light text-base px-7 py-3.5">
                View Leaderboard
              </Link>
            </div>
            <p className="mt-6 text-xs text-blue-200 flex items-center gap-1.5">
              <FiCheckCircle className="w-3.5 h-3.5" /> Invite-only · No sign-up required
            </p>
          </div>
        </section>
      )}
    </div>
  );
}
