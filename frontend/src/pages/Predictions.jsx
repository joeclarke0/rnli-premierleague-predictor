import { useState, useEffect, useCallback } from 'react';
import { fixturesAPI, predictionsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { FiSave, FiZap } from 'react-icons/fi';

const QUICK_PICKS = [
  { label: '1–0', home: 1, away: 0 },
  { label: '2–0', home: 2, away: 0 },
  { label: '2–1', home: 2, away: 1 },
  { label: '1–1', home: 1, away: 1 },
  { label: '0–1', home: 0, away: 1 },
  { label: '0–2', home: 0, away: 2 },
];

function SkeletonRow() {
  return (
    <div className="card animate-pulse">
      <div className="grid md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-2 space-y-1.5">
          <div className="h-3 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-1/2" />
        </div>
        <div className="md:col-span-5">
          <div className="flex items-center justify-between gap-4">
            <div className="h-4 bg-gray-200 rounded flex-1" />
            <div className="h-4 bg-gray-200 rounded w-6" />
            <div className="h-4 bg-gray-200 rounded flex-1" />
          </div>
        </div>
        <div className="md:col-span-3 flex gap-2 justify-center">
          <div className="h-10 bg-gray-200 rounded w-14" />
          <div className="h-4 bg-gray-200 rounded w-4 self-center" />
          <div className="h-10 bg-gray-200 rounded w-14" />
        </div>
        <div className="md:col-span-2">
          <div className="h-10 bg-gray-200 rounded" />
        </div>
      </div>
    </div>
  );
}

export default function Predictions() {
  const [fixtures, setFixtures] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [selectedGameweek, setSelectedGameweek] = useState(1);
  const [quickPickTarget, setQuickPickTarget] = useState(null); // fixtureId

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [fixturesRes, predictionsRes] = await Promise.all([
        fixturesAPI.getByGameweek(selectedGameweek),
        predictionsAPI.getByGameweek(selectedGameweek),
      ]);

      const predictionsLookup = {};
      predictionsRes.data.predictions.forEach((p) => {
        predictionsLookup[p.fixture_id] = {
          home: p.predicted_home,
          away: p.predicted_away,
        };
      });

      setFixtures(fixturesRes.data.fixtures);
      setPredictions(predictionsLookup);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load fixtures');
    } finally {
      setLoading(false);
    }
  }, [selectedGameweek]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChange = (fixtureId, type, value) => {
    setPredictions((prev) => ({
      ...prev,
      [fixtureId]: { ...prev[fixtureId], [type]: value },
    }));
  };

  const handleQuickPick = (fixtureId, home, away) => {
    setPredictions((prev) => ({
      ...prev,
      [fixtureId]: { home, away },
    }));
    setQuickPickTarget(null);
  };

  const saveSingle = async (fixture) => {
    const pred = predictions[fixture.id];
    if (pred?.home === undefined || pred?.away === undefined || pred?.home === '' || pred?.away === '') {
      toast.error('Please enter both scores');
      return;
    }
    try {
      setSavingId(fixture.id);
      await predictionsAPI.submit({
        fixture_id: fixture.id,
        gameweek: selectedGameweek,
        predicted_home: parseInt(pred.home) || 0,
        predicted_away: parseInt(pred.away) || 0,
      });
      toast.success(`${fixture.home_team} vs ${fixture.away_team} saved!`);
    } catch {
      toast.error('Failed to save prediction');
    } finally {
      setSavingId(null);
    }
  };

  const saveAll = async () => {
    const toSave = fixtures.filter((f) => {
      const p = predictions[f.id];
      return p?.home !== undefined && p?.away !== undefined && p?.home !== '' && p?.away !== '';
    });
    if (toSave.length === 0) {
      toast.error('No predictions to save');
      return;
    }
    setBulkSaving(true);
    let saved = 0;
    for (const fixture of toSave) {
      const pred = predictions[fixture.id];
      try {
        await predictionsAPI.submit({
          fixture_id: fixture.id,
          gameweek: selectedGameweek,
          predicted_home: parseInt(pred.home) || 0,
          predicted_away: parseInt(pred.away) || 0,
        });
        saved++;
      } catch {
        // continue
      }
    }
    toast.success(`${saved} prediction${saved !== 1 ? 's' : ''} saved!`);
    setBulkSaving(false);
  };

  const gameweeks = Array.from({ length: 38 }, (_, i) => i + 1);
  const predictedCount = fixtures.filter((f) => {
    const p = predictions[f.id];
    return p?.home !== undefined && p?.home !== '';
  }).length;
  const maxPts = predictedCount * 5;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-rnli-blue">My Predictions</h1>
          <p className="text-sm text-gray-500 mt-1">
            {predictedCount} of {fixtures.length} predicted · max {maxPts} pts possible
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

      {/* Progress + Bulk Save */}
      <div className="card bg-blue-50 border border-blue-100 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-semibold text-gray-700">Progress</span>
              <span className="text-gray-500">{predictedCount}/{fixtures.length}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-rnli-blue h-2.5 rounded-full transition-all duration-500"
                style={{ width: fixtures.length ? `${(predictedCount / fixtures.length) * 100}%` : '0%' }}
              />
            </div>
          </div>
          <button
            onClick={saveAll}
            disabled={bulkSaving || predictedCount === 0}
            className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap"
          >
            {bulkSaving ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Saving…</>
            ) : (
              <><FiSave className="w-4 h-4" />Save All ({predictedCount})</>
            )}
          </button>
        </div>
      </div>

      {/* Fixture rows */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
        ) : fixtures.length === 0 ? (
          <div className="card text-center py-12 text-gray-400">
            No fixtures for this gameweek
          </div>
        ) : (
          fixtures.map((fixture) => {
            const pred = predictions[fixture.id] || { home: '', away: '' };
            const hasPrediction = pred.home !== '' && pred.home !== undefined;
            const isSaving = savingId === fixture.id;
            const showQuickPick = quickPickTarget === fixture.id;

            return (
              <div
                key={fixture.id}
                className={`card transition-all ${hasPrediction ? 'border-2 border-green-400 bg-green-50' : 'hover:shadow-md'}`}
              >
                <div className="grid md:grid-cols-12 gap-4 items-center">
                  {/* Date */}
                  <div className="md:col-span-2">
                    <p className="text-xs text-gray-500">{fixture.day}</p>
                    <p className="text-xs font-semibold text-gray-700">{fixture.date}</p>
                    <p className="text-xs text-gray-500">{fixture.time}</p>
                  </div>

                  {/* Teams */}
                  <div className="md:col-span-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm flex-1 text-right">{fixture.home_team}</span>
                      <span className="text-gray-400 text-sm font-medium">vs</span>
                      <span className="font-bold text-sm flex-1 text-left">{fixture.away_team}</span>
                    </div>
                  </div>

                  {/* Score Inputs */}
                  <div className="md:col-span-4 flex items-center justify-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={pred.home}
                      onChange={(e) => handleChange(fixture.id, 'home', e.target.value)}
                      className="w-14 px-2 py-2 border border-gray-300 rounded-lg text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rnli-blue"
                      placeholder="0"
                    />
                    <span className="font-bold text-gray-400">–</span>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={pred.away}
                      onChange={(e) => handleChange(fixture.id, 'away', e.target.value)}
                      className="w-14 px-2 py-2 border border-gray-300 rounded-lg text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rnli-blue"
                      placeholder="0"
                    />
                    <button
                      type="button"
                      onClick={() => setQuickPickTarget(showQuickPick ? null : fixture.id)}
                      className="text-rnli-blue hover:text-rnli-blue-light p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                      title="Quick Pick"
                    >
                      <FiZap className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Save Button */}
                  <div className="md:col-span-2">
                    <button
                      onClick={() => saveSingle(fixture)}
                      disabled={isSaving}
                      className={`w-full text-sm py-2 px-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                        hasPrediction
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'btn-primary'
                      }`}
                    >
                      {isSaving ? (
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" />
                      ) : (
                        <>{hasPrediction ? '✓ Update' : 'Save'}</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Quick Pick Panel */}
                {showQuickPick && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 font-semibold mb-2 flex items-center gap-1">
                      <FiZap className="w-3 h-3" /> Quick Pick
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_PICKS.map((qp) => (
                        <button
                          key={qp.label}
                          onClick={() => handleQuickPick(fixture.id, qp.home, qp.away)}
                          className="px-3 py-1 bg-white border border-gray-300 rounded-lg text-xs font-bold hover:border-rnli-blue hover:text-rnli-blue transition-colors"
                        >
                          {qp.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
