import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { statsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { FiTarget, FiAward, FiTrendingUp, FiStar, FiCalendar, FiArrowRight } from 'react-icons/fi';

/* ── Rank suffix (unchanged) ── */
function rankSuffix(r) {
  if (!r) return '—';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = r % 100;
  return r + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* ── Stat tile ── */
function StatTile({ icon, label, value, sub, accent = 'gold' }) {
  const accentCls = accent === 'gold' ? 'db-tile-icon--gold'
                  : accent === 'green' ? 'db-tile-icon--green'
                  : accent === 'red'   ? 'db-tile-icon--red'
                  : 'db-tile-icon--navy';
  return (
    <div className="db-tile">
      <div className={`db-tile-icon ${accentCls}`}>{icon}</div>
      <div className="mt-3">
        <p className="db-tile-label">{label}</p>
        <p className="db-tile-value">{value}</p>
        {sub && <p className="db-tile-sub">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Recharts custom tooltip ── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="db-tooltip">
      <p className="db-tooltip-gw">Gameweek {label}</p>
      <p className="db-tooltip-pts">{payload[0].value} <span>pts</span></p>
    </div>
  );
};

/* ── Skeleton ── */
function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="db-banner" style={{ minHeight: '7.5rem' }} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="db-tile" style={{ minHeight: '6.5rem' }} />
        ))}
      </div>
      <div className="db-panel" style={{ height: '22rem' }} />
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function Dashboard() {
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    statsAPI.getMyStats()
      .then((res) => setStats(res.data))
      .catch(() => setError('Failed to load your stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div className="db-error">
        <p>{error}</p>
      </div>
    );
  }

  const accuracy = stats.accuracy_pct;
  const accuracyAccent = accuracy >= 70 ? 'green' : accuracy >= 40 ? 'gold' : 'red';

  return (
    <div className="space-y-6">
      {/* ── Header banner ── */}
      <div className="db-banner">
        <span className="db-goldbar" aria-hidden="true" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <span className="db-kicker">Personal Stats</span>
            <h1 className="db-title mt-2">My Dashboard</h1>
            <p className="db-welcome mt-2">
              Welcome back, <strong className="db-username">{user?.username}</strong>
            </p>
          </div>
          <Link to="/predictions" className="db-cta-btn self-start sm:self-auto">
            <FiTarget className="w-4 h-4 shrink-0" />
            Make Predictions
            <FiArrowRight className="w-3.5 h-3.5 shrink-0 opacity-70" />
          </Link>
        </div>
      </div>

      {/* ── Stat tiles ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatTile
          icon={<FiAward className="w-5 h-5" />}
          label="Total Points"
          value={stats.total_points}
          sub={`${rankSuffix(stats.current_rank)} of ${stats.total_players} players`}
          accent="navy"
        />
        <StatTile
          icon={<FiTarget className="w-5 h-5" />}
          label="Accuracy"
          value={`${accuracy}%`}
          sub={`${stats.exact_scores} exact · ${stats.correct_results} correct`}
          accent={accuracyAccent}
        />
        <StatTile
          icon={<FiStar className="w-5 h-5" />}
          label="Best Week"
          value={stats.best_week_points > 0 ? `${stats.best_week_points} pts` : '—'}
          sub={stats.best_week_num ? `Gameweek ${stats.best_week_num}` : 'No data yet'}
          accent="gold"
        />
        <StatTile
          icon={<FiCalendar className="w-5 h-5" />}
          label="Predictions Made"
          value={stats.total_predictions}
          sub={`${stats.predictions_scored} scored`}
          accent="navy"
        />
      </div>

      {/* ── Points chart ── */}
      {stats.weekly_progression.length > 0 ? (
        <div className="db-panel">
          <div className="flex items-start justify-between mb-6 gap-3">
            <div>
              <p className="db-panel-kicker">Season Overview</p>
              <h2 className="db-panel-title">Points Progression</h2>
            </div>
            <div className="db-trend-badge">
              <FiTrendingUp className="w-3.5 h-3.5" />
              <span>Per Gameweek</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={stats.weekly_progression} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="dbPointsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#FFB81C" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#FFB81C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="week"
                tickFormatter={(v) => `GW${v}`}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="points"
                stroke="#FFB81C"
                strokeWidth={2.5}
                fill="url(#dbPointsGradient)"
                dot={{ fill: '#FFB81C', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: '#fff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="db-panel db-panel--empty">
          <span className="text-4xl block mb-3 opacity-30">📊</span>
          <h3 className="db-panel-title mb-1">No data yet</h3>
          <p className="db-panel-sub mb-6">
            Make predictions and check back once results are in.
          </p>
          <Link to="/predictions" className="db-cta-btn">
            <FiTarget className="w-4 h-4" />
            Start Predicting
          </Link>
        </div>
      )}

      {/* ── Prediction breakdown ── */}
      {stats.predictions_scored > 0 && (
        <div className="db-panel">
          <div className="mb-5">
            <p className="db-panel-kicker">How You're Scoring</p>
            <h2 className="db-panel-title">Prediction Breakdown</h2>
          </div>
          <div className="space-y-5">
            {[
              { label: 'Exact Score', pts: '5 pts each', count: stats.exact_scores,      color: 'db-bar--green', badge: 'db-badge--green' },
              { label: 'Correct Result', pts: '2 pts each', count: stats.correct_results, color: 'db-bar--blue',  badge: 'db-badge--blue'  },
              { label: 'Wrong',          pts: '0 pts',      count: stats.wrong_predictions, color: 'db-bar--gray', badge: 'db-badge--gray'  },
            ].map((item) => {
              const pct = stats.predictions_scored > 0
                ? Math.round((item.count / stats.predictions_scored) * 100)
                : 0;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <div className="flex items-center gap-2">
                      <span className="db-breakdown-label">{item.label}</span>
                      <span className="db-breakdown-pts">{item.pts}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`db-badge ${item.badge}`}>{item.count}</span>
                      <span className="db-breakdown-pct">{pct}%</span>
                    </div>
                  </div>
                  <div className="db-bar-track">
                    <div
                      className={`db-bar ${item.color}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scoring key */}
          <div className="db-scoring-key mt-6">
            <span className="db-scoring-chip db-scoring-chip--gold">5 pts — Exact score</span>
            <span className="db-scoring-chip db-scoring-chip--blue">2 pts — Correct result</span>
            <span className="db-scoring-chip db-scoring-chip--gray">0 pts — Wrong</span>
          </div>
        </div>
      )}
    </div>
  );
}
