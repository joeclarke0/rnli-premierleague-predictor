import { useEffect, useMemo, useState } from "react";
import { leaderboardAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, Cell,
} from "recharts";
import {
  FiTrendingUp, FiTrendingDown, FiMinus, FiAward, FiTarget, FiZap, FiCalendar,
} from "react-icons/fi";

const VIEWS = {
  OVERALL: "overall",
  GAMEWEEK: "gameweek",
};

/* ─────────────────────────────────────────────
   Shared helpers
───────────────────────────────────────────── */

// Deterministic avatar colour from a name — same name always maps to the
// same gradient so a player is visually consistent everywhere on the page.
const AVATAR_PALETTE = [
  "from-blue-500 to-indigo-600",
  "from-rose-500 to-pink-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-violet-500 to-purple-600",
  "from-cyan-500 to-sky-600",
  "from-fuchsia-500 to-pink-600",
  "from-lime-500 to-green-600",
];

function avatarGradient(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function Avatar({ name, size = "md" }) {
  const dims = size === "lg" ? "w-12 h-12 text-base" : size === "sm" ? "w-7 h-7 text-[11px]" : "w-9 h-9 text-sm";
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradient(name)} ${dims} font-bold text-white shadow-sm ring-2 ring-white/70 dark:ring-white/10`}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

// Rank movement badge — overall rank vs rank "last week" (rank computed from
// total minus the most recent played week's score).
function RankDelta({ delta }) {
  if (delta === null || delta === undefined) return null;
  if (delta > 0)
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[11px] font-bold text-green-700 dark:bg-green-900/40 dark:text-green-400">
        <FiTrendingUp className="h-3 w-3" />{delta}
      </span>
    );
  if (delta < 0)
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[11px] font-bold text-red-700 dark:bg-red-900/40 dark:text-red-400">
        <FiTrendingDown className="h-3 w-3" />{Math.abs(delta)}
      </span>
    );
  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] font-bold text-gray-400 dark:bg-gray-700/60 dark:text-gray-400">
      <FiMinus className="h-3 w-3" />
    </span>
  );
}

// Colour a gameweek total score by tier. Thresholds (not equality) so summed
// totals above a single fixture's value, and wildcard-doubled scores (e.g. 10,
// 4), still land in the right tier instead of the grey "0" fallback.
function ScoreBadge({ score }) {
  if (score >= 5)
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-green-100 text-xs font-bold text-green-700 dark:bg-green-900/50 dark:text-green-400">
        {score}
      </span>
    );
  if (score >= 2)
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600 dark:bg-blue-900/50 dark:text-blue-400">
        {score}
      </span>
    );
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-xs text-gray-400 dark:bg-gray-700 dark:text-gray-500">
      {score}
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
  if (weeks.length === 0)
    return <span className="text-xs text-gray-400 dark:text-gray-500">No data</span>;
  return (
    <div className="flex items-center gap-1">
      {weeks.map(({ w, s }) => (
        <span
          key={w}
          title={`GW${w}: ${s} pts`}
          // Threshold-based so wildcard-doubled weeks (e.g. 10, 4) map to the
          // same tier as their base value (5, 2). >=5 = exact-score tier, 2–4 =
          // correct-result tier, 0 = grey.
          // min-w + px (instead of fixed w-5) so a two-digit doubled score like
          // 10 doesn't clip inside the dot; single digits still render circular.
          className={`flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
            s >= 5
              ? "bg-green-500 text-white"
              : s >= 2
              ? "bg-blue-400 text-white"
              : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
          }`}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

// Reusable surface — replaces the global `.card` class with explicit Tailwind
// so dark mode is handled inline rather than via the global override sheet.
function Surface({ className = "", children }) {
  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Loading skeleton — mimics the real table layout
───────────────────────────────────────────── */
function LeaderboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="space-y-2">
          <div className="h-8 w-56 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-4 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="h-10 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* Podium skeleton */}
      <Surface className="p-6">
        <div className="flex items-end justify-center gap-4">
          {["h-24", "h-36", "h-20"].map((h, i) => (
            <div key={i} className="flex w-24 flex-col items-center gap-3">
              <div className="h-12 w-12 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 w-16 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className={`w-full animate-pulse rounded-t-xl bg-gray-200 dark:bg-gray-700 ${h}`} />
            </div>
          ))}
        </div>
      </Surface>

      {/* Table skeleton */}
      <Surface className="overflow-hidden">
        <div className="h-12 animate-pulse bg-gray-200 dark:bg-gray-700" />
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <div className="h-6 w-6 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="h-4 flex-1 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div className="h-6 w-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main component
───────────────────────────────────────────── */
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
  const maxWeekPlayed = useMemo(() => {
    for (let w = 38; w >= 1; w--) {
      if (leaderboard.some((r) => r[`week_${w}`] > 0)) return w;
    }
    return 1;
  }, [leaderboard]);

  // Default the gameweek selector to the latest played week once data arrives.
  useEffect(() => {
    if (leaderboard.length > 0) setSelectedGameweek(maxWeekPlayed);
  }, [leaderboard.length, maxWeekPlayed]);

  // Rank-movement map: compare current overall rank with the rank a player
  // would have held *before* the most recent played gameweek.
  const rankDeltas = useMemo(() => {
    const map = {};
    if (leaderboard.length === 0) return map;
    const lastWeekKey = `week_${maxWeekPlayed}`;
    const prev = [...leaderboard]
      .map((r) => ({ player: r.player, prevTotal: r.total - (r[lastWeekKey] || 0) }))
      .sort((a, b) => b.prevTotal - a.prevTotal);
    const prevRank = {};
    prev.forEach((r, i) => (prevRank[r.player] = i + 1));
    leaderboard.forEach((r) => {
      // Positive delta == moved up the table (improved).
      map[r.player] = prevRank[r.player] - r.rank;
    });
    return map;
  }, [leaderboard, maxWeekPlayed]);

  // Gameweek view: re-rank players by selected week
  const gameweekRanked = useMemo(
    () =>
      [...leaderboard]
        .map((r) => ({ ...r, gwScore: r[`week_${selectedGameweek}`] || 0 }))
        .sort((a, b) => b.gwScore - a.gwScore)
        .map((r, i) => ({ ...r, gwRank: i + 1 })),
    [leaderboard, selectedGameweek]
  );

  if (loading) return <LeaderboardSkeleton />;

  if (error)
    return (
      <Surface className="border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
        <p className="font-semibold">{error}</p>
        <p className="mt-1 text-sm opacity-80">Please refresh the page or try again shortly.</p>
      </Surface>
    );

  const top3 = leaderboard.slice(0, 3);

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes lb-fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lb-grow {
          from { transform: scaleY(0); }
          to   { transform: scaleY(1); }
        }
        .lb-row { animation: lb-fade-in 0.45s ease-out both; }
        .lb-step { transform-origin: bottom; animation: lb-grow 0.6s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      {/* ── Header ── */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold tracking-tight text-rnli-blue dark:text-white">
            <FiAward className="h-7 w-7 text-rnli-yellow" />
            Leaderboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {leaderboard.length} players · {maxWeekPlayed} gameweek
            {maxWeekPlayed !== 1 ? "s" : ""} played
          </p>
        </div>

        {/* View toggle */}
        <div className="inline-flex self-start rounded-xl border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800 sm:self-auto">
          {[
            { key: VIEWS.OVERALL, label: "Overall" },
            { key: VIEWS.GAMEWEEK, label: "By Gameweek" },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`rounded-lg px-5 py-1.5 text-sm font-semibold transition-all ${
                view === key
                  ? "bg-rnli-blue text-white shadow-sm"
                  : "text-gray-600 hover:text-rnli-blue dark:text-gray-300 dark:hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scoring legend ── */}
      <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-600 dark:text-gray-300">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3.5 w-3.5 rounded-full bg-green-500" />
          <strong className="text-gray-800 dark:text-gray-100">5 pts</strong> — Exact score
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3.5 w-3.5 rounded-full bg-blue-400" />
          <strong className="text-gray-800 dark:text-gray-100">2 pts</strong> — Correct result
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3.5 w-3.5 rounded-full bg-gray-300 dark:bg-gray-600" />
          <strong className="text-gray-800 dark:text-gray-100">0 pts</strong> — Incorrect
        </span>
      </div>

      {leaderboard.length === 0 ? (
        <Surface className="p-16 text-center text-gray-500 dark:text-gray-400">
          <FiTarget className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="font-medium">No data yet</p>
          <p className="text-sm">Start predicting to see scores appear here!</p>
        </Surface>
      ) : view === VIEWS.OVERALL ? (
        <OverallView
          top3={top3}
          leaderboard={leaderboard}
          maxWeekPlayed={maxWeekPlayed}
          rankDeltas={rankDeltas}
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

function StatCard({ icon, label, value, sub, accent }) {
  return (
    <Surface className="flex items-center gap-3 p-4">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-base font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="truncate text-xs text-gray-500 dark:text-gray-400">{label}</p>
        {sub && <p className="truncate text-[11px] text-gray-400 dark:text-gray-500">{sub}</p>}
      </div>
    </Surface>
  );
}

function OverallView({ top3, leaderboard, maxWeekPlayed, rankDeltas, currentUser }) {
  const [chartTopN, setChartTopN] = useState("all"); // "all" | 5 | 3

  // Build chart data: one entry per week with each player's cumulative points
  const chartData = useMemo(() => {
    const data = [];
    for (let w = 1; w <= maxWeekPlayed; w++) {
      const entry = { week: w };
      leaderboard.forEach((row) => {
        let cum = 0;
        for (let i = 1; i <= w; i++) cum += row[`week_${i}`] || 0;
        entry[row.player] = cum;
      });
      data.push(entry);
    }
    return data;
  }, [leaderboard, maxWeekPlayed]);

  // Players to draw on the chart based on the Top-N toggle.
  const chartPlayers = useMemo(() => {
    if (chartTopN === "all") return leaderboard;
    return leaderboard.slice(0, chartTopN);
  }, [leaderboard, chartTopN]);

  // ── Client-side summary stats ──
  const summary = useMemo(() => {
    const lastWeekKey = `week_${maxWeekPlayed}`;
    let mostExact = { player: "—", count: -1 };
    let mostImproved = { player: "—", gain: -1 };

    leaderboard.forEach((row) => {
      let fives = 0;
      // An exact score is worth 5 normally, or 10 when that week was wildcarded
      // (doubled). Threshold >= 5 catches both; null/undefined weeks fail it.
      for (let w = 1; w <= 38; w++) if (row[`week_${w}`] >= 5) fives++;
      if (fives > mostExact.count) mostExact = { player: row.player, count: fives };

      const gain = row[lastWeekKey] || 0;
      if (gain > mostImproved.gain) mostImproved = { player: row.player, gain };
    });

    return {
      leader: leaderboard[0],
      mostExact,
      mostImproved,
    };
  }, [leaderboard, maxWeekPlayed]);

  // Podium order: 2nd, 1st, 3rd
  const podium = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumMeta = [
    { place: "2nd", height: "h-24", grad: "from-gray-300 to-gray-400 dark:from-gray-500 dark:to-gray-600", medal: "🥈", delay: "0.1s" },
    { place: "1st", height: "h-36", grad: "from-rnli-yellow to-amber-400 dark:from-amber-500 dark:to-amber-600", medal: "🥇", delay: "0s" },
    { place: "3rd", height: "h-20", grad: "from-orange-300 to-orange-400 dark:from-orange-600 dark:to-orange-700", medal: "🥉", delay: "0.2s" },
  ];
  // Re-map podiumMeta to the 2nd/1st/3rd ordering used by `podium`.
  const orderedMeta = [podiumMeta[0], podiumMeta[1], podiumMeta[2]];

  return (
    <div className="space-y-6">
      {/* ── Summary stat cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={<FiAward className="h-5 w-5" />}
          label="Current Leader"
          value={summary.leader?.player ?? "—"}
          sub={summary.leader ? `${summary.leader.total} pts` : undefined}
          accent="bg-rnli-yellow/20 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
        />
        <StatCard
          icon={<FiTarget className="h-5 w-5" />}
          label="Exact Scores"
          value={summary.mostExact.player}
          sub={summary.mostExact.count > 0 ? `${summary.mostExact.count} × 5pt` : "None yet"}
          accent="bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400"
        />
        <StatCard
          icon={<FiZap className="h-5 w-5" />}
          label="Top GW Scorer"
          value={summary.mostImproved.player}
          sub={summary.mostImproved.gain > 0 ? `${summary.mostImproved.gain} pts in GW${maxWeekPlayed}` : "—"}
          accent="bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400"
        />
        <StatCard
          icon={<FiCalendar className="h-5 w-5" />}
          label="GW Played"
          value={maxWeekPlayed}
          sub={`of 38`}
          accent="bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
        />
      </div>

      {/* ── Top 3 Podium ── */}
      {top3.length >= 1 && (
        <Surface className="overflow-hidden">
          <div className="bg-gradient-to-br from-rnli-blue via-rnli-blue-light to-rnli-blue p-6 dark:from-gray-900 dark:via-rnli-blue-dark dark:to-gray-900">
            <h2 className="mb-6 text-center text-lg font-bold text-white">🏆 Top 3</h2>
            <div className="flex items-end justify-center gap-3 sm:gap-5">
              {podium.map((player, idx) => {
                const meta = orderedMeta[idx];
                const isWinner = meta.place === "1st";
                const isYou = currentUser?.username === player.player;
                return (
                  <div key={player.player} className="flex w-24 flex-col items-center gap-2 sm:w-28">
                    <span
                      className={`${isWinner ? "animate-bounce text-5xl" : "text-4xl"}`}
                      style={{ animationDuration: "2.2s" }}
                    >
                      {meta.medal}
                    </span>
                    <Avatar name={player.player} size={isWinner ? "lg" : "md"} />
                    <p
                      className={`w-full truncate text-center text-sm font-bold ${
                        isYou ? "text-rnli-yellow" : "text-white"
                      }`}
                      title={player.player}
                    >
                      {player.player}
                    </p>
                    {isYou && (
                      <span className="-mt-1 text-[10px] font-semibold uppercase tracking-wide text-rnli-yellow">
                        You
                      </span>
                    )}
                    <p className="text-lg font-black text-white">
                      {player.total}
                      <span className="ml-1 text-xs font-normal text-white/70">pts</span>
                    </p>
                    <div
                      className={`lb-step flex w-full items-center justify-center rounded-t-xl bg-gradient-to-b ${meta.grad} ${meta.height} shadow-inner`}
                      style={{ animationDelay: meta.delay }}
                    >
                      <span className="text-2xl font-black text-white/90 drop-shadow">{meta.place}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Surface>
      )}

      {/* ── Full Rankings Table ── */}
      <Surface className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-rnli-blue text-left text-xs uppercase tracking-wide text-white/90">
                <th className="w-14 px-4 py-3">Rank</th>
                <th className="px-4 py-3">Player</th>
                <th className="hidden px-4 py-3 text-center sm:table-cell">Move</th>
                <th className="hidden px-4 py-3 text-center sm:table-cell">Recent Form</th>
                <th className="hidden px-4 py-3 text-center md:table-cell">Best Week</th>
                <th className="hidden px-4 py-3 text-center md:table-cell">Played</th>
                <th className="w-20 bg-rnli-blue-dark px-4 py-3 text-center">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {leaderboard.map((row, idx) => {
                const isCurrentUser = currentUser?.username === row.player;
                const weekScores = Array.from({ length: 38 }, (_, i) => row[`week_${i + 1}`] || 0);
                const bestWeek = Math.max(...weekScores);
                const weeksPlayed = weekScores.filter((s) => s > 0).length;
                const delta = rankDeltas[row.player];

                return (
                  <tr
                    key={row.player}
                    className={`lb-row group transition-all hover:-translate-y-px hover:shadow-md ${
                      isCurrentUser
                        ? "border-l-4 border-rnli-yellow bg-amber-50/60 dark:bg-amber-500/10"
                        : "border-l-4 border-transparent bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700/50"
                    }`}
                    style={{ animationDelay: `${Math.min(idx * 0.04, 0.6)}s` }}
                  >
                    <td className="px-4 py-3 text-center">
                      {row.rank <= 3 ? (
                        <span className="text-lg">{["🥇", "🥈", "🥉"][row.rank - 1]}</span>
                      ) : (
                        <span className="text-sm font-semibold text-gray-400 dark:text-gray-500">
                          {row.rank}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={row.player} size="sm" />
                        <div className="min-w-0">
                          <span className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                            <span className="truncate">{row.player}</span>
                            {isCurrentUser && (
                              <span className="rounded bg-rnli-yellow/30 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:bg-rnli-yellow/20 dark:text-rnli-yellow">
                                You
                              </span>
                            )}
                          </span>
                          {/* Mobile-only: form dots inline under the name */}
                          <div className="mt-1 sm:hidden">
                            <RecentForm playerRow={row} maxWeek={maxWeekPlayed} />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-center sm:table-cell">
                      <RankDelta delta={delta} />
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <div className="flex justify-center">
                        <RecentForm playerRow={row} maxWeek={maxWeekPlayed} />
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-center md:table-cell">
                      {bestWeek > 0 ? (
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                          {bestWeek} pts
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-center text-sm text-gray-500 dark:text-gray-400 md:table-cell">
                      {weeksPlayed}
                    </td>
                    <td className="bg-gray-50 px-4 py-3 text-center text-base font-extrabold text-rnli-blue dark:bg-gray-700/40 dark:text-white">
                      {row.total}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Surface>

      {/* ── Points Progression Chart ── */}
      {maxWeekPlayed > 1 && chartData.length > 0 && (
        <Surface className="p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-rnli-blue dark:text-white">Points Progression</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">Cumulative points by gameweek</p>
            </div>
            {/* Show top-N toggle to avoid chart spaghetti */}
            <div className="inline-flex self-start rounded-lg border border-gray-200 bg-gray-100 p-0.5 dark:border-gray-700 dark:bg-gray-900 sm:self-auto">
              {[
                { key: "all", label: "All" },
                { key: 5, label: "Top 5" },
                { key: 3, label: "Top 3" },
              ].map(({ key, label }) => (
                <button
                  key={label}
                  onClick={() => setChartTopN(key)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                    chartTopN === key
                      ? "bg-rnli-blue text-white shadow-sm"
                      : "text-gray-500 hover:text-rnli-blue dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <defs>
                {chartPlayers.map((row, i) => {
                  const color = CHART_COLORS[leaderboard.indexOf(row) % CHART_COLORS.length];
                  return (
                    <linearGradient key={row.player} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  );
                })}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
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
                contentStyle={{
                  borderRadius: "10px",
                  fontSize: "12px",
                  border: "1px solid rgba(148,163,184,0.3)",
                  background: "rgba(17,24,39,0.92)",
                  color: "#fff",
                }}
                itemStyle={{ color: "#fff" }}
                labelStyle={{ color: "#cbd5e1", fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "12px" }} />
              {chartPlayers.map((row, i) => {
                const color = CHART_COLORS[leaderboard.indexOf(row) % CHART_COLORS.length];
                const isYou = currentUser?.username === row.player;
                return (
                  <Area
                    key={row.player}
                    type="monotone"
                    dataKey={row.player}
                    stroke={color}
                    strokeWidth={isYou ? 3 : 1.8}
                    fill={`url(#grad-${i})`}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </Surface>
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
  const isFuture = selectedGameweek > maxWeekPlayed;

  // Bar chart data — only players that scored, capped to keep it readable.
  const barData = useMemo(
    () =>
      gameweekRanked
        .filter((r) => r.gwScore > 0)
        .slice(0, 12)
        .map((r) => ({ player: r.player, score: r.gwScore, you: currentUser?.username === r.player })),
    [gameweekRanked, currentUser]
  );

  return (
    <div className="space-y-5">
      {/* Gameweek selector */}
      <Surface className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Select Gameweek</span>
          <span className="rounded-full bg-rnli-blue px-3 py-1 text-sm font-bold text-white">
            GW{selectedGameweek}
          </span>
        </div>

        {/* Slider for fast scrubbing across played weeks */}
        {maxWeekPlayed > 1 && (
          <input
            type="range"
            min={1}
            max={maxWeekPlayed}
            value={Math.min(selectedGameweek, maxWeekPlayed)}
            onChange={(e) => setSelectedGameweek(Number(e.target.value))}
            className="mb-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-rnli-blue dark:bg-gray-700"
            aria-label="Select gameweek"
          />
        )}

        {/* Grid — played weeks are vivid, future weeks are dimmed & disabled */}
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 38 }, (_, i) => i + 1).map((gw) => {
            const played = gw <= maxWeekPlayed;
            const active = selectedGameweek === gw;
            return (
              <button
                key={gw}
                onClick={() => setSelectedGameweek(gw)}
                disabled={!played}
                className={`h-9 w-9 rounded-lg text-xs font-bold transition-all ${
                  active
                    ? "scale-110 bg-rnli-blue text-white shadow-md ring-2 ring-rnli-yellow"
                    : played
                    ? "bg-gray-100 text-gray-700 hover:bg-rnli-blue/10 hover:text-rnli-blue dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    : "cursor-not-allowed bg-gray-50 text-gray-300 dark:bg-gray-800 dark:text-gray-600"
                }`}
              >
                {gw}
              </button>
            );
          })}
        </div>
      </Surface>

      {isFuture ? (
        <Surface className="p-12 text-center text-gray-500 dark:text-gray-400">
          <FiCalendar className="mx-auto mb-3 h-9 w-9 opacity-40" />
          <p className="font-medium">Gameweek {selectedGameweek} hasn't been played yet.</p>
        </Surface>
      ) : (
        <>
          {/* Gameweek stats */}
          <div className="grid grid-cols-3 gap-3">
            <StatCard
              icon={<FiAward className="h-5 w-5" />}
              label={`GW${selectedGameweek} Winner`}
              value={gameweekRanked[0]?.player ?? "—"}
              accent="bg-rnli-yellow/20 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400"
            />
            <StatCard
              icon={<FiTarget className="h-5 w-5" />}
              label="Highest Score"
              value={`${topScore} pts`}
              accent="bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-400"
            />
            <StatCard
              icon={<FiZap className="h-5 w-5" />}
              label="Total Points Scored"
              value={totalPoints}
              accent="bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400"
            />
          </div>

          {/* Bar chart of GW scores — CSS bars avoid Recharts Cell/layout quirks */}
          {barData.length > 0 && (
            <Surface className="p-6">
              <h2 className="mb-4 text-lg font-bold text-rnli-blue dark:text-white">
                Gameweek {selectedGameweek} Scores
              </h2>
              <div className="space-y-2.5">
                {barData.map((entry) => {
                  // Scale relative to the highest score present so wildcard-
                  // doubled totals (which can exceed the normal single-fixture
                  // range) never overflow 100%. topScore is the GW max.
                  const pct = topScore > 0 ? (entry.score / topScore) * 100 : 0;
                  const barColor = entry.you
                    ? "bg-rnli-yellow"
                    : entry.score >= 5
                    ? "bg-green-500"
                    : entry.score >= 2
                    ? "bg-blue-400"
                    : "bg-gray-400";
                  return (
                    <div key={entry.player} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 truncate text-right text-xs text-gray-500 dark:text-gray-400">
                        {entry.player}
                      </span>
                      <div className="flex-1 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                        <div
                          className={`flex h-6 items-center justify-end rounded-full pr-2 transition-all duration-700 ${barColor}`}
                          style={{ width: `${Math.max(pct, 8)}%` }}
                        >
                          <span className="text-xs font-bold text-white drop-shadow">{entry.score}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Surface>
          )}

          {/* Gameweek rankings */}
          <Surface className="overflow-hidden">
            <div className="bg-rnli-blue px-4 py-3">
              <h2 className="text-sm font-bold text-white">Gameweek {selectedGameweek} Rankings</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                    <th className="w-16 px-4 py-3">GW Rank</th>
                    <th className="px-4 py-3">Player</th>
                    <th className="w-32 px-4 py-3 text-center">GW{selectedGameweek} Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {gameweekRanked.map((row, idx) => {
                    const isCurrentUser = currentUser?.username === row.player;
                    return (
                      <tr
                        key={row.player}
                        className={`lb-row transition-all hover:-translate-y-px hover:shadow-md ${
                          isCurrentUser
                            ? "border-l-4 border-rnli-yellow bg-amber-50/60 dark:bg-amber-500/10"
                            : "border-l-4 border-transparent bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700/50"
                        }`}
                        style={{ animationDelay: `${Math.min(idx * 0.04, 0.6)}s` }}
                      >
                        <td className="px-4 py-3 text-center">
                          {row.gwRank <= 3 ? (
                            <span className="text-lg">{["🥇", "🥈", "🥉"][row.gwRank - 1]}</span>
                          ) : (
                            <span className="text-sm font-semibold text-gray-400 dark:text-gray-500">
                              {row.gwRank}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={row.player} size="sm" />
                            <span className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                              <span className="truncate">{row.player}</span>
                              {isCurrentUser && (
                                <span className="rounded bg-rnli-yellow/30 px-1.5 py-0.5 text-[10px] font-bold uppercase text-amber-700 dark:bg-rnli-yellow/20 dark:text-rnli-yellow">
                                  You
                                </span>
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <ScoreBadge score={row.gwScore} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Surface>
        </>
      )}
    </div>
  );
}
