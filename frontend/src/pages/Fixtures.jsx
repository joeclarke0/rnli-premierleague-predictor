import { useState, useEffect, useMemo } from 'react';
import { fixturesAPI, resultsAPI } from '../services/api';
import { FiSearch, FiCalendar, FiFilter, FiChevronDown } from 'react-icons/fi';

/* ── Status helpers ── */
function getStatus(fixture, results) {
  if (results[fixture.id]) return 'completed';
  try {
    const kickoff = new Date(`${fixture.date}T${fixture.time || '15:00'}:00`);
    const now = new Date();
    const diff = kickoff - now;
    if (diff < 0 && diff > -105 * 60 * 1000) return 'live';
    if (diff < 0) return 'past';
    if (diff < 2 * 60 * 60 * 1000) return 'upcoming_soon';
    return 'upcoming';
  } catch {
    return 'upcoming';
  }
}

function StatusBadge({ status }) {
  const map = {
    completed:     { label: '✓ Result In',    cls: 'fx-badge--green'  },
    live:          { label: '● Live',          cls: 'fx-badge--red'    },
    upcoming_soon: { label: 'Starting Soon',   cls: 'fx-badge--amber'  },
    past:          { label: 'Awaiting Result', cls: 'fx-badge--gray'   },
    upcoming:      { label: 'Upcoming',        cls: 'fx-badge--blue'   },
  };
  const { label, cls } = map[status] ?? map.upcoming;
  return <span className={`fx-badge ${cls}`}>{label}</span>;
}

/* ── Skeleton ── */
function SkeletonCard() {
  return (
    <div className="fx-card animate-pulse">
      <div className="h-3 w-1/3 rounded bg-gray-200 dark:bg-gray-700 mb-4" />
      <div className="flex items-center justify-center gap-3 my-5">
        <div className="h-4 flex-1 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-10 w-16 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="h-4 flex-1 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="h-3 w-1/2 mx-auto rounded bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}

/* ── Fixture card ── */
function FixtureCard({ fixture, result }) {
  const status = getStatus(fixture, result ? { [fixture.id]: result } : {});

  const accentCls =
    status === 'completed'     ? 'fx-card--green'  :
    status === 'live'          ? 'fx-card--red'    :
    status === 'upcoming_soon' ? 'fx-card--amber'  :
    status === 'past'          ? 'fx-card--gray'   :
                                 'fx-card--blue';

  return (
    <div className={`fx-card ${accentCls}`}>
      {/* Top row: date/time + GW + status */}
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-0.5">
          <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            {fixture.day}, {fixture.date}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-500">{fixture.time}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className="fx-gw-badge">GW{fixture.gameweek}</span>
          <StatusBadge status={status} />
        </div>
      </div>

      {/* Match row */}
      <div className="flex items-center gap-3 my-4">
        <div className="flex-1 text-right">
          <p className="font-extrabold text-sm leading-tight text-gray-900 dark:text-white">
            {fixture.home_team}
          </p>
        </div>

        {result ? (
          <div className="fx-score-box fx-score-box--result">
            <span className="fx-score-num">
              {result.actual_home}–{result.actual_away}
            </span>
            <span className="fx-score-label">FT</span>
          </div>
        ) : (
          <div className="fx-score-box">
            <span className="fx-score-vs">vs</span>
          </div>
        )}

        <div className="flex-1 text-left">
          <p className="font-extrabold text-sm leading-tight text-gray-900 dark:text-white">
            {fixture.away_team}
          </p>
        </div>
      </div>

      {/* Venue */}
      {fixture.venue && (
        <div className="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <FiCalendar className="w-3 h-3 text-gray-400 shrink-0" />
          <p className="text-[11px] text-gray-400 truncate">{fixture.venue}</p>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════ */
export default function Fixtures() {
  const [fixtures, setFixtures]             = useState([]);
  const [results, setResults]               = useState({});
  const [loading, setLoading]               = useState(true);
  const [selectedGameweek, setSelectedGameweek] = useState('all');
  const [searchQuery, setSearchQuery]       = useState('');
  const [statusFilter, setStatusFilter]     = useState('all');

  useEffect(() => { fetchData(); }, [selectedGameweek]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = selectedGameweek !== 'all' ? { gameweek: selectedGameweek } : {};
      const [fixturesRes, resultsRes] = await Promise.all([
        fixturesAPI.getAll(params),
        resultsAPI.get(),
      ]);
      const lookup = {};
      resultsRes.data.results.forEach((r) => { lookup[r.fixture_id] = r; });
      setFixtures(fixturesRes.data.fixtures);
      setResults(lookup);
    } catch (err) {
      console.error('Error fetching fixtures:', err);
    } finally {
      setLoading(false);
    }
  };

  const gameweeks = Array.from({ length: 38 }, (_, i) => i + 1);

  const filtered = useMemo(() => fixtures.filter((f) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      f.home_team.toLowerCase().includes(q) ||
      f.away_team.toLowerCase().includes(q) ||
      f.venue?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || getStatus(f, results) === statusFilter;
    return matchesSearch && matchesStatus;
  }), [fixtures, results, searchQuery, statusFilter]);

  const grouped = useMemo(() => {
    if (selectedGameweek !== 'all') return null;
    const groups = {};
    filtered.forEach((f) => {
      if (!groups[f.gameweek]) groups[f.gameweek] = [];
      groups[f.gameweek].push(f);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([gw, list]) => ({ gw: Number(gw), fixtures: list }));
  }, [filtered, selectedGameweek]);

  const completedCount = fixtures.filter((f) => results[f.id]).length;

  return (
    <div className="space-y-8">
      {/* ── Header banner ── */}
      <div className="fx-banner">
        <span className="fx-goldbar" aria-hidden="true" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          <div>
            <span className="fx-kicker">Match Schedule</span>
            <h1 className="fx-title mt-2">The Fixtures</h1>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="fx-pill fx-pill--navy">{fixtures.length} fixtures</span>
              <span className="fx-pill fx-pill--gold">{completedCount} results in</span>
            </div>
          </div>

          {/* GW selector */}
          <div className="relative self-start sm:self-auto">
            <select
              value={selectedGameweek}
              onChange={(e) => { setSelectedGameweek(e.target.value); setSearchQuery(''); }}
              className="fx-select pr-8"
            >
              <option value="all">All Gameweeks</option>
              {gameweeks.map((gw) => (
                <option key={gw} value={gw}>Gameweek {gw}</option>
              ))}
            </select>
            <FiChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
          </div>
        </div>
      </div>

      {/* ── Search + filter bar ── */}
      <div className="fx-controls">
        <div className="fx-search-wrap">
          <FiSearch className="fx-search-icon" />
          <input
            type="text"
            placeholder="Search teams or venue…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="fx-search-input"
          />
        </div>
        <div className="fx-filter-wrap">
          <FiFilter className="fx-filter-icon" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="fx-filter-select"
          >
            <option value="all">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="upcoming_soon">Starting Soon</option>
            <option value="live">Live</option>
            <option value="past">Awaiting Result</option>
            <option value="completed">Completed</option>
          </select>
          <FiChevronDown className="fx-filter-chevron" />
        </div>
      </div>

      {/* ── Content ── */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="fx-empty">
          <span className="fx-empty-icon">⚽</span>
          <p className="fx-empty-title">No fixtures found</p>
          <p className="fx-empty-sub">Try adjusting your search or filters</p>
        </div>
      ) : grouped ? (
        <div className="space-y-10">
          {grouped.map(({ gw, fixtures: gwFixtures }) => (
            <div key={gw}>
              {/* GW section header */}
              <div className="fx-gw-header">
                <div>
                  <span className="fx-gw-kicker">Gameweek</span>
                  <span className="fx-gw-num">{gw}</span>
                </div>
                <span className="fx-gw-divider" />
                <span className="fx-gw-count">{gwFixtures.length} matches</span>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {gwFixtures.map((fixture) => (
                  <FixtureCard key={fixture.id} fixture={fixture} result={results[fixture.id]} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((fixture) => (
            <FixtureCard key={fixture.id} fixture={fixture} result={results[fixture.id]} />
          ))}
        </div>
      )}
    </div>
  );
}
