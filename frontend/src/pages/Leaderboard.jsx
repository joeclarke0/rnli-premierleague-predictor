import { useEffect, useMemo, useState } from "react";
import { leaderboardAPI } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area,
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
      className={`lb2-avatar bg-gradient-to-br ${avatarGradient(name)} ${dims}`}
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
      <span className="lb2-delta up">
        <FiTrendingUp className="h-3 w-3" />{delta}
      </span>
    );
  if (delta < 0)
    return (
      <span className="lb2-delta down">
        <FiTrendingDown className="h-3 w-3" />{Math.abs(delta)}
      </span>
    );
  return (
    <span className="lb2-delta same">
      <FiMinus className="h-3 w-3" />
    </span>
  );
}

// Colour a gameweek total score by tier. Thresholds (not equality) so summed
// totals above a single fixture's value, and wildcard-doubled scores (e.g. 10,
// 4), still land in the right tier instead of the grey "0" fallback.
function ScoreBadge({ score }) {
  const tier = score >= 5 ? "hi" : score >= 2 ? "mid" : "lo";
  return <span className={`lb2-score-badge ${tier}`}>{score}</span>;
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
    <div className="lb2-form">
      {weeks.map(({ w, s }) => (
        <span
          key={w}
          title={`GW${w}: ${s} pts`}
          // Threshold-based so wildcard-doubled weeks (e.g. 10, 4) map to the
          // same tier as their base value (5, 2). >=5 = exact-score tier, 2–4 =
          // correct-result tier, 0 = grey.
          className={`lb2-dot ${s >= 5 ? "hi" : s >= 2 ? "mid" : "lo"}`}
        >
          {s}
        </span>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Loading skeleton — dark editorial shimmer
───────────────────────────────────────────── */
function LeaderboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Banner skeleton */}
      <div className="lb2-skel h-32 w-full rounded-[1.1rem]" />

      {/* Scoreboard skeleton */}
      <div className="lb2-skel h-28 w-full rounded-2xl" />

      {/* Podium skeleton */}
      <div className="lb2-card-dark p-6">
        <div className="flex items-end justify-center gap-4">
          {["h-24", "h-36", "h-20"].map((h, i) => (
            <div key={i} className="flex w-24 flex-col items-center gap-3">
              <div className="lb2-skel h-12 w-12 rounded-full" />
              <div className="lb2-skel h-4 w-16" />
              <div className={`lb2-skel w-full rounded-t-xl ${h}`} />
            </div>
          ))}
        </div>
      </div>

      {/* Rankings skeleton */}
      <div className="lb2-card">
        <div className="lb2-skel h-12 w-full" />
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5">
              <div className="lb2-skel h-9 w-9 rounded" />
              <div className="lb2-skel h-9 w-9 rounded-full" />
              <div className="lb2-skel h-4 flex-1" />
              <div className="lb2-skel h-6 w-12" />
            </div>
          ))}
        </div>
      </div>
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
      <div className="lb2-error">
        <p className="font-bold">{error}</p>
        <p className="mt-1 text-sm opacity-80">Please refresh the page or try again shortly.</p>
      </div>
    );

  const top3 = leaderboard.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* ── Editorial header banner ── */}
      <div className="lb2-banner">
        <span className="lb2-goldbar" />
        <span className="lb2-kicker">The Standings</span>
        <h1 className="lb2-banner-title mt-3">Who's Top of the Table?</h1>
        <div className="relative z-10 mt-4 flex flex-wrap items-center gap-2">
          <span className="lb2-pill">
            <FiAward className="h-3.5 w-3.5 text-rnli-yellow" />
            <strong>{leaderboard.length}</strong> players
          </span>
          <span className="lb2-pill">
            <FiCalendar className="h-3.5 w-3.5 text-rnli-yellow" />
            <strong>{maxWeekPlayed}</strong> gameweek{maxWeekPlayed !== 1 ? "s" : ""} played
          </span>
        </div>
      </div>

      {/* ── View toggle — gold-underline pill tabs ── */}
      <div className="lb2-tabs">
        {[
          { key: VIEWS.OVERALL, label: "Overall" },
          { key: VIEWS.GAMEWEEK, label: "By Gameweek" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`lb2-tab ${view === key ? "is-active" : ""}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Scoring legend ── */}
      <div className="lb2-legend">
        <span className="lb2-legend-item">
          <span className="lb2-legend-dot" style={{ background: "#22c55e" }} />
          <strong>5 pts</strong> — Exact score
        </span>
        <span className="lb2-legend-item">
          <span className="lb2-legend-dot" style={{ background: "#4f90e0" }} />
          <strong>2 pts</strong> — Correct result
        </span>
        <span className="lb2-legend-item">
          <span className="lb2-legend-dot" style={{ background: "#cbd5e1" }} />
          <strong>0 pts</strong> — Incorrect
        </span>
      </div>

      {leaderboard.length === 0 ? (
        <div className="lb2-empty">
          <FiTarget className="mx-auto mb-3 h-10 w-10 opacity-40" />
          <p className="font-bold">No data yet</p>
          <p className="text-sm">Start predicting to see scores appear here!</p>
        </div>
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

// One cell of the dark scoreboard panel
function ScoreCell({ icon, num, label, sub, accent }) {
  return (
    <div className="lb2-score-cell">
      <div className={`lb2-score-num ${accent}`} title={typeof num === "string" ? num : undefined}>
        {num}
      </div>
      <div className="lb2-score-label flex items-center justify-center gap-1.5">
        {icon}
        <span>{label}</span>
      </div>
      {sub && <div className="lb2-score-sub">{sub}</div>}
    </div>
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
  // Meta aligned to the 2nd / 1st / 3rd ordering used by `podium`.
  const podiumMeta = [
    { place: 2, block: "is-2", medal: "🥈", delay: "0.1s" },
    { place: 1, block: "is-1", medal: "🥇", delay: "0s" },
    { place: 3, block: "is-3", medal: "🥉", delay: "0.2s" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Summary scoreboard panel ── */}
      <div>
        <span className="lb2-eyebrow">Season Stats</span>
        <div className="lb2-scoreboard cols-4 mt-3">
          <ScoreCell
            icon={<FiAward className="h-3.5 w-3.5 text-rnli-yellow" />}
            num={summary.leader?.player ?? "—"}
            label="Current Leader"
            sub={summary.leader ? `${summary.leader.total} pts` : undefined}
            accent="is-gold"
          />
          <ScoreCell
            icon={<FiTarget className="h-3.5 w-3.5" style={{ color: "#4ade80" }} />}
            num={summary.mostExact.player}
            label="Exact Scores"
            sub={summary.mostExact.count > 0 ? `${summary.mostExact.count} × 5pt` : "None yet"}
            accent="is-blue"
          />
          <ScoreCell
            icon={<FiZap className="h-3.5 w-3.5" style={{ color: "#c4b5fd" }} />}
            num={summary.mostImproved.player}
            label="Top GW Scorer"
            sub={summary.mostImproved.gain > 0 ? `${summary.mostImproved.gain} pts in GW${maxWeekPlayed}` : "—"}
            accent="is-blue"
          />
          <ScoreCell
            icon={<FiCalendar className="h-3.5 w-3.5" style={{ color: "#7db0ff" }} />}
            num={maxWeekPlayed}
            label="GW Played"
            sub="of 38"
            accent="is-mute"
          />
        </div>
      </div>

      {/* ── Top 3 Podium ── */}
      {top3.length >= 2 && (
        <div className="lb2-podium">
          <h2 className="lb2-podium-head">🏆 The Top 3</h2>
          <div className="lb2-podium-row">
            {podium.map((player, idx) => {
              const meta = podiumMeta[idx];
              const isWinner = meta.place === 1;
              const isYou = currentUser?.username === player.player;
              return (
                <div key={player.player} className="lb2-podium-col">
                  <span className={`lb2-medal ${isWinner ? "animate-bounce text-5xl" : "text-4xl"}`} style={{ animationDuration: "2.2s" }}>
                    {meta.medal}
                  </span>
                  <Avatar name={player.player} size={isWinner ? "lg" : "md"} />
                  <p className={`lb2-podium-name ${isYou ? "is-you" : ""}`} title={player.player}>
                    {player.player}
                  </p>
                  {isYou && <span className="lb2-you-tag">You</span>}
                  <p className="lb2-podium-total">
                    {player.total}<span>pts</span>
                  </p>
                  <div
                    className={`lb2-block lb2-step ${meta.block}`}
                    style={{ animationDelay: meta.delay }}
                  >
                    <span className="lb2-block-num">{meta.place}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Full Rankings — editorial rows with giant outline rank numbers ── */}
      <div>
        <span className="lb2-eyebrow">Full Table</span>
        <div className="lb2-card mt-3">
          {/* Column header strip (desktop) */}
          <div className="hidden items-center gap-3 border-b border-gray-100 px-4 py-2.5 pl-[0.5rem] dark:border-gray-800 sm:flex">
            <span className="lb2-col-label w-[3.1rem] text-center">Rank</span>
            <span className="lb2-col-label flex-1">Player</span>
            <span className="lb2-col-label hidden w-16 text-center sm:flex justify-center">Move</span>
            <span className="lb2-col-label hidden w-32 text-center sm:flex justify-center">Form</span>
            <span className="lb2-col-label hidden w-16 text-center md:block">Best</span>
            <span className="lb2-col-label hidden w-14 text-center md:block">Played</span>
            <span className="lb2-col-label min-w-[3rem] text-right">Total</span>
          </div>

          <div className="lb2-rank-list">
            {leaderboard.map((row, idx) => {
              const isCurrentUser = currentUser?.username === row.player;
              const weekScores = Array.from({ length: 38 }, (_, i) => row[`week_${i + 1}`] || 0);
              const bestWeek = Math.max(...weekScores);
              const weeksPlayed = weekScores.filter((s) => s > 0).length;
              const delta = rankDeltas[row.player];

              return (
                <div
                  key={row.player}
                  className={`lb2-rank-row lb2-row ${isCurrentUser ? "is-you" : ""}`}
                  style={{ animationDelay: `${Math.min(idx * 0.04, 0.6)}s` }}
                >
                  {/* Rank: medal for top 3, otherwise giant outline numeral */}
                  {row.rank <= 3 ? (
                    <span className="lb2-medal-cell">{["🥇", "🥈", "🥉"][row.rank - 1]}</span>
                  ) : (
                    <span className="lb2-ranknum">{row.rank}</span>
                  )}

                  <Avatar name={row.player} size="sm" />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="lb2-name">{row.player}</span>
                      {isCurrentUser && <span className="lb2-tag-you">You</span>}
                    </div>
                    {/* Mobile-only: form dots inline under the name */}
                    <div className="mt-1 sm:hidden">
                      <RecentForm playerRow={row} maxWeek={maxWeekPlayed} />
                    </div>
                  </div>

                  <div className="hidden w-16 justify-center sm:flex">
                    <RankDelta delta={delta} />
                  </div>
                  <div className="hidden w-32 justify-center sm:flex">
                    <RecentForm playerRow={row} maxWeek={maxWeekPlayed} />
                  </div>
                  <div className="hidden w-16 text-center md:block">
                    {bestWeek > 0 ? (
                      <span className="text-sm font-bold text-green-600 dark:text-green-400">{bestWeek}</span>
                    ) : (
                      <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </div>
                  <div className="hidden w-14 text-center text-sm text-gray-500 dark:text-gray-400 md:block">
                    {weeksPlayed}
                  </div>

                  <div className="lb2-total">
                    {row.total}<span>pts</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Points Progression Chart ── */}
      {maxWeekPlayed > 1 && chartData.length > 0 && (
        <div>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="lb2-eyebrow">The Run-In</span>
              <h2 className="lb2-title mt-2">Points Progression</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">Cumulative points by gameweek</p>
            </div>
            {/* Show top-N toggle to avoid chart spaghetti */}
            <div className="lb2-tabs self-start sm:self-auto">
              {[
                { key: "all", label: "All" },
                { key: 5, label: "Top 5" },
                { key: 3, label: "Top 3" },
              ].map(({ key, label }) => (
                <button
                  key={label}
                  onClick={() => setChartTopN(key)}
                  className={`lb2-tab !py-1.5 !text-sm ${chartTopN === key ? "is-active" : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="lb2-card-dark p-4 sm:p-6">
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
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis
                  dataKey="week"
                  tickFormatter={(v) => `GW${v}`}
                  tick={{ fontSize: 10, fill: "#8b9bba" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 10, fill: "#8b9bba" }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value, name) => [`${value} pts`, name]}
                  labelFormatter={(l) => `Gameweek ${l}`}
                  contentStyle={{
                    borderRadius: "10px",
                    fontSize: "12px",
                    border: "1px solid rgba(148,163,184,0.3)",
                    background: "rgba(4,18,46,0.95)",
                    color: "#fff",
                  }}
                  itemStyle={{ color: "#fff" }}
                  labelStyle={{ color: "#cbd5e1", fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "12px", color: "#cbd5e1" }} />
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
          </div>
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
    <div className="space-y-6">
      {/* ── Gameweek selector — tactile match-card grid ── */}
      <div className="lb2-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="lb2-eyebrow">Match Cards</span>
          <span className="lb2-gw-badge">GW{selectedGameweek}</span>
        </div>

        {/* Slider for fast scrubbing across played weeks */}
        {maxWeekPlayed > 1 && (
          <input
            type="range"
            min={1}
            max={maxWeekPlayed}
            value={Math.min(selectedGameweek, maxWeekPlayed)}
            onChange={(e) => setSelectedGameweek(Number(e.target.value))}
            className="lb2-range mb-4"
            aria-label="Select gameweek"
          />
        )}

        {/* Grid — played weeks are vivid, future weeks are dimmed & disabled */}
        <div className="lb2-gw-grid">
          {Array.from({ length: 38 }, (_, i) => i + 1).map((gw) => {
            const played = gw <= maxWeekPlayed;
            const active = selectedGameweek === gw;
            return (
              <button
                key={gw}
                onClick={() => setSelectedGameweek(gw)}
                disabled={!played}
                className={`lb2-gw-btn ${active ? "is-active" : ""}`}
              >
                {gw}
              </button>
            );
          })}
        </div>
      </div>

      {isFuture ? (
        <div className="lb2-empty">
          <FiCalendar className="mx-auto mb-3 h-9 w-9 opacity-40" />
          <p className="font-bold">Gameweek {selectedGameweek} hasn't been played yet.</p>
        </div>
      ) : (
        <>
          {/* ── Gameweek stats scoreboard ── */}
          <div className="lb2-scoreboard cols-3">
            <ScoreCell
              icon={<FiAward className="h-3.5 w-3.5 text-rnli-yellow" />}
              num={gameweekRanked[0]?.player ?? "—"}
              label={`GW${selectedGameweek} Winner`}
              accent="is-gold"
            />
            <ScoreCell
              icon={<FiTarget className="h-3.5 w-3.5" style={{ color: "#4ade80" }} />}
              num={topScore}
              label="Highest Score"
              sub="points"
              accent="is-blue"
            />
            <ScoreCell
              icon={<FiZap className="h-3.5 w-3.5" style={{ color: "#7db0ff" }} />}
              num={totalPoints}
              label="Total Points Scored"
              accent="is-mute"
            />
          </div>

          {/* ── Bar chart of GW scores — dramatic CSS bars ── */}
          {barData.length > 0 && (
            <div>
              <span className="lb2-eyebrow">The Breakdown</span>
              <h2 className="lb2-title mt-2 mb-4">Gameweek {selectedGameweek} Scores</h2>
              <div className="lb2-card p-5 sm:p-6">
                <div className="space-y-2.5">
                  {barData.map((entry) => {
                    // Scale relative to the highest score present so wildcard-
                    // doubled totals (which can exceed the normal single-fixture
                    // range) never overflow 100%. topScore is the GW max.
                    const pct = topScore > 0 ? (entry.score / topScore) * 100 : 0;
                    const barClass = entry.you
                      ? "you"
                      : entry.score >= 5
                      ? "hi"
                      : entry.score >= 2
                      ? "mid"
                      : "lo";
                    return (
                      <div key={entry.player} className="flex items-center gap-3">
                        <span className="lb2-bar-name">{entry.player}</span>
                        <div className="lb2-bar-track">
                          <div className={`lb2-bar ${barClass}`} style={{ width: `${Math.max(pct, 12)}%` }}>
                            {entry.score}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Gameweek rankings — same editorial rows ── */}
          <div>
            <span className="lb2-eyebrow">Standings</span>
            <h2 className="lb2-title mt-2 mb-3">Gameweek {selectedGameweek} Rankings</h2>
            <div className="lb2-card">
              <div className="lb2-rank-list">
                {gameweekRanked.map((row, idx) => {
                  const isCurrentUser = currentUser?.username === row.player;
                  return (
                    <div
                      key={row.player}
                      className={`lb2-rank-row lb2-row ${isCurrentUser ? "is-you" : ""}`}
                      style={{ animationDelay: `${Math.min(idx * 0.04, 0.6)}s` }}
                    >
                      {row.gwRank <= 3 ? (
                        <span className="lb2-medal-cell">{["🥇", "🥈", "🥉"][row.gwRank - 1]}</span>
                      ) : (
                        <span className="lb2-ranknum">{row.gwRank}</span>
                      )}

                      <Avatar name={row.player} size="sm" />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="lb2-name">{row.player}</span>
                          {isCurrentUser && <span className="lb2-tag-you">You</span>}
                        </div>
                      </div>

                      <ScoreBadge score={row.gwScore} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
