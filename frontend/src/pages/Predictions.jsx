import { useState, useEffect } from 'react';
import { fixturesAPI, predictionsAPI } from '../services/api';

export default function Predictions() {
  const [fixtures, setFixtures] = useState([]);
  const [predictions, setPredictions] = useState({});
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

      // Fetch user's predictions for selected gameweek
      const predictionsRes = await predictionsAPI.getByGameweek(selectedGameweek);

      // Create predictions lookup by fixture_id
      const predictionsLookup = {};
      predictionsRes.data.predictions.forEach(p => {
        predictionsLookup[p.fixture_id] = {
          home: p.predicted_home,
          away: p.predicted_away
        };
      });

      setFixtures(fixturesRes.data.fixtures);
      setPredictions(predictionsLookup);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: 'Failed to load fixtures and predictions' });
    } finally {
      setLoading(false);
    }
  };

  const handlePredictionChange = (fixtureId, type, value) => {
    setPredictions(prev => ({
      ...prev,
      [fixtureId]: {
        ...prev[fixtureId],
        [type]: value
      }
    }));
  };

  const handleSubmit = async (fixture) => {
    const prediction = predictions[fixture.id];
    if (!prediction || prediction.home === undefined || prediction.away === undefined) {
      setMessage({ type: 'error', text: 'Please enter both scores' });
      return;
    }

    try {
      setSaving(true);
      await predictionsAPI.submit({
        fixture_id: fixture.id,
        gameweek: selectedGameweek,
        predicted_home: parseInt(prediction.home) || 0,
        predicted_away: parseInt(prediction.away) || 0
      });

      setMessage({ type: 'success', text: '✓ Prediction saved!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error saving prediction:', error);
      setMessage({ type: 'error', text: 'Failed to save prediction' });
    } finally {
      setSaving(false);
    }
  };

  const gameweeks = Array.from({ length: 38 }, (_, i) => i + 1);

  const predictedCount = fixtures.filter(f => predictions[f.id]?.home !== undefined).length;

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
        <h1 className="text-3xl font-bold text-rnli-blue">My Predictions</h1>

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

      <div className="card bg-blue-50">
        <p className="text-sm">
          <span className="font-semibold">Progress:</span> {predictedCount} of {fixtures.length} fixtures predicted
        </p>
      </div>

      <div className="space-y-4">
        {fixtures.map((fixture) => {
          const prediction = predictions[fixture.id] || { home: '', away: '' };
          const hasPrediction = prediction.home !== '' && prediction.home !== undefined;

          return (
            <div
              key={fixture.id}
              className={`card ${hasPrediction ? 'border-2 border-green-500' : ''}`}
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
                </div>

                {/* Prediction Inputs */}
                <div className="md:col-span-3 flex items-center justify-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={prediction.home}
                    onChange={(e) => handlePredictionChange(fixture.id, 'home', e.target.value)}
                    className="w-16 px-2 py-2 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-rnli-blue"
                    placeholder="0"
                  />
                  <span className="font-bold">-</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={prediction.away}
                    onChange={(e) => handlePredictionChange(fixture.id, 'away', e.target.value)}
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
                    {hasPrediction ? 'Update' : 'Save'}
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
