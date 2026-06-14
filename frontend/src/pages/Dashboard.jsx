import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { statsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts';
import { FiTarget, FiAward, FiTrendingUp, FiStar, FiCalendar } from 'react-icons/fi';

function StatCard({ icon, label, value, sub, color = 'text-rnli-blue', bg = 'bg-white' }) {
  return (
    <div className={`card ${bg} flex items-center gap-4`}>
      <div className={`p-3 rounded-full bg-gray-100 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className={`text-2xl font-black ${color}`}>{value}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card h-20 bg-gray-100" />
        ))}
      </div>
      <div className="card h-64 bg-gray-100" />
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 shadow-lg rounded-lg p-3 text-sm">
        <p className="font-bold text-rnli-blue mb-1">Gameweek {label}</p>
        <p className="text-gray-700">
          <span className="font-semibold">{payload[0].value}</span> pts
        </p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
      <div className="card bg-red-50 border border-red-200 text-red-700">
        <p>{error}</p>
      </div>
    );
  }

  const rankSuffix = (r) => {
    if (!r) return '—';
    const s = ['th', 'st', 'nd', 'rd'];
    const v = r % 100;
    return r + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const accuracy = stats.accuracy_pct;
  const accuracyColor = accuracy >= 70 ? 'text-green-600' : accuracy >= 40 ? 'text-yellow-600' : 'text-red-500';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-rnli-blue">
            My Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Welcome back, <span className="font-semibold text-gray-700">{user?.username}</span>
          </p>
        </div>
        <Link to="/predictions" className="btn-primary flex items-center gap-2 self-start">
          <FiTarget className="w-4 h-4" />
          Make Predictions
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FiAward className="w-5 h-5" />}
          label="Total Points"
          value={stats.total_points}
          sub={`Rank: ${rankSuffix(stats.current_rank)} of ${stats.total_players}`}
          color="text-rnli-blue"
        />
        <StatCard
          icon={<FiTarget className="w-5 h-5" />}
          label="Accuracy"
          value={`${accuracy}%`}
          sub={`${stats.exact_scores} exact · ${stats.correct_results} correct`}
          color={accuracyColor}
        />
        <StatCard
          icon={<FiStar className="w-5 h-5" />}
          label="Best Week"
          value={stats.best_week_points > 0 ? `${stats.best_week_points} pts` : '—'}
          sub={stats.best_week_num ? `Gameweek ${stats.best_week_num}` : 'No data yet'}
          color="text-rnli-yellow-dark"
        />
        <StatCard
          icon={<FiCalendar className="w-5 h-5" />}
          label="Predictions Made"
          value={stats.total_predictions}
          sub={`${stats.predictions_scored} scored`}
          color="text-gray-700"
        />
      </div>

      {/* Points Progression Chart */}
      {stats.weekly_progression.length > 0 ? (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-rnli-blue">Points Progression</h2>
              <p className="text-xs text-gray-500">Your points per gameweek</p>
            </div>
            <FiTrendingUp className="w-5 h-5 text-rnli-blue" />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={stats.weekly_progression} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="pointsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#003087" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#003087" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="week"
                tickFormatter={(v) => `GW${v}`}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="points"
                stroke="#003087"
                strokeWidth={2.5}
                fill="url(#pointsGradient)"
                dot={{ fill: '#003087', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: '#FFB81C' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">📊</div>
          <h3 className="font-bold text-gray-700 mb-1">No data yet</h3>
          <p className="text-gray-400 text-sm mb-6">
            Make predictions and check back once results are entered.
          </p>
          <Link to="/predictions" className="btn-primary inline-flex items-center gap-2">
            <FiTarget className="w-4 h-4" />
            Start Predicting
          </Link>
        </div>
      )}

      {/* Prediction Breakdown */}
      {stats.predictions_scored > 0 && (
        <div className="card">
          <h2 className="text-lg font-bold text-rnli-blue mb-4">Prediction Breakdown</h2>
          <div className="space-y-3">
            {[
              { label: 'Exact Scores (5 pts)', count: stats.exact_scores, color: 'bg-green-500', pts: 5 },
              { label: 'Correct Results (2 pts)', count: stats.correct_results, color: 'bg-blue-400', pts: 2 },
              { label: 'Wrong Predictions (0 pts)', count: stats.wrong_predictions, color: 'bg-gray-200', pts: 0 },
            ].map((item) => {
              const pct = stats.predictions_scored > 0
                ? Math.round((item.count / stats.predictions_scored) * 100)
                : 0;
              return (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{item.label}</span>
                    <span className="text-gray-500">{item.count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div
                      className={`${item.color} h-2.5 rounded-full transition-all duration-700`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
