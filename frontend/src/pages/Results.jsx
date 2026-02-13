import { useState, useEffect } from 'react';
import { fixturesAPI, resultsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { FiSave, FiCheckCircle } from 'react-icons/fi';

export default function Results() {
  const [fixtures, setFixtures] = useState([]);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [selectedGameweek, setSelectedGameweek] = useState(1);

  useEffect(() => {
    fetchData();
  }, [selectedGameweek]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [fixturesRes, resultsRes] = await Promise.all([
        fixturesAPI.getByGameweek(selectedGameweek),
        resultsAPI.getByGameweek(selectedGameweek),
      ]);

      const resultsLookup = {};
      resultsRes.data.results.forEach((r) => {
        resultsLookup[r.fixture_id] = { home: r.actual_home, away: r.actual_away };
      });

      setFixtures(fixturesRes.data.fixtures);
      setResults(resultsLookup);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load fixtures');
    } finally {
      setLoading(false);
    }
  };

  const handleResultChange = (fixtureId, type, value) => {
    setResults((prev) => ({
      ...prev,
      [fixtureId]: { ...prev[fixtureId], [type]: value },
    }));
  };

  const handleSubmit = async (fixture) => {
    const result = results[fixture.id];
    if (!result || result.home === undefined || result.away === undefined || result.home === '' || result.away === '') {
      toast.error('Please enter both scores');
      return;
    }

    try {
      setSavingId(fixture.id);
      await resultsAPI.submit({
        fixture_id: fixture.id,
        gameweek: selectedGameweek,
        actual_home: parseInt(result.home) || 0,
        actual_away: parseInt(result.away) || 0,
      });
      toast.success(`${fixture.home_team} ${result.home}–${result.away} ${fixture.away_team} saved!`);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save result');
    } finally {
      setSavingId(null);
    }
  };

  const gameweeks = Array.from({ length: 38 }, (_, i) => i + 1);
  const resultsCount = fixtures.filter((f) => results[f.id]?.home !== undefined && results[f.id]?.home !== '').length;
  const progressPct = fixtures.length ? Math.round((resultsCount / fixtures.length) * 100) : 0;

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rnli-blue mx-auto" />
        <p className="mt-4 text-gray-500 text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-rnli-blue">Results Entry</h1>
          <p className="text-xs text-gray-500 mt-1 inline-flex items-center gap-1 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
            🔒 Admin Only
          </p>
        </div>
        <select
          value={selectedGameweek}
          onChange={(e) => setSelectedGameweek(parseInt(e.target.value))}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rnli-blue text-sm"
        >
          {gameweeks.map((gw) => (
            <option key={gw} value={gw}>Gameweek {gw}</option>
          ))}
        </select>
      </div>

      {/* Progress card */}
      <div className="card bg-amber-50 border border-amber-200 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-gray-700">
                Gameweek {selectedGameweek} Progress
              </span>
              <span className="font-bold text-amber-700">
                {resultsCount}/{fixtures.length} ({progressPct}%)
              </span>
            </div>
            <div className="w-full bg-amber-100 rounded-full h-2.5">
              <div
                className="bg-amber-500 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
          {resultsCount === fixtures.length && fixtures.length > 0 && (
            <div className="flex items-center gap-2 text-green-700 font-semibold text-sm">
              <FiCheckCircle className="w-5 h-5" />
              All results entered!
            </div>
          )}
        </div>
      </div>

      {/* Fixture rows */}
      <div className="space-y-3">
        {fixtures.map((fixture) => {
          const result = results[fixture.id] || { home: '', away: '' };
          const hasResult = result.home !== '' && result.home !== undefined;
          const isSaving = savingId === fixture.id;

          return (
            <div
              key={fixture.id}
              className={`card transition-all ${hasResult ? 'border-2 border-green-400 bg-green-50' : 'hover:shadow-md'}`}
            >
              <div className="grid md:grid-cols-12 gap-4 items-center">
                {/* Date */}
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-500">{fixture.day}</p>
                  <p className="text-xs font-semibold text-gray-700">{fixture.date}</p>
                  <p className="text-xs text-gray-500">{fixture.time}</p>
                </div>

                {/* Teams + Venue */}
                <div className="md:col-span-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-sm flex-1 text-right">{fixture.home_team}</span>
                    <span className="text-gray-400 text-sm">vs</span>
                    <span className="font-bold text-sm flex-1 text-left">{fixture.away_team}</span>
                  </div>
                  {fixture.venue && (
                    <p className="text-xs text-gray-400 text-center mt-1">{fixture.venue}</p>
                  )}
                </div>

                {/* Result Inputs */}
                <div className="md:col-span-3 flex items-center justify-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={result.home}
                    onChange={(e) => handleResultChange(fixture.id, 'home', e.target.value)}
                    className="w-14 px-2 py-2 border border-gray-300 rounded-lg text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rnli-blue"
                    placeholder="0"
                  />
                  <span className="font-bold text-gray-400">–</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={result.away}
                    onChange={(e) => handleResultChange(fixture.id, 'away', e.target.value)}
                    className="w-14 px-2 py-2 border border-gray-300 rounded-lg text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rnli-blue"
                    placeholder="0"
                  />
                </div>

                {/* Save Button */}
                <div className="md:col-span-2">
                  <button
                    onClick={() => handleSubmit(fixture)}
                    disabled={isSaving}
                    className={`w-full text-sm py-2 px-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                      hasResult
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'btn-primary'
                    }`}
                  >
                    {isSaving ? (
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                    ) : (
                      <>
                        <FiSave className="w-3.5 h-3.5" />
                        {hasResult ? 'Update' : 'Submit'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
