import { useState, useEffect, useCallback } from 'react';
import { fixturesAPI, predictionsAPI, resultsAPI } from '../services/api';
import toast from 'react-hot-toast';
import { FiSave, FiZap, FiLock, FiCheck, FiStar } from 'react-icons/fi';

// A fixture is locked for predictions if kickoff has passed (and a kickoff time
// is known) or if it has been postponed. Null kickoff_time = never locked.
function getFixtureLock(fixture) {
  if (fixture.status === 'postponed') {
    return { locked: true, reason: 'postponed', label: 'Postponed' };
  }
  if (fixture.kickoff_time) {
    const kickoff = new Date(fixture.kickoff_time);
    if (!Number.isNaN(kickoff.getTime()) && Date.now() >= kickoff.getTime()) {
      return { locked: true, reason: 'kickoff', label: 'Locked' };
    }
  }
  return { locked: false, reason: null, label: null };
}

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
  const [savedOnServer, setSavedOnServer] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [selectedGameweek, setSelectedGameweek] = useState(1);
  const [quickPickTarget, setQuickPickTarget] = useState(null); // fixtureId
  // Fixture IDs (for the selected gameweek) that already have a result entered.
  const [resultIds, setResultIds] = useState(new Set());
  // Gameweek numbers where EVERY fixture has a result — used to grey/mark
  // options in the dropdown. Populated lazily on mount; never blocks render.
  const [completedGameweeks, setCompletedGameweeks] = useState(new Set());
  // Gameweek numbers the current user has activated a wildcard for (x2 points).
  const [wildcardGameweeks, setWildcardGameweeks] = useState(new Set());
  const [wildcardSaving, setWildcardSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Results are fetched alongside fixtures/predictions but must not break the
      // page if the endpoint 404s / errors — hence allSettled with a graceful default.
      const [fixturesRes, predictionsRes, resultsRes] = await Promise.allSettled([
        fixturesAPI.getByGameweek(selectedGameweek),
        predictionsAPI.getByGameweek(selectedGameweek),
        resultsAPI.getByGameweek(selectedGameweek),
      ]);

      if (fixturesRes.status !== 'fulfilled' || predictionsRes.status !== 'fulfilled') {
        throw fixturesRes.reason ?? predictionsRes.reason;
      }

      const predictionsLookup = {};
      predictionsRes.value.data.predictions.forEach((p) => {
        predictionsLookup[p.fixture_id] = {
          home: p.predicted_home,
          away: p.predicted_away,
        };
      });

      // Default to an empty set if results failed or returned an unexpected shape.
      const resultFixtureIds =
        resultsRes.status === 'fulfilled'
          ? (resultsRes.value.data?.results ?? []).map((r) => r.fixture_id)
          : [];

      setFixtures(fixturesRes.value.data.fixtures);
      setPredictions(predictionsLookup);
      setSavedOnServer(new Set(predictionsRes.value.data.predictions.map((p) => p.fixture_id)));
      setResultIds(new Set(resultFixtureIds));
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

  // Mark which gameweeks are fully resulted (every fixture has a result), used
  // to grey/mark dropdown options. A single backend call does the work that the
  // client used to do with 38 paired requests. Non-blocking; never breaks the
  // page if it errors. The empty-gameweek-is-not-complete semantics live in the
  // endpoint, so we just consume the returned list.
  useEffect(() => {
    let cancelled = false;

    const loadCompletedGameweeks = async () => {
      try {
        const res = await resultsAPI.getCompletedGameweeks();
        if (cancelled) return;
        const completed = new Set(res.data?.completed_gameweeks ?? []);
        setCompletedGameweeks(completed);
        const firstOpen = Array.from({ length: 38 }, (_, i) => i + 1).find((gw) => !completed.has(gw));
        if (firstOpen) setSelectedGameweek(firstOpen);
      } catch (error) {
        // Dropdown markers are a non-critical enhancement — log and move on.
        console.error('Error loading completed gameweeks:', error);
      }
    };

    loadCompletedGameweeks();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load the user's active wildcard gameweeks once on mount. Non-blocking: a
  // failure just means the toggle starts from an unknown-empty state.
  useEffect(() => {
    let cancelled = false;
    predictionsAPI
      .getWildcards()
      .then((res) => {
        if (cancelled) return;
        setWildcardGameweeks(new Set(res.data?.gameweeks ?? []));
      })
      .catch((error) => {
        console.error('Error loading wildcards:', error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Whether the selected gameweek is locked for wildcard changes. The backend
  // gate is "any result exists for the gameweek"; resultIds holds exactly the
  // selected gameweek's resulted fixtures, and completedGameweeks is a fallback
  // for fully-resulted gameweeks. Either being set means results are in.
  const wildcardActive = wildcardGameweeks.has(selectedGameweek);
  const wildcardLocked = resultIds.size > 0 || completedGameweeks.has(selectedGameweek);

  const toggleWildcard = async () => {
    if (wildcardLocked) return;
    setWildcardSaving(true);
    const activating = !wildcardActive;
    try {
      if (activating) {
        await predictionsAPI.activateWildcard(selectedGameweek);
        setWildcardGameweeks((prev) => new Set([...prev, selectedGameweek]));
        toast.success(`Wildcard activated for Gameweek ${selectedGameweek} — points doubled!`);
      } else {
        await predictionsAPI.deactivateWildcard(selectedGameweek);
        setWildcardGameweeks((prev) => {
          const next = new Set(prev);
          next.delete(selectedGameweek);
          return next;
        });
        toast.success(`Wildcard removed for Gameweek ${selectedGameweek}`);
      }
    } catch (error) {
      if (error.response?.status === 403) {
        // Results came in between load and click — reflect the locked state.
        toast.error('Results are in for this gameweek — wildcard is locked');
      } else {
        toast.error('Failed to update wildcard');
      }
    } finally {
      setWildcardSaving(false);
    }
  };

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
    const pred = predictions[fixture.id] ?? { home: 0, away: 0 };
    try {
      setSavingId(fixture.id);
      await predictionsAPI.submit({
        fixture_id: fixture.id,
        gameweek: selectedGameweek,
        predicted_home: parseInt(pred.home) || 0,
        predicted_away: parseInt(pred.away) || 0,
      });
      setSavedOnServer((prev) => new Set([...prev, fixture.id]));
      toast.success(`${fixture.home_team} vs ${fixture.away_team} saved!`);
    } catch (error) {
      const status = error.response?.status;
      if (status === 400) {
        // Backend blocks edits once an admin has entered the result.
        toast.error('Predictions are closed — result already submitted');
        // Reflect the closed state immediately so the row updates without a reload.
        setResultIds((prev) => new Set([...prev, fixture.id]));
      } else if (status === 403) {
        // Kickoff lock.
        toast.error('This fixture is locked — kickoff has passed');
      } else {
        toast.error('Failed to save prediction');
      }
    } finally {
      setSavingId(null);
    }
  };

  // Fixtures still open for predictions: not kickoff/postponed-locked and
  // without a result already entered. Single source of truth for both the
  // "Save All" count and what saveAll actually attempts, so they can't drift.
  const savableFixtures = fixtures.filter(
    (f) => !getFixtureLock(f).locked && !resultIds.has(f.id)
  );

  const saveAll = async () => {
    if (savableFixtures.length === 0) return;
    setBulkSaving(true);
    // Promise.allSettled never rejects, so each outcome is categorised below
    // and bulkSaving is reset in finally.
    try {
      const settledResults = await Promise.allSettled(
        savableFixtures.map((fixture) => {
          const pred = predictions[fixture.id] ?? { home: 0, away: 0 };
          return predictionsAPI.submit({
            fixture_id: fixture.id,
            gameweek: selectedGameweek,
            predicted_home: parseInt(pred.home, 10) || 0,
            predicted_away: parseInt(pred.away, 10) || 0,
          });
        })
      );
      // Categorise each outcome:
      //  - fulfilled        → genuinely saved (mark predicted)
      //  - rejected w/ 400   → result entered mid-save; close the row
      //  - rejected w/ 403   → kickoff lock won the race; surface to user
      //  - anything else     → genuine failure; surface to user
      const savedFixtureIds = [];
      const resultClosedFixtureIds = [];
      let kickoffLockedCount = 0;
      let failedCount = 0;
      settledResults.forEach((r, i) => {
        const fixtureId = savableFixtures[i].id;
        if (r.status === 'fulfilled') {
          savedFixtureIds.push(fixtureId);
          return;
        }
        const status = r.reason?.response?.status;
        if (status === 400) {
          resultClosedFixtureIds.push(fixtureId);
        } else if (status === 403) {
          kickoffLockedCount += 1;
        } else {
          failedCount += 1;
        }
      });

      setSavedOnServer((prev) => new Set([...prev, ...savedFixtureIds]));
      if (resultClosedFixtureIds.length > 0) {
        setResultIds((prev) => new Set([...prev, ...resultClosedFixtureIds]));
      }

      const saved = savedFixtureIds.length;
      if (saved > 0) {
        toast.success(`${saved} prediction${saved !== 1 ? 's' : ''} saved!`);
      }
      if (kickoffLockedCount > 0) {
        toast.error(
          `${kickoffLockedCount} fixture${kickoffLockedCount !== 1 ? 's' : ''} locked — kickoff has passed`
        );
      }
      if (failedCount > 0) {
        toast.error(
          `${failedCount} prediction${failedCount !== 1 ? 's' : ''} failed to save`
        );
      }
    } finally {
      setBulkSaving(false);
    }
  };

  const gameweeks = Array.from({ length: 38 }, (_, i) => i + 1);
  const predictedCount = fixtures.filter((f) => savedOnServer.has(f.id)).length;
  const maxPts = predictedCount * 5;
  const openCount = fixtures.filter((f) => !getFixtureLock(f).locked && !resultIds.has(f.id)).length;

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
          {gameweeks.map((gw) => {
            const resultsIn = completedGameweeks.has(gw);
            return (
              <option
                key={gw}
                value={gw}
              >
                Gameweek {gw}{resultsIn ? ' (Results in)' : ''}
              </option>
            );
          })}
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
            disabled={bulkSaving || openCount === 0}
            className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap disabled:opacity-50"
          >
            {bulkSaving ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Saving…</>
            ) : (
              <><FiSave className="w-4 h-4" />Save All ({openCount})</>
            )}
          </button>
        </div>
      </div>

      {/* Wildcard control */}
      <div
        className={`card border py-4 transition-colors ${
          wildcardActive
            ? 'bg-amber-50 border-amber-300'
            : 'bg-white border-gray-200'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                wildcardActive ? 'bg-amber-400 text-white' : 'bg-gray-100 text-gray-400'
              }`}
            >
              <FiStar className={`w-5 h-5 ${wildcardActive ? 'fill-current' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-gray-800">Wildcard</h2>
                {wildcardActive && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-400 text-white uppercase tracking-wide">
                    Active
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                {wildcardLocked
                  ? 'Results are in — the wildcard is locked for this gameweek.'
                  : wildcardActive
                  ? `All your points for Gameweek ${selectedGameweek} will be doubled (x2).`
                  : `Double all your points for Gameweek ${selectedGameweek}. You can change this any time before results are entered.`}
              </p>
            </div>
          </div>
          <button
            onClick={toggleWildcard}
            disabled={wildcardLocked || wildcardSaving}
            className={`flex items-center justify-center gap-2 text-sm font-semibold py-2 px-4 rounded-lg whitespace-nowrap transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              wildcardActive
                ? 'bg-white border border-amber-400 text-amber-700 hover:bg-amber-100'
                : 'bg-amber-400 text-white hover:bg-amber-500'
            }`}
          >
            {wildcardSaving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
            ) : wildcardLocked ? (
              <><FiLock className="w-4 h-4" /> Locked</>
            ) : wildcardActive ? (
              'Remove Wildcard'
            ) : (
              <><FiStar className="w-4 h-4" /> Activate Wildcard</>
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
            const pred = predictions[fixture.id] || { home: 0, away: 0 };
            const hasPrediction = savedOnServer.has(fixture.id);
            const isSaving = savingId === fixture.id;
            const { locked: kickoffLocked, reason: lockReason } = getFixtureLock(fixture);
            const hasResult = resultIds.has(fixture.id);
            // A fixture is "closed" (inputs disabled, no Save button) if it's
            // kickoff/postponed-locked OR a result has been submitted.
            const closed = kickoffLocked || hasResult;
            // Label precedence: a submitted result is the most final state, but
            // postponed is a distinct, meaningful state we keep surfacing.
            // Otherwise fall back to the kickoff "Locked" label.
            const reason = lockReason === 'postponed' ? 'postponed' : hasResult ? 'result' : lockReason;
            const closedLabel =
              reason === 'postponed' ? 'Postponed' : reason === 'result' ? 'Result submitted' : 'Locked';
            const ClosedIcon = reason === 'result' ? FiCheck : FiLock;
            const showQuickPick = quickPickTarget === fixture.id && !closed;

            return (
              <div
                key={fixture.id}
                className={`card transition-all ${
                  closed
                    ? 'bg-gray-100 border border-gray-200 opacity-75'
                    : hasPrediction
                    ? 'border-2 border-green-400 bg-green-50'
                    : 'hover:shadow-md'
                }`}
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
                    {closed && (
                      <div className="flex justify-center mt-1.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            reason === 'postponed'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-gray-200 text-gray-600'
                          }`}
                        >
                          <ClosedIcon className="w-2.5 h-2.5" /> {closedLabel}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Score Inputs */}
                  <div className="md:col-span-4 flex items-center justify-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={pred.home}
                      disabled={closed}
                      onChange={(e) => handleChange(fixture.id, 'home', e.target.value)}
                      className="w-14 px-2 py-2 border border-gray-300 rounded-lg text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rnli-blue disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                      placeholder="0"
                    />
                    <span className="font-bold text-gray-400">–</span>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={pred.away}
                      disabled={closed}
                      onChange={(e) => handleChange(fixture.id, 'away', e.target.value)}
                      className="w-14 px-2 py-2 border border-gray-300 rounded-lg text-center text-sm font-bold focus:outline-none focus:ring-2 focus:ring-rnli-blue disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                      placeholder="0"
                    />
                    {!closed && (
                      <button
                        type="button"
                        onClick={() => setQuickPickTarget(showQuickPick ? null : fixture.id)}
                        className="text-rnli-blue hover:text-rnli-blue-light p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                        title="Quick Pick"
                      >
                        <FiZap className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Save Button */}
                  <div className="md:col-span-2">
                    {closed ? (
                      <div className="w-full text-sm py-2 px-3 rounded-lg font-semibold flex items-center justify-center gap-1.5 bg-gray-200 text-gray-500 cursor-not-allowed">
                        <ClosedIcon className="w-3.5 h-3.5" /> {closedLabel}
                      </div>
                    ) : (
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
                    )}
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
