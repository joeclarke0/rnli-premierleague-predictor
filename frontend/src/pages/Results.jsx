import { useState, useEffect } from 'react';
import { fixturesAPI, resultsAPI } from '../services/api';

export default function Results() {
  const [fixtures, setFixtures] = useState([]);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedGameweek, setSelectedGameweek] = useState(1);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchData();
  }, [selectedGameweek]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch fixtures for selected gameweek
      const fixturesRes = await fixturesAPI.getByGameweek(selectedGameweek);

      // Fetch results for selected gameweek
      const resultsRes = await resultsAPI.getByGameweek(selectedGameweek);

      // Create results lookup by fixture_id
      const resultsLookup = {};
      resultsRes.data.results.forEach(r => {
        resultsLookup[r.fixture_id] = {
          home: r.actual_home,
          away: r.actual_away
        };
      });

      setFixtures(fixturesRes.data.fixtures);
      setResults(resultsLookup);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: 'Failed to load fixtures and results' });
    } finally {
      setLoading(false);
    }
  };

  const handleResultChange = (fixtureId, type, value) => {
    setResults(prev => ({
      ...prev,
      [fixtureId]: {
        ...prev[fixtureId],
        [type]: value
      }
    }));
  };

  const handleSubmit = async (fixture) => {
    const result = results[fixture.id];
    if (!result || result.home === undefined || result.away === undefined) {
      setMessage({ type: 'error', text: 'Please enter both scores' });
      return;
    }

    try {
      setSaving(true);
      await resultsAPI.submit({
        fixture_id: fixture.id,
        gameweek: selectedGameweek,
        actual_home: parseInt(result.home) || 0,
        actual_away: parseInt(result.away) || 0
      });

      setMessage({ type: 'success', text: '✓ Result saved!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error saving result:', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Failed to save result' });
    } finally {
      setSaving(false);
    }
  };

  const gameweeks = Array.from({ length: 38 }, (_, i) => i + 1);
  const resultsCount = fixtures.filter(f => results[f.id]?.home !== undefined).length;

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rnli-blue mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-rnli-blue">Results Entry</h1>
          <p className="text-sm text-gray-600 mt-1">Admin Only</p>
        </div>

        <div>
          <label htmlFor="gameweek" className="mr-2 text-sm font-semibold">Gameweek:</label>
          <select
            id="gameweek"
            value={selectedGameweek}
            onChange={(e) => setSelectedGameweek(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rnli-blue"
          >
            {gameweeks.map(gw => (
              <option key={gw} value={gw}>Gameweek {gw}</option>
            ))}
          </select>
        </div>
      </div>

      {message.text && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}

      <div className="card bg-yellow-50">
        <p className="text-sm">
          <span className="font-semibold">Progress:</span> {resultsCount} of {fixtures.length} results entered
        </p>
      </div>

      <div className="space-y-4">
        {fixtures.map((fixture) => {
          const result = results[fixture.id] || { home: '', away: '' };
          const hasResult = result.home !== '' && result.home !== undefined;

          return (
            <div
              key={fixture.id}
              className={`card ${hasResult ? 'border-2 border-green-500' : ''}`}
            >
              <div className="grid md:grid-cols-12 gap-4 items-center">
                {/* Date/Time */}
                <div className="md:col-span-2">
                  <p className="text-xs text-gray-600">{fixture.day}</p>
                  <p className="text-sm font-semibold">{fixture.date}</p>
                  <p className="text-xs text-gray-600">{fixture.time}</p>
                </div>

                {/* Teams */}
                <div className="md:col-span-5 text-center">
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{fixture.home_team}</span>
                    <span className="text-gray-400 mx-2">vs</span>
                    <span className="font-bold">{fixture.away_team}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{fixture.venue}</p>
                </div>

                {/* Result Inputs */}
                <div className="md:col-span-3 flex items-center justify-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={result.home}
                    onChange={(e) => handleResultChange(fixture.id, 'home', e.target.value)}
                    className="w-16 px-2 py-2 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-rnli-blue"
                    placeholder="0"
                  />
                  <span className="font-bold">-</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={result.away}
                    onChange={(e) => handleResultChange(fixture.id, 'away', e.target.value)}
                    className="w-16 px-2 py-2 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-rnli-blue"
                    placeholder="0"
                  />
                </div>

                {/* Save Button */}
                <div className="md:col-span-2">
                  <button
                    onClick={() => handleSubmit(fixture)}
                    disabled={saving}
                    className="btn-primary w-full text-sm"
                  >
                    {hasResult ? 'Update' : 'Submit'}
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
