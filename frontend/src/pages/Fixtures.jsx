import { useState, useEffect } from 'react';
import { fixturesAPI, resultsAPI } from '../services/api';

export default function Fixtures() {
  const [fixtures, setFixtures] = useState([]);
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedGameweek, setSelectedGameweek] = useState('all');

  useEffect(() => {
    fetchData();
  }, [selectedGameweek]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch fixtures
      const fixturesParams = selectedGameweek !== 'all' ? { gameweek: selectedGameweek } : {};
      const fixturesRes = await fixturesAPI.getAll(fixturesParams);

      // Fetch all results
      const resultsRes = await resultsAPI.get();

      // Create results lookup by fixture_id
      const resultsLookup = {};
      resultsRes.data.results.forEach(r => {
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

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-rnli-blue mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading fixtures...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-rnli-blue">Fixtures</h1>

        <div>
          <label htmlFor="gameweek" className="mr-2 text-sm font-semibold">Gameweek:</label>
          <select
            id="gameweek"
            value={selectedGameweek}
            onChange={(e) => setSelectedGameweek(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rnli-blue"
          >
            <option value="all">All</option>
            {gameweeks.map(gw => (
              <option key={gw} value={gw}>Gameweek {gw}</option>
            ))}
          </select>
        </div>
      </div>

      {fixtures.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-600">No fixtures found</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fixtures.map((fixture) => {
            const result = results[fixture.id];
            const hasResult = !!result;

            return (
              <div key={fixture.id} className="card hover:shadow-lg transition-shadow relative">
                <div className="absolute top-4 right-4">
                  <span className="bg-rnli-blue text-white text-xs font-bold px-2 py-1 rounded">
                    GW{fixture.gameweek}
                  </span>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-600">{fixture.day}, {fixture.date}</p>
                  <p className="text-sm text-gray-600">{fixture.time}</p>
                </div>

                <div className="text-center my-6">
                  <div className="flex items-center justify-center space-x-4">
                    <div className="flex-1 text-right">
                      <p className="font-bold text-lg">{fixture.home_team}</p>
                    </div>

                    {hasResult ? (
                      <div className="bg-green-100 px-4 py-2 rounded-lg">
                        <p className="text-2xl font-bold text-green-700">
                          {result.actual_home} - {result.actual_away}
                        </p>
                      </div>
                    ) : (
                      <div className="text-gray-400 font-bold text-xl px-4">vs</div>
                    )}

                    <div className="flex-1 text-left">
                      <p className="font-bold text-lg">{fixture.away_team}</p>
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-xs text-gray-500">{fixture.venue}</p>
                </div>

                {hasResult && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs text-green-600 font-semibold text-center">
                      ✓ Result Entered
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
