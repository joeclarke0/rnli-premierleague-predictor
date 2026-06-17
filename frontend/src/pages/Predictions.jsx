import { useState, useEffect, useCallback } from 'react';
import { fixturesAPI, predictionsAPI, resultsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { FiSave, FiZap, FiLock, FiCheck, FiStar, FiChevronDown } from 'react-icons/fi';

/* ── Lock helper (unchanged logic) ── */
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

/* ── Skeleton ── */
function SkeletonRow() {
  return (
    <div className="pd-fixture-card animate-pulse">
      <div className="flex justify-between mb-4">
        <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-5 w-16 rounded-full bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="flex items-center gap-3">
        <div className="h-5 flex-1 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="flex gap-2 shrink-0">
          <div className="h-12 w-14 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-12 w-14 rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="h-5 flex-1 rounded bg-gray-200 dark:bg-gray-700" />
      </div>
      <div className="mt-4 h-9 rounded-lg bg-gray-200 dark:bg-gray-700" />
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════ */
export default function Predictions() {
  const { isAdmin } = useAuth();
  const [fixtures, setFixtures]                 = useState([]);
  const [predictions, setPredictions]           = useState({});
  const [savedOnServer, setSavedOnServer]       = useState(new Set());
  const [loading, setLoading]                   = useState(true);
  const [savingId, setSavingId]                 = useState(null);
  const [bulkSaving, setBulkSaving]             = useState(false);
  const [selectedGameweek, setSelectedGameweek] = useState(1);
  const [quickPickTarget, setQuickPickTarget]   = useState(null);
  const [resultIds, setResultIds]               = useState(new Set());
  const [completedGameweeks, setCompletedGameweeks] = useState(new Set());
  const [wildcardGameweeks, setWildcardGameweeks]   = useState(new Set());
  const [wildcardSaving, setWildcardSaving]         = useState(false);
  const [wildcardConfirmOpen, setWildcardConfirmOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
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
        predictionsLookup[p.fixture_id] = { home: p.predicted_home, away: p.predicted_away };
      });

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

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    let cancelled = false;
    const loadCompleted = async () => {
      try {
        const res = await resultsAPI.getCompletedGameweeks();
        if (cancelled) return;
        const completed = new Set(res.data?.completed_gameweeks ?? []);
        setCompletedGameweeks(completed);
        const firstOpen = Array.from({ length: 38 }, (_, i) => i + 1).find((gw) => !completed.has(gw));
        if (firstOpen) setSelectedGameweek(firstOpen);
      } catch (err) {
        console.error('Error loading completed gameweeks:', err);
      }
    };
    loadCompleted();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    predictionsAPI.getWildcards()
      .then((res) => { if (!cancelled) setWildcardGameweeks(new Set(res.data?.gameweeks ?? [])); })
      .catch((err) => { console.error('Error loading wildcards:', err); });
    return () => { cancelled = true; };
  }, []);

  const wildcardActive = wildcardGameweeks.has(selectedGameweek);
  const wildcardLocked = resultIds.size > 0 || completedGameweeks.has(selectedGameweek);

  const toggleWildcard = async () => {
    if (wildcardLocked) return;
    if (!wildcardActive) { setWildcardConfirmOpen(true); return; }
    await doToggleWildcard(false);
  };

  const doToggleWildcard = async (activating) => {
    setWildcardSaving(true);
    try {
      if (activating) {
        await predictionsAPI.activateWildcard(selectedGameweek);
        setWildcardGameweeks((prev) => new Set([...prev, selectedGameweek]));
        toast.success(`Wildcard activated for Gameweek ${selectedGameweek} — points doubled!`);
      } else {
        await predictionsAPI.deactivateWildcard(selectedGameweek);
        setWildcardGameweeks((prev) => { const next = new Set(prev); next.delete(selectedGameweek); return next; });
        toast.success(`Wildcard removed for Gameweek ${selectedGameweek}`);
      }
    } catch (error) {
      if (error.response?.status === 403) {
        toast.error('Results are in for this gameweek — wildcard is locked');
      } else {
        toast.error('Failed to update wildcard');
      }
    } finally {
      setWildcardSaving(false);
    }
  };

  const handleChange = (fixtureId, type, value) => {
    setPredictions((prev) => ({ ...prev, [fixtureId]: { ...prev[fixtureId], [type]: value } }));
  };

  const handleQuickPick = (fixtureId, home, away) => {
    setPredictions((prev) => ({ ...prev, [fixtureId]: { home, away } }));
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
        toast.error('Predictions are closed — result already submitted');
        setResultIds((prev) => new Set([...prev, fixture.id]));
      } else if (status === 403) {
        toast.error('This fixture is locked — kickoff has passed');
      } else {
        toast.error('Failed to save prediction');
      }
    } finally {
      setSavingId(null);
    }
  };

  const savableFixtures = fixtures.filter(
    (f) => !getFixtureLock(f).locked && !resultIds.has(f.id)
  );

  const saveAll = async () => {
    if (savableFixtures.length === 0) return;
    setBulkSaving(true);
    try {
      const settled = await Promise.allSettled(
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
      const savedIds = [];
      const resultClosedIds = [];
      let kickoffLockedCount = 0, failedCount = 0;
      settled.forEach((r, i) => {
        const fid = savableFixtures[i].id;
        if (r.status === 'fulfilled') { savedIds.push(fid); return; }
        const s = r.reason?.response?.status;
        if (s === 400) resultClosedIds.push(fid);
        else if (s === 403) kickoffLockedCount++;
        else failedCount++;
      });
      setSavedOnServer((prev) => new Set([...prev, ...savedIds]));
      if (resultClosedIds.length > 0) setResultIds((prev) => new Set([...prev, ...resultClosedIds]));
      if (savedIds.length > 0) toast.success(`${savedIds.length} prediction${savedIds.length !== 1 ? 's' : ''} saved!`);
      if (kickoffLockedCount > 0) toast.error(`${kickoffLockedCount} fixture${kickoffLockedCount !== 1 ? 's' : ''} locked — kickoff has passed`);
      if (failedCount > 0) toast.error(`${failedCount} prediction${failedCount !== 1 ? 's' : ''} failed to save`);
    } finally {
      setBulkSaving(false);
    }
  };

  const gameweeks        = Array.from({ length: 38 }, (_, i) => i + 1);
  const predictedCount   = fixtures.filter((f) => savedOnServer.has(f.id)).length;
  const maxPts           = predictedCount * 5;
  const openCount        = savableFixtures.length;
  const progressPct      = fixtures.length ? (predictedCount / fixtures.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* ── Header banner ── */}
      <div className="pd-banner">
        <span className="pd-goldbar" aria-hidden="true" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">
          <div>
            <span className="pd-kicker">Gameweek {selectedGameweek}</span>
            <h1 className="pd-title mt-2">My Predictions</h1>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="pd-pill pd-pill--navy">{predictedCount}/{fixtures.length} predicted</span>
              <span className="pd-pill pd-pill--gold">max {maxPts} pts</span>
              {wildcardActive && (
                <span className="pd-pill pd-pill--amber">
                  <FiStar className="w-3 h-3 fill-current" /> Wildcard Active ×2
                </span>
              )}
            </div>
          </div>
          {/* GW selector */}
          <div className="relative self-start sm:self-auto">
            <select
              value={selectedGameweek}
              onChange={(e) => setSelectedGameweek(parseInt(e.target.value))}
              className="pd-select pr-8"
            >
              {gameweeks.map((gw) => (
                <option key={gw} value={gw}>
                  Gameweek {gw}{completedGameweeks.has(gw) ? ' (Results in)' : ''}
                </option>
              ))}
            </select>
            <FiChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-white/60" />
          </div>
        </div>

        {/* Progress bar inside banner */}
        <div className="relative z-10 mt-5">
          <div className="flex justify-between text-xs font-semibold text-white/60 mb-1.5">
            <span>Prediction progress</span>
            <span>{Math.round(progressPct)}%</span>
          </div>
          <div className="pd-progress-track">
            <div className="pd-progress-bar" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      {/* ── Action row: Save All + Wildcard ── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Save All */}
        <button
          onClick={saveAll}
          disabled={bulkSaving || openCount === 0}
          className="pd-save-all-btn flex-1"
        >
          {bulkSaving ? (
            <><div className="animate-spin rounded-full h-4 w-4 border-2 border-white/40 border-t-white" />Saving…</>
          ) : (
            <><FiSave className="w-4 h-4" />Save All {openCount > 0 ? `(${openCount})` : ''}</>
          )}
        </button>

        {/* Wildcard */}
        {wildcardActive && !isAdmin ? (
          <div className="pd-wildcard-active-badge">
            <FiStar className="w-4 h-4 fill-current" />
            Wildcard Active — Points ×2
          </div>
        ) : (
          <button
            onClick={toggleWildcard}
            disabled={wildcardLocked || wildcardSaving}
            className={`pd-wildcard-btn ${wildcardActive ? 'pd-wildcard-btn--on' : ''}`}
          >
            {wildcardSaving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-current/40 border-t-current" />
            ) : wildcardLocked ? (
              <><FiLock className="w-4 h-4" />Wildcard Locked</>
            ) : wildcardActive ? (
              <><FiStar className="w-4 h-4 fill-current" />Remove Wildcard</>
            ) : (
              <><FiStar className="w-4 h-4" />Activate Wildcard</>
            )}
          </button>
        )}
      </div>

      {/* ── Wildcard info strip (when active) ── */}
      {wildcardActive && (
        <div className="pd-wildcard-info">
          <FiStar className="w-4 h-4 fill-current shrink-0 text-amber-400" />
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>Wildcard is active</strong> — all your Gameweek {selectedGameweek} points will be doubled (×2).
            {!wildcardLocked && isAdmin && ' An admin can remove it before results are entered.'}
            {wildcardLocked && ' Results are in — the wildcard is now locked.'}
          </p>
        </div>
      )}

      {/* ── Wildcard confirmation modal ── */}
      {wildcardConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => setWildcardConfirmOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="pd-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pd-modal-icon">
              <FiStar className="w-6 h-6 text-amber-400 fill-current" />
            </div>
            <h3 className="pd-modal-title">Activate Wildcard?</h3>
            <p className="pd-modal-body">
              Your points for <strong>Gameweek {selectedGameweek}</strong> will be{' '}
              <strong className="text-amber-500">doubled (×2)</strong>.
            </p>
            <p className="pd-modal-sub">
              You can remove the wildcard any time before results are entered.
            </p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setWildcardConfirmOpen(false)}
                className="pd-modal-cancel"
              >
                Cancel
              </button>
              <button
                onClick={async () => { setWildcardConfirmOpen(false); await doToggleWildcard(true); }}
                className="pd-modal-confirm"
              >
                <FiStar className="w-4 h-4" /> Activate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Fixture rows ── */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
        ) : fixtures.length === 0 ? (
          <div className="pd-empty">
            <span className="text-3xl mb-3 block opacity-40">📅</span>
            <p className="font-bold text-gray-600 dark:text-gray-300">No fixtures for this gameweek</p>
          </div>
        ) : (
          fixtures.map((fixture) => {
            const pred           = predictions[fixture.id] || { home: 0, away: 0 };
            const hasPrediction  = savedOnServer.has(fixture.id);
            const isSaving       = savingId === fixture.id;
            const { locked: kickoffLocked, reason: lockReason } = getFixtureLock(fixture);
            const hasResult      = resultIds.has(fixture.id);
            const closed         = kickoffLocked || hasResult;
            const reason         = lockReason === 'postponed' ? 'postponed' : hasResult ? 'result' : lockReason;
            const closedLabel    = reason === 'postponed' ? 'Postponed' : reason === 'result' ? 'Result in' : 'Locked';
            const ClosedIcon     = reason === 'result' ? FiCheck : FiLock;
            const showQuickPick  = quickPickTarget === fixture.id && !closed;

            const cardCls = closed
              ? 'pd-fixture-card pd-fixture-card--closed'
              : hasPrediction
              ? 'pd-fixture-card pd-fixture-card--saved'
              : 'pd-fixture-card pd-fixture-card--open';

            return (
              <div key={fixture.id} className={cardCls}>
                {/* ── Top meta row ── */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide">
                    <span>{fixture.day}</span>
                    <span>·</span>
                    <span>{fixture.date}</span>
                    {fixture.time && <><span>·</span><span>{fixture.time}</span></>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="pd-gw-chip">GW{fixture.gameweek}</span>
                    {closed && (
                      <span className={`pd-closed-chip ${reason === 'postponed' ? 'pd-closed-chip--amber' : ''}`}>
                        <ClosedIcon className="w-2.5 h-2.5" /> {closedLabel}
                      </span>
                    )}
                    {hasPrediction && !closed && (
                      <span className="pd-saved-chip">
                        <FiCheck className="w-2.5 h-2.5" /> Saved
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Match row ── */}
                <div className="flex items-center gap-3">
                  {/* Home team */}
                  <div className="flex-1 text-right">
                    <p className={`font-extrabold text-sm sm:text-base leading-tight ${closed ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                      {fixture.home_team}
                    </p>
                  </div>

                  {/* Score inputs */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={pred.home}
                      disabled={closed}
                      onChange={(e) => handleChange(fixture.id, 'home', e.target.value)}
                      className="pd-score-input"
                      placeholder="0"
                    />
                    <span className="pd-score-dash">–</span>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={pred.away}
                      disabled={closed}
                      onChange={(e) => handleChange(fixture.id, 'away', e.target.value)}
                      className="pd-score-input"
                      placeholder="0"
                    />
                    {!closed && (
                      <button
                        type="button"
                        onClick={() => setQuickPickTarget(showQuickPick ? null : fixture.id)}
                        className="pd-quickpick-btn"
                        title="Quick Pick"
                      >
                        <FiZap className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Away team */}
                  <div className="flex-1 text-left">
                    <p className={`font-extrabold text-sm sm:text-base leading-tight ${closed ? 'text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'}`}>
                      {fixture.away_team}
                    </p>
                  </div>
                </div>

                {/* ── Save / Locked button ── */}
                <div className="mt-3">
                  {closed ? (
                    <div className="pd-locked-btn">
                      <ClosedIcon className="w-3.5 h-3.5" /> {closedLabel}
                    </div>
                  ) : (
                    <button
                      onClick={() => saveSingle(fixture)}
                      disabled={isSaving}
                      className={hasPrediction ? 'pd-update-btn' : 'pd-save-btn'}
                    >
                      {isSaving ? (
                        <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/40 border-t-white" />
                      ) : hasPrediction ? (
                        <><FiCheck className="w-3.5 h-3.5" /> Update</>
                      ) : (
                        <><FiSave className="w-3.5 h-3.5" /> Save</>
                      )}
                    </button>
                  )}
                </div>

                {/* ── Quick pick panel ── */}
                {showQuickPick && (
                  <div className="pd-quickpick-panel">
                    <p className="pd-quickpick-label">
                      <FiZap className="w-3 h-3" /> Quick Pick
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {QUICK_PICKS.map((qp) => (
                        <button
                          key={qp.label}
                          onClick={() => handleQuickPick(fixture.id, qp.home, qp.away)}
                          className="pd-quickpick-chip"
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
