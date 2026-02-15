import { useEffect, useState } from "react";
import { leaderboardAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

const VIEWS = {
  OVERALL: "overall",
  GAMEWEEK: "gameweek",
};

// Colour a score value based on points
function ScoreBadge({ score }) {
  if (score === 5)
    return (
      <span className="inline-block w-7 h-7 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">
        5
      </span>
    );
  if (score === 2)
    return (
      <span className="inline-block w-7 h-7 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center">
        2
      </span>
    );
  return (
    <span className="inline-block w-7 h-7 rounded-full bg-gray-100 text-gray-400 text-xs flex items-center justify-center">
      0
    </span>
  );
}

// Sparkline — last 5 played gameweeks as coloured dots
function RecentForm({ playerRow, maxWeek }) {
  const weeks = [];
  for (let w = maxWeek; w >= 1 && weeks.length < 5; w--) {
    const s = playerRow[`week_${w}`];
    if (s !== undefined) weeks.unshift({ w, s });
  }
  if (weeks.length === 0) return <span className="text-gray-400 text-xs">No data</span>;
  return (
    <div className="flex gap-1 items-center">
      {weeks.map(({ w, s }) => (
        <span
          key={w}
          title={`GW${w}: ${s} pts`}
          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
            ${s === 5 ? "bg-green-500 text-white" : s === 2 ? "bg-blue-400 text-white" : "bg-gray-200 text-gray-500"}`}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState(VIEWS.OVERALL);
  const [selectedGameweek, setSelectedGameweek] = useState(1);
  const { user } = useAuth();

  useEffect(() => {
    leaderboardAPI
      .get()
      .then((res) => setLeaderboard(res.data.leaderboard))
      .catch(() => setError("Failed to load leaderboard"))
      .finally(() => setLoading(false));
  }, []);

  // Highest gameweek that has any non-zero score
  const maxWeekPlayed = (() => {
    for (let w = 38; w >= 1; w--) {
      if (leaderboard.some((r) => r[`week_${w}`] > 0)) return w;
    }
    return 1;
  })();

  // Gameweek view: re-rank players by selected week
  const gameweekRanked = [...leaderboard]
    .map((r) => ({ ...r, gwScore: r[`week_${selectedGameweek}`] || 0 }))
    .sort((a, b) => b.gwScore - a.gwScore)
    .map((r, i) => ({ ...r, gwRank: i + 1 }));

  if (loading)
    return (
      <div className="text-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rnli-blue mx-auto" />
        <p className="mt-4 text-gray-500">Loading leaderboard…</p>
      </div>
    );

  if (error)
    return (
      <div className="card bg-red-50 text-red-700">
        <p>{error}</p>
      </div>
    );

  const top3 = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-rnli-blue">🏆 Leaderboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            {leaderboard.length} players · {maxWeekPlayed} gameweek
            {maxWeekPlayed !== 1 ? "s" : ""} played
          </p>
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 self-start sm:self-auto">
          <button
            onClick={() => setView(VIEWS.OVERALL)}
            className={`px-5 py-2 text-sm font-semibold transition-colors ${
              view === VIEWS.OVERALL
                ? "bg-rnli-blue text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            Overall
          </button>
          <button
            onClick={() => setView(VIEWS.GAMEWEEK)}
            className={`px-5 py-2 text-sm font-semibold transition-colors border-l border-gray-200 ${
              view === VIEWS.GAMEWEEK
                ? "bg-rnli-blue text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            By Gameweek
          </button>
        </div>
      </div>

      {/* ── Scoring legend ── */}
      <div className="flex flex-wrap gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-green-500 inline-block" />
          <strong>5 pts</strong> — Exact score
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-blue-400 inline-block" />
          <strong>2 pts</strong> — Correct result
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full bg-gray-200 inline-block" />
          <strong>0 pts</strong> — Incorrect
        </span>
      </div>

      {leaderboard.length === 0 ? (
        <div className="card text-center py-16 text-gray-500">
          No data yet — start predicting to see scores!
        </div>
      ) : view === VIEWS.OVERALL ? (
        <OverallView
          top3={top3}
          rest={rest}
          leaderboard={leaderboard}
          maxWeekPlayed={maxWeekPlayed}
          currentUser={user}
        />
      ) : (
        <GameweekView
          gameweekRanked={gameweekRanked}
          selectedGameweek={selectedGameweek}
          setSelectedGameweek={setSelectedGameweek}
          maxWeekPlayed={maxWeekPlayed}
          currentUser={user}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   OVERALL VIEW
═══════════════════════════════════════════ */
const CHART_COLORS = ["#003087","#FFB81C","#ef4444","#22c55e","#8b5cf6","#f97316","#06b6d4","#ec4899","#84cc16","#f59e0b"];

function OverallView({ top3, rest, leaderboard, maxWeekPlayed, currentUser }) {
  // Build chart data: one entry per week with each player's cumulative points
  const chartData = [];
  for (let w = 1; w <= maxWeekPlayed; w++) {
    const entry = { week: w };
    leaderboard.forEach((row) => {
      // Cumulative sum up to week w
      let cum = 0;
      for (let i = 1; i <= w; i++) cum += row[`week_${i}`] || 0;
      entry[row.player] = cum;
    });
    chartData.push(entry);
  }

  // Podium order: 2nd, 1st, 3rd
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumHeights = ["h-24", "h-32", "h-20"];
  const podiumLabels = ["2nd", "1st", "3rd"];
  const podiumColors = ["bg-gray-200", "bg-rnli-yellow", "bg-orange-200"];
  const podiumTextColors = ["text-gray-600", "text-gray-900", "text-orange-700"];
  const medals = ["🥈", "🥇", "🥉"];

  return (
    <div className="space-y-6">
      {/* ── Top 3 Podium ── */}
      {top3.length >= 1 && (
        <div className="card">
          <h2 className="text-lg font-bold text-rnli-blue mb-6 text-center">Top 3</h2>
          <div className="flex items-end justify-center gap-4">
            {podium.map((player, idx) => (
              <div key={player.player} className="flex flex-col items-center gap-2 w-28">
                <span className="text-3xl">{medals[idx]}</span>
                <p
                  className={`text-sm font-bold text-center truncate w-full text-center ${
                    currentUser?.username === player.player ? "text-rnli-blue" : ""
                  }`}
                >
                  {player.player}
                  {currentUser?.username === player.player && (
                    <span className="block text-xs text-rnli-blue font-normal">(You)</span>
                  )}
                </p>
                <p className="text-xl font-bold">{player.total} <span className="text-sm font-normal text-gray-500">pts</span></p>
                <div
                  className={`w-full rounded-t-lg ${podiumColors[idx]} ${podiumHeights[idx]} flex items-center justify-center`}
                >
                  <span className={`text-2xl font-black ${podiumTextColors[idx]}`}>
                    {podiumLabels[idx]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Full Rankings Table ── */}
      <div className="card overflow-hidden p-0">
        <table className="min-w-full">
          <thead>
            <tr className="bg-rnli-blue text-white text-sm">
              <th className="px-4 py-3 text-left w-14">Rank</th>
              <th className="px-4 py-3 text-left">Player</th>
              <th className="px-4 py-3 text-center hidden sm:table-cell">Recent Form</th>
              <th className="px-4 py-3 text-center hidden md:table-cell">Best Week</th>
              <th className="px-4 py-3 text-center hidden md:table-cell">Played</th>
              <th className="px-4 py-3 text-center w-20 bg-rnli-blue-dark">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {leaderboard.map((row, idx) => {
              const isCurrentUser = currentUser?.username === row.player;
              const weekScores = Array.from({ length: 38 }, (_, i) => row[`week_${i + 1}`] || 0);
              const bestWeek = Math.max(...weekScores);
              const weeksPlayed = weekScores.filter((s) => s > 0).length;

              return (
                <tr
                  key={row.player}
                  className={`transition-colors ${
                    isCurrentUser
                      ? "bg-blue-50 font-semibold"
                      : idx % 2 === 0
                      ? "bg-white"
                      : "bg-gray-50"
                  } hover:bg-blue-50`}
                >
                  <td className="px-4 py-3 text-center">
                    {row.rank === 1 ? "🥇" : row.rank === 2 ? "🥈" : row.rank === 3 ? "🥉" : (
                      <span className="text-sm text-gray-500 font-medium">{row.rank}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-sm">{row.player}</span>
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-rnli-blue bg-blue-100 px-1.5 py-0.5 rounded">You</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <RecentForm playerRow={row} maxWeek={maxWeekPlayed} />
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell">
                    {bestWeek > 0 ? (
                      <span className="text-green-600 font-bold text-sm">{bestWeek} pts</span>
                    ) : (
                      <span className="text-gray-400 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center hidden md:table-cell text-sm text-gray-500">
                    {weeksPlayed}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-rnli-blue bg-gray-100 text-base">
                    {row.total}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Points Progression Chart ── */}
      {maxWeekPlayed > 1 && chartData.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-bold text-rnli-blue mb-1">Points Progression</h2>
          <p className="text-xs text-gray-400 mb-4">Cumulative points by gameweek</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="week"
                tickFormatter={(v) => `GW${v}`}
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
              <Tooltip
                formatter={(value, name) => [`${value} pts`, name]}
                labelFormatter={(l) => `Gameweek ${l}`}
                contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
              {leaderboard.map((row, i) => (
                <Line
                  key={row.player}
                  type="monotone"
                  dataKey={row.player}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={currentUser?.username === row.player ? 3 : 1.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   GAMEWEEK VIEW
═══════════════════════════════════════════ */
function GameweekView({ gameweekRanked, selectedGameweek, setSelectedGameweek, maxWeekPlayed, currentUser }) {
  const totalPoints = gameweekRanked.reduce((sum, r) => sum + r.gwScore, 0);
  const topScore = gameweekRanked[0]?.gwScore ?? 0;

  return (
    <div className="space-y-4">
      {/* Gameweek selector */}
      <div className="card py-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-semibold text-gray-700 shrink-0">Select Gameweek:</span>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 38 }, (_, i) => i + 1).map((gw) => (
              <button
                key={gw}
                onClick={() => setSelectedGameweek(gw)}
                className={`w-9 h-9 rounded-lg text-xs font-bold transition-colors ${
                  selectedGameweek === gw
                    ? "bg-rnli-blue text-white shadow-md"
                    : gw <= maxWeekPlayed
                    ? "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    : "bg-gray-50 text-gray-300 cursor-not-allowed"
                }`}
                disabled={gw > maxWeekPlayed}
              >
                {gw}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Gameweek stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-rnli-blue">{gameweekRanked[0]?.player ?? "—"}</p>
          <p className="text-xs text-gray-500 mt-1">GW{selectedGameweek} Winner</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-green-600">{topScore} <span className="text-sm font-normal">pts</span></p>
          <p className="text-xs text-gray-500 mt-1">Highest Score</p>
        </div>
        <div className="card text-center py-3">
          <p className="text-2xl font-bold text-gray-700">{totalPoints}</p>
          <p className="text-xs text-gray-500 mt-1">Total Points Scored</p>
        </div>
      </div>

      {/* Gameweek rankings */}
      <div className="card overflow-hidden p-0">
        <div className="bg-rnli-blue text-white px-4 py-3">
          <h2 className="font-bold text-sm">Gameweek {selectedGameweek} Rankings</h2>
        </div>
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 text-xs text-gray-500 uppercase border-b border-gray-200">
              <th className="px-4 py-3 text-left w-16">GW Rank</th>
              <th className="px-4 py-3 text-left">Player</th>
              <th className="px-4 py-3 text-center w-32">GW{selectedGameweek} Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {gameweekRanked.map((row, idx) => {
              const isCurrentUser = currentUser?.username === row.player;
              return (
                <tr
                  key={row.player}
                  className={`transition-colors ${
                    isCurrentUser ? "bg-blue-50 font-semibold" : idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                  } hover:bg-blue-50`}
                >
                  <td className="px-4 py-3 text-center">
                    {row.gwRank === 1 ? "🥇" : row.gwRank === 2 ? "🥈" : row.gwRank === 3 ? "🥉" : (
                      <span className="text-sm text-gray-500">{row.gwRank}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-sm">{row.player}</span>
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-rnli-blue bg-blue-100 px-1.5 py-0.5 rounded">You</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-rnli-blue text-base bg-gray-100">
                    {row.gwScore}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
