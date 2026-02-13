import { useState, useEffect, useMemo } from 'react';
import { fixturesAPI, resultsAPI } from '../services/api';
import { FiSearch, FiCalendar, FiFilter } from 'react-icons/fi';

function getStatus(fixture, results) {
  if (results[fixture.id]) return 'completed';
  try {
    const [day, month, year] = fixture.date.split('/');
    const kickoff = new Date(`20${year}-${month}-${day}T${fixture.time || '15:00'}`);
    const now = new Date();
    const diff = kickoff - now;
    if (diff < 0) return 'upcoming'; // past but no result entered yet
    if (diff < 2 * 60 * 60 * 1000) return 'live';
    return 'upcoming';
  } catch {
    return 'upcoming';
  }
}

function StatusBadge({ status }) {
  const cfg = {
    completed: 'bg-green-100 text-green-700 border-green-200',
    live: 'bg-red-100 text-red-700 border-red-200',
    upcoming: 'bg-blue-50 text-blue-600 border-blue-200',
  };
  const labels = { completed: '✓ Result In', live: '● Live', upcoming: 'Upcoming' };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg[status]}`}>
      {labels[status]}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="card animate-pulse">
      <div className="h-3 bg-gray-200 rounded w-1/3 mb-4" />
      <div className="flex items-center justify-center gap-4 my-4">
        <div className="h-4 bg-gray-200 rounded w-24" />
        <div className="h-8 bg-gray-200 rounded w-16" />
        <div className="h-4 bg-gray-200 rounded w-24" />
      </div>
      <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto" />
    </div>
  );
}

function FixtureCard({ fixture, result }) {
  const status = getStatus(fixture, result ? { [fixture.id]: result } : {});

  return (
    <div className={`card hover:shadow-lg transition-all relative overflow-hidden ${
      status === 'completed' ? 'border-l-4 border-l-green-400' :
      status === 'live' ? 'border-l-4 border-l-red-400' :
      'border-l-4 border-l-blue-300'
    }`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-xs text-gray-400">{fixture.day}, {fixture.date}</p>
          <p className="text-xs text-gray-400">{fixture.time}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="bg-rnli-blue text-white text-[10px] font-bold px-2 py-0.5 rounded">
            GW{fixture.gameweek}
          </span>
          <StatusBadge status={status} />
        </div>
      </div>

      <div className="flex items-center justify-center gap-3 my-4">
        <div className="flex-1 text-right">
          <p className="font-bold text-sm leading-tight">{fixture.home_team}</p>
        </div>

        {result ? (
          <div className="bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg text-center min-w-[60px]">
            <p className="text-xl font-black text-green-700 leading-none">
              {result.actual_home}–{result.actual_away}
            </p>
            <p className="text-[9px] text-green-600 mt-0.5 font-medium">RESULT</p>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg text-center min-w-[60px]">
            <p className="text-sm font-bold text-gray-400">vs</p>
          </div>
        )}

        <div className="flex-1 text-left">
          <p className="font-bold text-sm leading-tight">{fixture.away_team}</p>
        </div>
      </div>

      {fixture.venue && (
        <div className="flex items-center justify-center gap-1 mt-2">
          <FiCalendar className="w-3 h-3 text-gray-400" />
          <p className="text-xs text-gray-400 truncate">{fixture.venue}</p>
        </div>
      )}
    </div>
  );
}

export default function Fixtures() {
  const [fixtures, setFixtures] = useState([]);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedGameweek, setSelectedGameweek] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchData();
  }, [selectedGameweek]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const fixturesParams = selectedGameweek !== 'all' ? { gameweek: selectedGameweek } : {};
      const [fixturesRes, resultsRes] = await Promise.all([
        fixturesAPI.getAll(fixturesParams),
        resultsAPI.get(),
      ]);

      const resultsLookup = {};
      resultsRes.data.results.forEach((r) => {
        resultsLookup[r.fixture_id] = r;
      });

      setFixtures(fixturesRes.data.fixtures);
      setResults(resultsLookup);
    } catch (error) {
      console.error('Error fetching fixtures:', error);
    } finally {
      setLoading(false);
    }
  };

  const gameweeks = Array.from({ length: 38 }, (_, i) => i + 1);

  const filtered = useMemo(() => {
    return fixtures.filter((f) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        f.home_team.toLowerCase().includes(q) ||
        f.away_team.toLowerCase().includes(q) ||
        f.venue?.toLowerCase().includes(q);

      const status = getStatus(f, results);
      const matchesStatus = statusFilter === 'all' || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [fixtures, results, searchQuery, statusFilter]);

  const grouped = useMemo(() => {
    if (selectedGameweek !== 'all') return null;
    const groups = {};
    filtered.forEach((f) => {
      const gw = f.gameweek;
      if (!groups[gw]) groups[gw] = [];
      groups[gw].push(f);
    });
    return Object.entries(groups)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([gw, fixtures]) => ({ gw: Number(gw), fixtures }));
  }, [filtered, selectedGameweek]);

  const completedCount = fixtures.filter((f) => results[f.id]).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-rnli-blue">Fixtures</h1>
          <p className="text-sm text-gray-500 mt-1">
            {fixtures.length} fixtures · {completedCount} results in
          </p>
        </div>
        <select
          value={selectedGameweek}
          onChange={(e) => { setSelectedGameweek(e.target.value); setSearchQuery(''); }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rnli-blue text-sm"
        >
          <option value="all">All Gameweeks</option>
          {gameweeks.map((gw) => (
            <option key={gw} value={gw}>Gameweek {gw}</option>
          ))}
        </select>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search teams or venue…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field pl-9 text-sm"
          />
        </div>
        <div className="relative">
          <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rnli-blue text-sm"
          >
            <option value="all">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="live">Live</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-400 text-lg">No fixtures found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your search or filters</p>
        </div>
      ) : grouped ? (
        <div className="space-y-8">
          {grouped.map(({ gw, fixtures: gwFixtures }) => (
            <div key={gw}>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-bold text-rnli-blue">Gameweek {gw}</h2>
                <span className="h-px flex-1 bg-gray-200" />
                <span className="text-xs text-gray-400 font-medium">{gwFixtures.length} matches</span>
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
