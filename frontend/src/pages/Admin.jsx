import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { adminAPI, settingsAPI, fixturesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import toast from 'react-hot-toast';
import {
  FiUsers, FiBarChart2, FiAlertCircle, FiGrid,
  FiTrash2, FiShield, FiUser, FiChevronDown, FiRefreshCw,
  FiCheckCircle, FiXCircle, FiEdit2, FiUpload, FiDownload,
  FiKey, FiX, FiMail, FiCopy, FiPlus, FiSlash, FiCalendar, FiStar, FiZap,
  FiArrowRight, FiCheck,
} from 'react-icons/fi';

const TABS = [
  { id: 'overview',     label: 'Overview',     icon: FiGrid       },
  { id: 'users',        label: 'Users',        icon: FiUsers      },
  { id: 'wildcards',    label: 'Wildcards',    icon: FiZap        },
  { id: 'predictions',  label: 'Predictions',  icon: FiBarChart2  },
  { id: 'missing',      label: 'Missing',      icon: FiAlertCircle },
  { id: 'fixtures',     label: 'Fixtures',     icon: FiUpload     },
  { id: 'invites',      label: 'Invites',      icon: FiMail       },
];

// ── Overview Tab ──────────────────────────────────────────────────────────────
function OverviewTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { seasonName, reload: reloadSettings } = useSettings();
  const [editingSeason, setEditingSeason] = useState(false);
  const [seasonInput, setSeasonInput] = useState('');
  const [savingSeason, setSavingSeason] = useState(false);

  useEffect(() => {
    adminAPI.getOverview()
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load overview'))
      .finally(() => setLoading(false));
  }, []);

  const handleSeasonSave = async () => {
    const trimmed = seasonInput.trim();
    if (!trimmed) return;
    setSavingSeason(true);
    try {
      await settingsAPI.update('season_name', trimmed);
      reloadSettings();
      setEditingSeason(false);
      toast.success(`Season updated to ${trimmed}`);
    } catch {
      toast.error('Failed to update season');
    } finally {
      setSavingSeason(false);
    }
  };

  if (loading) return (
    <div className="animate-pulse space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[1,2,3,4].map(i => <div key={i} className="adm-card h-24" />)}
      </div>
      <div className="adm-card h-24" />
    </div>
  );
  if (!data) return null;

  const tiles = [
    { label: 'Total Players', value: data.total_users,      accent: 'navy' },
    { label: 'Total Predictions',  value: data.total_predictions, accent: 'green' },
    { label: 'Results Entered',    value: `${data.total_results} / ${data.total_fixtures}`, accent: 'gold' },
    { label: 'Season Progress',    value: `${data.completion_pct}%`, accent: 'navy' },
  ];

  return (
    <div className="space-y-5">
      {/* Stat tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {tiles.map(t => (
          <div key={t.label} className="adm-card">
            <p className="adm-tile-label">{t.label}</p>
            <p className={`adm-tile-value adm-tile-value--${t.accent}`}>{t.value}</p>
          </div>
        ))}
      </div>

      {/* Season progress */}
      <div className="adm-card">
        <div className="flex items-center justify-between mb-3">
          <p className="adm-section-title">Season Progress</p>
          {data.next_gameweek && (
            <span className="adm-pill adm-pill--navy">Next: GW{data.next_gameweek}</span>
          )}
        </div>
        <div className="adm-progress-track mb-2">
          <div className="adm-progress-bar" style={{ width: `${data.completion_pct}%` }} />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {data.total_results} of {data.total_fixtures} fixtures have results entered.
        </p>
      </div>

      {/* Season label */}
      <div className="adm-card">
        <p className="adm-section-title mb-1">Season Label</p>
        <p className="text-xs text-gray-400 mb-4">Displayed in the navbar, footer, and homepage.</p>
        {editingSeason ? (
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={seasonInput}
              onChange={(e) => setSeasonInput(e.target.value)}
              placeholder="e.g. 2025/26"
              className="input-field w-36 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleSeasonSave()}
              autoFocus
            />
            <button onClick={handleSeasonSave} disabled={savingSeason} className="adm-btn-primary text-sm px-4 py-2">
              {savingSeason ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditingSeason(false)} className="text-sm text-gray-400 hover:text-gray-600 px-2 py-2">
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-xl font-black text-[#FFB81C]">{seasonName}</span>
            <button
              onClick={() => { setSeasonInput(seasonName); setEditingSeason(true); }}
              className="adm-action-btn"
            >
              <FiEdit2 className="w-3.5 h-3.5" /> Change season
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Reset Password Modal ──────────────────────────────────────────────────────
function ResetPasswordModal({ user, onClose }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  const tooShort = password.length > 0 && password.length < 8;
  const mismatch = confirm.length > 0 && password !== confirm;
  const canSubmit = password.length >= 8 && password === confirm && !saving;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      await adminAPI.resetUserPassword(user.id, password);
      toast.success(`Password reset for ${user.username}`);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-pw-title"
    >
      <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 id="reset-pw-title" className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <div className="adm-modal-icon"><FiKey className="w-4 h-4 text-[#FFB81C]" /></div>
            Reset Password
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Close">
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Set a new password for <strong className="text-gray-700 dark:text-gray-200">{user.username}</strong>.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="new-pw" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">New password</label>
            <input id="new-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              className="input-field" placeholder="At least 8 characters" autoFocus />
            {tooShort && <p className="text-xs text-orange-500 mt-1">Min 8 characters</p>}
          </div>
          <div>
            <label htmlFor="confirm-pw" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Confirm password</label>
            <input id="confirm-pw" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
              className="input-field" placeholder="Re-enter password" />
            {mismatch && <p className="text-xs text-red-500 mt-1">Passwords do not match</p>}
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 text-sm py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
              Cancel
            </button>
            <button type="submit" disabled={!canSubmit} className="adm-btn-primary flex-1 text-sm py-2 disabled:opacity-50">
              {saving ? 'Saving…' : 'Reset'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [resetUser, setResetUser] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    adminAPI.getUsers()
      .then(r => setUsers(r.data.users))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleRole = async (u) => {
    const newRole = u.role === 'admin' ? 'user' : 'admin';
    try {
      await adminAPI.updateUserRole(u.id, newRole);
      toast.success(`${u.username} is now ${newRole}`);
      load();
    } catch {
      toast.error('Failed to update role');
    }
  };

  const deleteUser = async (u) => {
    try {
      await adminAPI.deleteUser(u.id);
      toast.success(`${u.username} deleted`);
      setConfirmDelete(null);
      load();
    } catch {
      toast.error('Failed to delete user');
    }
  };

  if (loading) return (
    <div className="animate-pulse space-y-2">
      {[1,2,3,4].map(i => <div key={i} className="adm-card h-14" />)}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          <strong className="text-gray-700 dark:text-gray-200">{users.length}</strong> users registered
        </p>
        <button onClick={load} className="adm-icon-btn" aria-label="Refresh list">
          <FiRefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr className="adm-thead-row">
              <th className="adm-th">User</th>
              <th className="adm-th hidden sm:table-cell">Email</th>
              <th className="adm-th text-center">Predictions</th>
              <th className="adm-th text-center">Points</th>
              <th className="adm-th text-center">Role</th>
              <th className="adm-th" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="adm-tr">
                <td className="adm-td font-semibold text-gray-900 dark:text-white">
                  {u.username}
                  {u.id === currentUser?.id && (
                    <span className="ml-2 text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold">YOU</span>
                  )}
                </td>
                <td className="adm-td text-gray-500 dark:text-gray-400 hidden sm:table-cell">{u.email}</td>
                <td className="adm-td text-center text-gray-600 dark:text-gray-300">{u.prediction_count}</td>
                <td className="adm-td text-center">
                  <span className="inline-flex items-center gap-1.5 justify-center font-bold text-gray-900 dark:text-white">
                    {u.total_points}
                    {u.has_wildcard && (
                      <span
                        className="text-amber-500"
                        title={`Wildcard active (Gameweek${u.wildcard_gameweeks?.length > 1 ? 's' : ''} ${(u.wildcard_gameweeks ?? []).join(', ')}) — total includes doubled points`}
                      >
                        <FiStar className="w-3.5 h-3.5 fill-current" />
                      </span>
                    )}
                  </span>
                </td>
                <td className="adm-td text-center">
                  {u.id === currentUser?.id ? (
                    <span className="adm-role-badge adm-role-badge--admin">
                      <FiShield className="w-3 h-3" /> admin
                    </span>
                  ) : (
                    <button onClick={() => toggleRole(u)}
                      className={`adm-role-badge adm-role-badge--clickable ${u.role === 'admin' ? 'adm-role-badge--admin' : 'adm-role-badge--user'}`}>
                      {u.role === 'admin' ? <FiShield className="w-3 h-3" /> : <FiUser className="w-3 h-3" />}
                      {u.role}
                    </button>
                  )}
                </td>
                <td className="adm-td text-right">
                  {confirmDelete === u.id ? (
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-xs text-red-600 dark:text-red-400 font-medium">Delete?</span>
                      <button onClick={() => deleteUser(u)} className="text-xs text-red-600 dark:text-red-400 font-bold hover:underline">Yes</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-500 hover:underline">No</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setResetUser(u)} className="adm-action-btn" aria-label={`Reset password for ${u.username}`}>
                        <FiKey className="w-3.5 h-3.5" /> Reset
                      </button>
                      {u.id !== currentUser?.id && (
                        <button onClick={() => setConfirmDelete(u.id)}
                          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors"
                          aria-label={`Delete user ${u.username}`}>
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {resetUser && <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />}
    </div>
  );
}

// ── Predictions Tab ───────────────────────────────────────────────────────────
// Compact team-name → 3-letter code map. Explicit entries disambiguate the
// Man Utd / Man City collision; anything not listed falls back to the first
// three letters uppercased.
const TEAM_CODE = {
  // Prod CSV names
  'Arsenal': 'ARS', 'Aston Villa': 'AVL', 'Brentford': 'BRE',
  'Brighton': 'BHA', 'Burnley': 'BUR', 'Chelsea': 'CHE',
  'Crystal Palace': 'CRY', 'Everton': 'EVE', 'Fulham': 'FUL',
  'Ipswich': 'IPS', 'Ipswich Town': 'IPS', 'Leicester': 'LEI', 'Leicester City': 'LEI',
  'Liverpool': 'LIV', 'Luton': 'LUT',
  'Manchester City': 'MCI', 'Manchester Utd': 'MUN', 'Manchester United': 'MUN',
  'Newcastle': 'NEW', 'Newcastle Utd': 'NEW',
  'Nottingham Forest': 'NFO', 'Sheffield United': 'SHU',
  'Southampton': 'SOU', 'Tottenham': 'TOT', 'West Ham': 'WHU',
  'Wolves': 'WOL', 'Wolverhampton': 'WOL', 'Bournemouth': 'BOU',
  // Simulate short-names (simulate.py uses these)
  'Man City': 'MCI', 'Man United': 'MUN', "Nott'm Forest": 'NFO', 'Spurs': 'TOT',
};
const teamCode = (name) => TEAM_CODE[name] ?? name.slice(0, 3).toUpperCase();

function PredictionsTab() {
  // gameweek starts null so the initial mount load hits the server-side default
  // (most recent gameweek with predictions).
  const [gameweek, setGameweek] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  // Tracks the gameweek of the currently-loaded data. On the initial (null)
  // load the server resolves the latest gameweek and we sync the selector to
  // it; that state change retriggers this effect, but the ref lets us skip the
  // redundant clear-and-refetch (no skeleton flicker, no duplicate request).
  const loadedGwRef = useRef(null);

  useEffect(() => {
    if (gameweek != null && loadedGwRef.current === gameweek) return;

    let cancelled = false;
    setLoading(true);
    setData(null);
    adminAPI.getPredictions(gameweek)
      .then(r => {
        if (cancelled) return;
        loadedGwRef.current = r.data.gameweek;
        setData(r.data);
        if (gameweek == null && r.data.gameweek != null) {
          setGameweek(r.data.gameweek);
        }
      })
      .catch(() => { if (!cancelled) toast.error('Failed to load predictions'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [gameweek]);

  // Build a per-fixture lookup of (user_id → { score, points }) so the grid
  // can be rendered player-major even though the endpoint returns
  // fixture-major data. points is null until the fixture has a result.
  // Map<fixture_id, Map<user_id, { score, points }>>
  const predByFixture = useMemo(() => {
    const map = new Map();
    if (!data) return map;
    for (const f of data.fixtures) {
      const cell = new Map();
      for (const p of f.predictions) {
        if (p.predicted_home !== null && p.predicted_away !== null) {
          cell.set(p.user_id, {
            score: `${p.predicted_home}–${p.predicted_away}`,
            points: p.points ?? null,
          });
        }
      }
      map.set(f.fixture_id, cell);
    }
    return map;
  }, [data]);

  const availableGameweeks = data?.available_gameweeks ?? [];
  const noPredictions = data && availableGameweeks.length === 0;

  return (
    <div className="space-y-4">
      {/* Selector — only meaningful when at least one gameweek has predictions. */}
      {availableGameweeks.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Gameweek</label>
          <div className="relative">
            <select
              value={gameweek ?? ''}
              onChange={e => setGameweek(Number(e.target.value))}
              className="input-field w-36 pr-8 appearance-none"
            >
              {availableGameweeks.map(gw => (
                <option key={gw} value={gw}>Gameweek {gw}</option>
              ))}
            </select>
            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}

      {loading && <div className="animate-pulse adm-card h-40" />}

      {!loading && noPredictions && (
        <div className="adm-card text-center text-gray-500 dark:text-gray-400 py-10">
          No predictions have been submitted yet.
        </div>
      )}

      {!loading && data && !noPredictions && data.users.length > 0 && data.fixtures.length === 0 && (
        <div className="adm-card text-center text-gray-500 dark:text-gray-400 py-10">
          No fixtures for Gameweek {data.gameweek}.
        </div>
      )}

      {!loading && data && !noPredictions && data.users.length > 0 && data.fixtures.length > 0 && (
        <div className="adm-matrix-wrap">
          <table className="adm-matrix-table">
            <thead>
              <tr>
                <th className="adm-matrix-th adm-matrix-th-corner">Player</th>
                {data.fixtures.map(f => (
                  <th
                    key={f.fixture_id}
                    className="adm-matrix-th adm-matrix-th-fixture"
                    title={`${f.home_team} vs ${f.away_team}`}
                  >
                    {teamCode(f.home_team)}{'–'}{teamCode(f.away_team)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.users.map(u => (
                <tr key={u.id}>
                  <td className="adm-matrix-td-player" title={u.username}>{u.username}</td>
                  {data.fixtures.map(f => {
                    const cell = predByFixture.get(f.fixture_id)?.get(u.id);
                    // Colour-code once the fixture is scored. Backend sends
                    // wildcard-multiplied points, so values are {null, 0, 2,
                    // 4, 5, 10}: >= 5 = exact (5 or 10), >= 2 = correct
                    // result (2 or 4), 0 = wrong. points == null (no result
                    // yet) keeps the neutral style.
                    const scoreCls = !cell
                      ? null
                      : cell.points == null  ? 'adm-matrix-score'
                      : cell.points >= 5     ? 'adm-matrix-score adm-matrix-score--exact'
                      : cell.points >= 2     ? 'adm-matrix-score adm-matrix-score--result'
                      :                        'adm-matrix-score adm-matrix-score--wrong';
                    return (
                      <td key={f.fixture_id} className="adm-matrix-td">
                        {cell ? (
                          <span className={scoreCls}>{cell.score}</span>
                        ) : (
                          <span className="adm-matrix-empty" aria-label="No prediction">{'—'}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Missing Tab ───────────────────────────────────────────────────────────────
function MissingTab() {
  const [gameweek, setGameweek] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const loadedGwRef = useRef(null);

  useEffect(() => {
    if (gameweek != null && loadedGwRef.current === gameweek) return;

    let cancelled = false;
    setLoading(true);
    setData(null);
    adminAPI.getMissingPredictions(gameweek)
      .then(r => {
        if (cancelled) return;
        loadedGwRef.current = r.data.gameweek;
        setData(r.data);
        if (gameweek == null && r.data.gameweek != null) {
          setGameweek(r.data.gameweek);
        }
      })
      .catch(() => { if (!cancelled) toast.error('Failed to load data'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [gameweek]);

  const missing  = data?.summary.filter(u => !u.complete) ?? [];
  const complete = data?.summary.filter(u => u.complete) ?? [];
  const availableGameweeks = data?.available_gameweeks ?? [];

  return (
    <div className="space-y-4">
      {availableGameweeks.length > 0 && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Gameweek</label>
          <div className="relative">
            <select
              value={gameweek ?? ''}
              onChange={e => setGameweek(Number(e.target.value))}
              className="input-field w-36 pr-8 appearance-none"
            >
              {availableGameweeks.map(gw => (
                <option key={gw} value={gw}>Gameweek {gw}</option>
              ))}
            </select>
            <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}

      {loading && <div className="animate-pulse adm-card h-40" />}

      {!loading && availableGameweeks.length === 0 && (
        <div className="adm-card text-center text-gray-500 dark:text-gray-400 py-10">
          No fixtures loaded yet.
        </div>
      )}

      {!loading && data && availableGameweeks.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Missing */}
          <div className="adm-table-wrap">
            <div className="flex items-center gap-2 px-4 py-3 bg-red-600 rounded-t-xl">
              <FiXCircle className="w-4 h-4 text-white" />
              <span className="font-bold text-white text-sm">Missing ({missing.length})</span>
            </div>
            {missing.length === 0 ? (
              <p className="px-4 py-8 text-sm text-gray-500 dark:text-gray-400 text-center">Everyone has predicted! 🎉</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {missing.map(u => (
                  <li key={u.user_id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">{u.username}</span>
                    <span className="text-red-500 font-semibold text-xs">{u.submitted}/{u.total} done</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Complete */}
          <div className="adm-table-wrap">
            <div className="flex items-center gap-2 px-4 py-3 bg-green-600 rounded-t-xl">
              <FiCheckCircle className="w-4 h-4 text-white" />
              <span className="font-bold text-white text-sm">All Done ({complete.length})</span>
            </div>
            {complete.length === 0 ? (
              <p className="px-4 py-8 text-sm text-gray-500 dark:text-gray-400 text-center">No completed predictions yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {complete.map(u => (
                  <li key={u.user_id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">{u.username}</span>
                    <span className="text-green-500 font-semibold text-xs">{u.total}/{u.total} ✓</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Fixtures Tab ──────────────────────────────────────────────────────────────
const TEMPLATE_ROWS = [
  'week,date,time,home,away,venue',
  '1,2025-08-16,12:30,Arsenal,Chelsea,Emirates Stadium',
  '1,2025-08-16,15:00,Liverpool,Everton,Anfield',
];

function FixtureStatusManager() {
  const [gameweek, setGameweek] = useState(null);
  const [availableGws, setAvailableGws] = useState([]);
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  // Manual editor state
  const [editingId, setEditingId] = useState(null);       // fixture id being edited inline
  const [editForm, setEditForm] = useState({});           // draft values for inline edit
  const [movingId, setMovingId] = useState(null);         // fixture id being moved
  const [moveTarget, setMoveTarget] = useState('');       // target GW selection
  const [deletingId, setDeletingId] = useState(null);     // fixture id awaiting delete confirm
  const [deleteInfo, setDeleteInfo] = useState(null);     // { predictions_count, has_result }
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ gameweek: '', date: '', time: '', home_team: '', away_team: '', venue: '' });

  useEffect(() => {
    fixturesAPI.getAll({})
      .then((r) => {
        const gws = [...new Set(r.data.fixtures.map((f) => f.gameweek))].sort((a, b) => a - b);
        setAvailableGws(gws);
        if (gws.length > 0) setGameweek(gws[0]);
      })
      .catch(() => toast.error('Failed to load gameweeks'));
  }, []);

  const loadFixtures = useCallback((gw) => {
    setLoading(true);
    fixturesAPI.getByGameweek(gw)
      .then((r) => setFixtures(r.data.fixtures))
      .catch(() => toast.error('Failed to load fixtures'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (gameweek == null) return;
    let cancelled = false;
    setLoading(true);
    fixturesAPI.getByGameweek(gameweek)
      .then((r) => { if (!cancelled) setFixtures(r.data.fixtures); })
      .catch(() => { if (!cancelled) toast.error('Failed to load fixtures'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [gameweek]);

  // Reload the GW list AND the visible fixtures after any mutation. When the
  // target GW is unchanged, the load effect won't re-fire, so fetch directly.
  const reload = useCallback((targetGw) => {
    fixturesAPI.getAll({}).then((r) => {
      const gws = [...new Set(r.data.fixtures.map((f) => f.gameweek))].sort((a, b) => a - b);
      setAvailableGws(gws);
      const gw = targetGw ?? gameweek;
      if (gws.includes(gw)) {
        if (gw !== gameweek) setGameweek(gw);   // triggers the load effect
        else loadFixtures(gw);                   // same GW: effect won't fire, fetch directly
      } else if (gws.length > 0) {
        setGameweek(gws[0]);
      } else {
        setGameweek(null);
        setFixtures([]);
      }
    }).catch(() => toast.error('Failed to reload fixtures'));
  }, [gameweek, loadFixtures]);

  const setStatus = async (fixture, status) => {
    setUpdatingId(fixture.id);
    try {
      await adminAPI.updateFixtureStatus(fixture.id, status);
      setFixtures((prev) => prev.map((f) => (f.id === fixture.id ? { ...f, status } : f)));
      toast.success(`${fixture.home_team} vs ${fixture.away_team} → ${status}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Edit (inline) ──
  const startEdit = (f) => {
    setEditingId(f.id);
    setEditForm({ date: f.date, time: f.time || '', home_team: f.home_team, away_team: f.away_team, venue: f.venue || '' });
    setMovingId(null); setDeletingId(null); setDeleteInfo(null);
  };
  const saveEdit = async (f) => {
    setUpdatingId(f.id);
    try {
      await adminAPI.editFixture(f.id, editForm);
      setEditingId(null);
      toast.success('Fixture updated');
      reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update fixture');
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Move ──
  const startMove = (f) => {
    setMovingId(f.id); setMoveTarget('');
    setEditingId(null); setDeletingId(null); setDeleteInfo(null);
  };
  const confirmMove = async (f) => {
    if (!moveTarget) return;
    setUpdatingId(f.id);
    try {
      const res = await adminAPI.moveFixture(f.id, Number(moveTarget));
      setMovingId(null);
      if (res.data.wildcard_warnings?.length > 0) {
        toast(`⚠️ Moved. Wildcard warning: ${res.data.wildcard_warnings.join(', ')} had a wildcard on GW${res.data.old_gameweek}.`, { duration: 6000 });
      } else {
        toast.success(`Moved to GW${moveTarget}. ${res.data.predictions_updated} predictions updated.`);
      }
      reload(Number(moveTarget));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to move fixture');
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Delete ──
  const requestDelete = async (f) => {
    // First attempt without force — if the fixture has predictions the API
    // returns 409 with the count so we can show an informed confirmation.
    setDeletingId(f.id); setDeleteInfo(null);
    setEditingId(null); setMovingId(null);
    try {
      await adminAPI.deleteFixture(f.id, false);
      toast.success('Fixture deleted');
      reload();
      setDeletingId(null);
    } catch (err) {
      if (err.response?.status === 409) {
        setDeleteInfo(err.response.data);  // { predictions_count, has_result }
      } else {
        toast.error(err.response?.data?.detail || 'Failed to delete fixture');
        setDeletingId(null);
      }
    }
  };
  const confirmDelete = async (f) => {
    setUpdatingId(f.id);
    try {
      await adminAPI.deleteFixture(f.id, true);
      toast.success('Fixture and predictions deleted');
      setDeletingId(null); setDeleteInfo(null);
      reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to delete fixture');
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Add ──
  const submitAdd = async () => {
    try {
      await adminAPI.addFixture({ ...addForm, gameweek: Number(addForm.gameweek) });
      toast.success('Fixture added');
      setShowAddForm(false);
      const targetGw = Number(addForm.gameweek);
      setAddForm({ gameweek: '', date: '', time: '', home_team: '', away_team: '', venue: '' });
      reload(targetGw);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to add fixture');
    }
  };

  const statusCls = (status) => {
    if (status === 'postponed') return 'adm-status-badge adm-status-badge--amber';
    if (status === 'completed') return 'adm-status-badge adm-status-badge--green';
    return 'adm-status-badge adm-status-badge--gray';
  };

  const addFormValid =
    addForm.gameweek !== '' && Number(addForm.gameweek) >= 1 && Number(addForm.gameweek) <= 38 &&
    addForm.date.trim() !== '' && addForm.home_team.trim() !== '' && addForm.away_team.trim() !== '';

  return (
    <div className="adm-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <p className="adm-section-title">Fixture Status</p>
          <p className="text-xs text-gray-400 mt-0.5">Postpone, reschedule, edit, move, add or delete fixtures.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAddForm((v) => !v)} className="adm-action-btn">
            <FiPlus className="w-3.5 h-3.5" /> Add fixture
          </button>
          {availableGws.length > 0 && (
            <div className="relative">
              <select value={gameweek ?? ''} onChange={(e) => setGameweek(Number(e.target.value))}
                className="input-field w-36 pr-8 appearance-none">
                {availableGws.map((gw) => (
                  <option key={gw} value={gw}>Gameweek {gw}</option>
                ))}
              </select>
              <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>
      </div>

      {showAddForm && (
        <div className="adm-fixture-form mb-4">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">New fixture</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <input type="number" min="1" max="38" placeholder="Gameweek (1-38)" value={addForm.gameweek}
              onChange={(e) => setAddForm((s) => ({ ...s, gameweek: e.target.value }))}
              className="adm-fixture-input" aria-label="Gameweek" />
            <input type="date" value={addForm.date}
              onChange={(e) => setAddForm((s) => ({ ...s, date: e.target.value }))}
              className="adm-fixture-input" aria-label="Date" />
            <input type="time" value={addForm.time}
              onChange={(e) => setAddForm((s) => ({ ...s, time: e.target.value }))}
              className="adm-fixture-input" aria-label="Kick-off time (optional)" />
            <input type="text" placeholder="Home team" value={addForm.home_team}
              onChange={(e) => setAddForm((s) => ({ ...s, home_team: e.target.value }))}
              className="adm-fixture-input" aria-label="Home team" />
            <input type="text" placeholder="Away team" value={addForm.away_team}
              onChange={(e) => setAddForm((s) => ({ ...s, away_team: e.target.value }))}
              className="adm-fixture-input" aria-label="Away team" />
            <input type="text" placeholder="Venue (optional)" value={addForm.venue}
              onChange={(e) => setAddForm((s) => ({ ...s, venue: e.target.value }))}
              className="adm-fixture-input" aria-label="Venue" />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={submitAdd} disabled={!addFormValid}
              className="adm-action-btn disabled:opacity-40">
              <FiCheck className="w-3.5 h-3.5" /> Save
            </button>
            <button onClick={() => setShowAddForm(false)} className="adm-action-btn">
              <FiX className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        </div>
      )}

      {availableGws.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No fixtures loaded yet.</p>
      ) : loading ? (
        <div className="animate-pulse space-y-2">{[1,2,3].map((i) => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded" />)}</div>
      ) : fixtures.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No fixtures for this gameweek.</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {fixtures.map((f) => {
            const postponed = f.status === 'postponed';
            const busy = updatingId === f.id;
            // UX hint only — the backend enforces the hard guard on results.
            const scored = f.status === 'completed';
            return (
              <li key={f.id} className="py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{f.home_team} vs {f.away_team}</p>
                    <p className="text-xs text-gray-400">{f.date}{f.time ? ` · ${f.time}` : ''}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                    <span className={statusCls(f.status)}>{f.status || 'scheduled'}</span>
                    {postponed ? (
                      <button onClick={() => setStatus(f, 'scheduled')} disabled={busy}
                        className="adm-action-btn disabled:opacity-50">
                        <FiCalendar className="w-3.5 h-3.5" /> Reschedule
                      </button>
                    ) : (
                      <button onClick={() => setStatus(f, 'postponed')} disabled={busy}
                        className="adm-action-btn adm-action-btn--amber disabled:opacity-50">
                        <FiSlash className="w-3.5 h-3.5" /> Postpone
                      </button>
                    )}

                    {/* Edit */}
                    {editingId !== f.id && (
                      <button onClick={() => startEdit(f)} disabled={busy || scored}
                        title={scored ? 'Cannot edit a scored fixture' : 'Edit'}
                        className="adm-action-btn disabled:opacity-40">
                        <FiEdit2 className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Move */}
                    {movingId === f.id ? (
                      <div className="flex items-center gap-1">
                        <select value={moveTarget} onChange={(e) => setMoveTarget(e.target.value)}
                          className="adm-fixture-move-select" aria-label="Move to gameweek">
                          <option value="">Move to GW…</option>
                          {Array.from({ length: 38 }, (_, i) => i + 1)
                            .filter((gw) => gw !== f.gameweek)
                            .map((gw) => <option key={gw} value={gw}>GW {gw}</option>)}
                        </select>
                        <button onClick={() => confirmMove(f)} disabled={!moveTarget || busy}
                          title="Confirm move"
                          className="adm-action-btn disabled:opacity-40"><FiCheck className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setMovingId(null)} title="Cancel"
                          className="adm-action-btn"><FiX className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <button onClick={() => startMove(f)} disabled={busy || scored}
                        title={scored ? 'Cannot move a scored fixture' : 'Move to another gameweek'}
                        className="adm-action-btn disabled:opacity-40">
                        <FiArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Delete */}
                    {deletingId === f.id && deleteInfo ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-amber-500">
                          {deleteInfo.predictions_count} prediction{deleteInfo.predictions_count !== 1 ? 's' : ''} will be deleted.
                          {deleteInfo.has_result ? ' Result will be lost too.' : ''} Sure?
                        </span>
                        <button onClick={() => confirmDelete(f)} disabled={busy}
                          className="adm-action-btn adm-action-btn--red disabled:opacity-40">
                          <FiTrash2 className="w-3.5 h-3.5" /> Yes, delete
                        </button>
                        <button onClick={() => { setDeletingId(null); setDeleteInfo(null); }} title="Cancel"
                          className="adm-action-btn"><FiX className="w-3.5 h-3.5" /></button>
                      </div>
                    ) : (
                      <button onClick={() => requestDelete(f)} disabled={busy}
                        title="Delete fixture"
                        className="adm-action-btn adm-action-btn--red disabled:opacity-40">
                        <FiTrash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline edit form */}
                {editingId === f.id && (
                  <div className="adm-fixture-form">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <input type="date" value={editForm.date}
                        onChange={(e) => setEditForm((s) => ({ ...s, date: e.target.value }))}
                        className="adm-fixture-input" aria-label="Date" />
                      <input type="time" value={editForm.time}
                        onChange={(e) => setEditForm((s) => ({ ...s, time: e.target.value }))}
                        className="adm-fixture-input" aria-label="Kick-off time" />
                      <input type="text" placeholder="Venue" value={editForm.venue}
                        onChange={(e) => setEditForm((s) => ({ ...s, venue: e.target.value }))}
                        className="adm-fixture-input" aria-label="Venue" />
                      <input type="text" placeholder="Home team" value={editForm.home_team}
                        onChange={(e) => setEditForm((s) => ({ ...s, home_team: e.target.value }))}
                        className="adm-fixture-input" aria-label="Home team" />
                      <input type="text" placeholder="Away team" value={editForm.away_team}
                        onChange={(e) => setEditForm((s) => ({ ...s, away_team: e.target.value }))}
                        className="adm-fixture-input" aria-label="Away team" />
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => saveEdit(f)} disabled={busy || !editForm.home_team?.trim() || !editForm.away_team?.trim()}
                        className="adm-action-btn disabled:opacity-40">
                        <FiCheck className="w-3.5 h-3.5" /> Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="adm-action-btn">
                        <FiX className="w-3.5 h-3.5" /> Cancel
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function FixturesTab() {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  // Fixture sync (football-data.org preview + apply)
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState(null);     // preview response
  const [selectedChanges, setSelectedChanges] = useState(new Set()); // change_ids selected
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState(null);

  const handleFile = (f) => { setFile(f); setResult(null); setError(null); setConfirmed(false); };

  const checkForUpdates = async () => {
    setSyncLoading(true); setSyncResult(null); setApplyResult(null); setSelectedChanges(new Set());
    try {
      const res = await adminAPI.getFixtureSync();
      setSyncResult(res.data);
      if (res.data.sync_available && res.data.changes.length === 0) {
        toast.success('All fixtures are up to date.');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to fetch fixture updates');
    } finally {
      setSyncLoading(false);
    }
  };

  const applyChanges = async () => {
    const toApply = syncResult.changes
      .filter(c => selectedChanges.has(c.change_id))
      .map(c => ({
        change_id: c.change_id,
        type: c.type,
        fixture_id: c.local?.fixture_id ?? null,
        new_date: (c.type === 'KICKOFF_CHANGED' || c.type === 'GAMEWEEK_CHANGED') ? c.api.date : null,
        new_time: (c.type === 'KICKOFF_CHANGED' || c.type === 'GAMEWEEK_CHANGED') ? c.api.time : null,
        new_gameweek: c.type === 'GAMEWEEK_CHANGED' ? c.api.gameweek : null,
        home_team: c.type === 'NEW_FIXTURE' ? c.api.home_team : null,
        away_team: c.type === 'NEW_FIXTURE' ? c.api.away_team : null,
        gameweek: c.type === 'NEW_FIXTURE' ? c.api.gameweek : null,
        date: c.type === 'NEW_FIXTURE' ? c.api.date : null,
        time: c.type === 'NEW_FIXTURE' ? c.api.time : null,
      }));
    setApplying(true);
    try {
      const res = await adminAPI.applyFixtureSync({ changes: toApply });
      setApplyResult(res.data);
      setSyncResult(null); setSelectedChanges(new Set());
      toast.success(`${res.data.applied} change${res.data.applied !== 1 ? 's' : ''} applied.`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to apply changes');
    } finally {
      setApplying(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_ROWS.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'fixtures_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    if (!file || !confirmed) return;
    setUploading(true); setError(null);
    try {
      const res = await adminAPI.uploadFixtures(file, true);
      const data = res.data;
      setResult(data); setFile(null); setConfirmed(false);
      toast.success(`${data.imported} fixtures imported across ${data.gameweeks.length} gameweeks!`);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (detail !== undefined) {
        const msg  = typeof detail === 'object' ? detail.message : detail;
        const errs = typeof detail === 'object' ? detail.errors : [];
        setError({ message: msg, errors: errs });
      } else {
        setError({ message: 'Upload failed — check your connection and try again', errors: [] });
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      {/* Sync card */}
      <div className="adm-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="adm-section-title">Fixture Sync</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Check football-data.org for schedule changes. Nothing applies until you confirm.
            </p>
          </div>
          <button onClick={checkForUpdates} disabled={syncLoading || applying}
            className="adm-btn-primary flex items-center gap-2 disabled:opacity-50 text-sm py-2 px-3">
            {syncLoading
              ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Checking…</>
              : <><FiRefreshCw className="w-4 h-4" /> Check for updates</>}
          </button>
        </div>

        {/* Not configured state */}
        {syncResult && !syncResult.sync_available && (
          <div className="adm-info-card adm-info-card--amber">
            <p className="text-sm text-amber-800 dark:text-amber-300">
              ⚙ API sync not configured. Add <code className="adm-code">FOOTBALL_DATA_API_KEY</code> to
              your Render environment variables (free key at football-data.org — no credit card needed).
            </p>
          </div>
        )}

        {/* No changes */}
        {syncResult?.sync_available && syncResult.changes.length === 0 && (
          <p className="text-sm text-green-600 dark:text-green-400">
            ✓ All {syncResult.api_match_count} fixtures are up to date.
          </p>
        )}

        {/* Changes list */}
        {syncResult?.sync_available && syncResult.changes.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {syncResult.changes.length} proposed change{syncResult.changes.length !== 1 ? 's' : ''}
                {' · '}
                <button onClick={() => setSelectedChanges(new Set(syncResult.changes.map(c => c.change_id)))}
                  className="text-[#003087] dark:text-blue-400 hover:underline text-xs">select all</button>
                {' / '}
                <button onClick={() => setSelectedChanges(new Set())}
                  className="text-[#003087] dark:text-blue-400 hover:underline text-xs">none</button>
              </p>
              <button onClick={applyChanges}
                disabled={selectedChanges.size === 0 || applying}
                className="adm-btn-primary flex items-center gap-1.5 text-sm py-1.5 px-3 disabled:opacity-50">
                {applying
                  ? <><div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white" /> Applying…</>
                  : `Apply ${selectedChanges.size} selected`}
              </button>
            </div>

            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {syncResult.changes.map((c) => (
                <li key={c.change_id} className="flex items-start gap-3 py-2.5">
                  <input type="checkbox"
                    checked={selectedChanges.has(c.change_id)}
                    onChange={(e) => {
                      setSelectedChanges(prev => {
                        const next = new Set(prev);
                        e.target.checked ? next.add(c.change_id) : next.delete(c.change_id);
                        return next;
                      });
                    }}
                    className="mt-0.5 w-4 h-4 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className={`adm-sync-badge adm-sync-badge--${c.type === 'NEW_FIXTURE' ? 'green' : 'amber'} mr-2`}>
                      {c.type === 'KICKOFF_CHANGED' ? 'Kickoff' : c.type === 'GAMEWEEK_CHANGED' ? 'GW Move' : 'New'}
                    </span>
                    <span className="text-sm text-gray-800 dark:text-gray-200">{c.description}</span>
                  </div>
                </li>
              ))}
            </ul>

            {syncResult.unmapped_teams?.length > 0 && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                ⚠ Unmapped teams (add to team_mapping.py): {syncResult.unmapped_teams.join(', ')}
              </p>
            )}
          </div>
        )}

        {/* Apply result */}
        {applyResult && (
          <div className="adm-info-card adm-info-card--green mt-3">
            <p className="text-sm text-green-800 dark:text-green-300">
              Applied {applyResult.applied} · Skipped {applyResult.skipped} · Errors {applyResult.errors}
            </p>
          </div>
        )}
      </div>

      <FixtureStatusManager />

      {/* Instructions */}
      <div className="adm-info-card adm-info-card--blue">
        <p className="adm-section-title mb-2">How to load or update fixtures</p>
        <ol className="text-sm text-gray-700 dark:text-gray-300 space-y-1.5 list-decimal list-inside">
          <li>Download the <strong>CSV template</strong> below.</li>
          <li>Get fixture data from <strong>football-data.co.uk</strong> or prepare your own.</li>
          <li>Required columns: <code className="adm-code">week, date, home, away</code> — optional: <code className="adm-code">time, venue</code>.</li>
          <li>Dates: <code className="adm-code">YYYY-MM-DD</code> · times: <code className="adm-code">HH:MM</code>.</li>
          <li>Existing predictions and results are preserved on import.</li>
        </ol>
        <button onClick={downloadTemplate} className="mt-3 flex items-center gap-2 text-xs font-semibold text-[#003087] dark:text-[#93c5fd] hover:underline">
          <FiDownload className="w-3.5 h-3.5" /> Download CSV template
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        className={`adm-dropzone ${dragOver ? 'adm-dropzone--drag' : file ? 'adm-dropzone--ready' : ''}`}
        onClick={() => document.getElementById('fixture-csv-input').click()}
      >
        <input id="fixture-csv-input" type="file" accept=".csv" className="hidden"
          onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); }} />
        {file ? (
          <div className="space-y-1">
            <FiCheckCircle className="w-8 h-8 text-green-500 mx-auto" />
            <p className="font-bold text-green-600 dark:text-green-400">{file.name}</p>
            <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB · click to change</p>
          </div>
        ) : (
          <div className="space-y-2">
            <FiUpload className="w-8 h-8 text-gray-300 mx-auto" />
            <p className="font-semibold text-gray-500 dark:text-gray-400">Drop your CSV here, or click to browse</p>
            <p className="text-xs text-gray-400">Accepts .csv files only</p>
          </div>
        )}
      </div>

      {/* Confirmation */}
      {file && (
        <div className="adm-info-card adm-info-card--blue">
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2">
            This import updates matching fixtures and adds new ones. Existing predictions and results are preserved.
          </p>
          <label className="flex items-center gap-2 text-sm text-blue-900 dark:text-blue-200 cursor-pointer">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="w-4 h-4" />
            I understand — import these fixtures
          </label>
        </div>
      )}

      {file && (
        <button onClick={handleUpload} disabled={uploading || !confirmed} className="adm-btn-primary flex items-center gap-2 disabled:opacity-50">
          {uploading ? (
            <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Uploading…</>
          ) : (
            <><FiUpload className="w-4 h-4" />Upload & Import Fixtures</>
          )}
        </button>
      )}

      {error && (
        <div className="adm-info-card adm-info-card--red">
          <p className="font-semibold text-red-700 dark:text-red-400 mb-2">{error.message}</p>
          {error.errors?.length > 0 && (
            <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 list-disc list-inside">
              {error.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}

      {result && (
        <div className="adm-info-card adm-info-card--green">
          <p className="font-black text-green-700 dark:text-green-400 text-lg mb-1">Import successful!</p>
          <p className="text-sm text-green-800 dark:text-green-300">
            {result.imported} fixtures across GW{result.gameweeks[0]}–GW{result.gameweeks[result.gameweeks.length - 1]}
            {typeof result.inserted === 'number' && <> ({result.inserted} added, {result.updated} updated).</>}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Invites Tab ───────────────────────────────────────────────────────────────
function GenerateInviteModal({ onClose, onGenerated }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await adminAPI.createInvite(name.trim() || null, email.trim() || null);
      const url = `${window.location.origin}${res.data.invite_url}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success('Invite link generated and copied to clipboard');
      } catch {
        window.prompt('Copy this invite link:', url);
      }
      onGenerated();
      onClose();
    } catch {
      toast.error('Failed to generate invite');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gen-invite-title"
    >
      <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 id="gen-invite-title" className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <div className="adm-modal-icon"><FiMail className="w-4 h-4 text-[#FFB81C]" /></div>
            Generate Invite Link
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" aria-label="Close">
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Single-use link, expires in 7 days. Both fields are optional.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="inv-name" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Recipient name <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              id="inv-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sarah Jones"
              className="input-field"
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="inv-email" className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
              Recipient email <span className="font-normal text-gray-400">(optional — pre-fills email button)</span>
            </label>
            <input
              id="inv-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. sarah@rnli.org"
              className="input-field"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 text-sm py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="adm-btn-primary flex-1 text-sm py-2 flex items-center justify-center gap-2 disabled:opacity-50">
              {saving
                ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Generating…</>
                : <><FiPlus className="w-4 h-4" />Generate & Copy</>
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InvitesTab() {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [bulkGenerating, setBulkGenerating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminAPI.getInvites()
      .then((r) => setInvites(r.data.invites))
      .catch(() => toast.error('Failed to load invites'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const fullUrl = (path) => `${window.location.origin}${path}`;

  const copyLink = async (path) => {
    const url = fullUrl(path);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Invite link copied to clipboard');
    } catch {
      toast.error('Could not copy automatically — copy manually');
      window.prompt('Copy this invite link:', url);
    }
  };

  const emailInvite = (inv) => {
    const url = fullUrl(inv.invite_url);
    const to = inv.recipient_email ? encodeURIComponent(inv.recipient_email) : '';
    const subject = encodeURIComponent("You've been invited to the RNLI Premier League Predictor");
    const bodyText = inv.recipient_name
      ? `Hi ${inv.recipient_name},\n\nYou've been invited to join the RNLI Premier League Predictor.\n\nClick here to register: ${url}`
      : `You've been invited to join the RNLI Premier League Predictor.\n\nClick here to register: ${url}`;
    const body = encodeURIComponent(bodyText);
    window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
  };

  const relativeExpiry = (iso) => {
    if (!iso) return '—';
    const diffMs = new Date(iso).getTime() - Date.now();
    if (diffMs <= 0) return 'Soon';
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days >= 1) return `Expires in ${days} day${days === 1 ? '' : 's'}`;
    if (hours >= 1) return `Expires in ${hours} hour${hours === 1 ? '' : 's'}`;
    if (minutes >= 1) return `Expires in ${minutes} minute${minutes === 1 ? '' : 's'}`;
    return 'Soon';
  };

  const generateBulk = async () => {
    setBulkGenerating(true);
    try {
      await Promise.all([...Array(5)].map(() => adminAPI.createInvite()));
      load();
      toast.success('5 invites generated — copy each link from the table below.');
    } catch {
      toast.error('Failed to generate invites');
    } finally {
      setBulkGenerating(false);
    }
  };

  const revoke = async (invite) => {
    try {
      await adminAPI.revokeInvite(invite.id);
      toast.success('Invite revoked');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to revoke invite');
    }
  };

  const inviteStatusCls = (status) => {
    if (status === 'used')    return 'adm-status-badge adm-status-badge--green';
    if (status === 'expired') return 'adm-status-badge adm-status-badge--gray';
    if (status === 'revoked') return 'adm-status-badge adm-status-badge--gray';
    return 'adm-status-badge adm-status-badge--blue';
  };

  const pending = invites.filter((i) => i.status === 'pending');

  return (
    <div className="space-y-4">
      {showModal && (
        <GenerateInviteModal onClose={() => setShowModal(false)} onGenerated={load} />
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <strong>{pending.length}</strong> pending · <strong>{invites.length}</strong> total
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Each link can be used once, expires after 7 days.</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <button onClick={() => setShowModal(true)} disabled={bulkGenerating}
            className="adm-btn-primary flex items-center gap-2 text-sm whitespace-nowrap disabled:opacity-50">
            <FiPlus className="w-4 h-4" />Generate Invite
          </button>
          <button onClick={generateBulk} disabled={bulkGenerating}
            className="adm-btn-primary flex items-center gap-2 text-sm whitespace-nowrap disabled:opacity-50">
            {bulkGenerating ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Generating…</>
            ) : (
              <><FiPlus className="w-4 h-4" />Generate 5</>
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">{[1,2,3].map((i) => <div key={i} className="adm-card h-14" />)}</div>
      ) : invites.length === 0 ? (
        <div className="adm-card text-center py-10 text-gray-400">No invites yet. Generate one to invite a player.</div>
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr className="adm-thead-row">
                <th className="adm-th">Status</th>
                <th className="adm-th hidden sm:table-cell">For</th>
                <th className="adm-th hidden md:table-cell">Email</th>
                <th className="adm-th hidden sm:table-cell">Used by</th>
                <th className="adm-th hidden md:table-cell">Expires</th>
                <th className="adm-th" />
              </tr>
            </thead>
            <tbody>
              {invites.map((inv) => (
                <tr key={inv.id} className="adm-tr">
                  <td className="adm-td">
                    <span className={inviteStatusCls(inv.status)}>{inv.status}</span>
                  </td>
                  <td className="adm-td text-gray-500 dark:text-gray-400 hidden sm:table-cell">{inv.recipient_name || '—'}</td>
                  <td className="adm-td text-gray-500 dark:text-gray-400 hidden md:table-cell text-xs">{inv.recipient_email || '—'}</td>
                  <td className="adm-td text-gray-500 dark:text-gray-400 hidden sm:table-cell">{inv.used_by || '—'}</td>
                  <td className="adm-td text-gray-500 dark:text-gray-400 hidden md:table-cell">
                    {inv.status === 'pending'
                      ? relativeExpiry(inv.expires_at)
                      : inv.status === 'expired'
                        ? 'Expired'
                        : (inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : '—')}
                  </td>
                  <td className="adm-td text-right">
                    {inv.status === 'pending' && (
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => copyLink(inv.invite_url)} className="adm-action-btn" aria-label="Copy invite link">
                          <FiCopy className="w-3.5 h-3.5" /> Copy
                        </button>
                        <button onClick={() => emailInvite(inv)} className="adm-action-btn" aria-label="Email invite link">
                          <FiMail className="w-3.5 h-3.5" /> Email
                        </button>
                        <button onClick={() => revoke(inv)}
                          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-colors"
                          aria-label="Revoke invite">
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Wildcards Tab ─────────────────────────────────────────────────────────────
function WildcardsTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    adminAPI.getUsers()
      .then(r => setUsers(r.data.users))
      .catch(() => toast.error('Failed to load wildcard data'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const used      = users.filter(u => u.has_wildcard);
  const available = users.filter(u => !u.has_wildcard);

  if (loading) return (
    <div className="animate-pulse space-y-2">{[1,2,3,4].map(i => <div key={i} className="adm-card h-14" />)}</div>
  );

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {[
          { label: 'Total Players',    value: users.length,     accent: 'navy'  },
          { label: 'Wildcard Used',    value: used.length,      accent: 'gold'  },
          { label: 'Still Available',  value: available.length, accent: 'green' },
        ].map(t => (
          <div key={t.label} className="adm-card text-center">
            <p className="adm-tile-label text-center">{t.label}</p>
            <p className={`adm-tile-value adm-tile-value--${t.accent} text-center`}>{t.value}</p>
          </div>
        ))}
      </div>

      <div className="adm-table-wrap">
        <div className="flex items-center justify-between px-4 py-3 bg-[#003087] rounded-t-xl">
          <h3 className="font-bold text-white text-sm">Wildcard Status — All Players</h3>
          <button onClick={load} className="p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors" aria-label="Refresh">
            <FiRefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        <table className="adm-table">
          <thead>
            <tr className="adm-thead-row">
              <th className="adm-th">Player</th>
              <th className="adm-th hidden sm:table-cell">Email</th>
              <th className="adm-th text-center">Status</th>
              <th className="adm-th text-center">Gameweek Used</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="adm-tr">
                <td className="adm-td font-semibold text-gray-900 dark:text-white">{u.username}</td>
                <td className="adm-td text-gray-500 dark:text-gray-400 hidden sm:table-cell">{u.email}</td>
                <td className="adm-td text-center">
                  {u.has_wildcard ? (
                    <span className="adm-status-badge adm-status-badge--amber inline-flex items-center gap-1">
                      <FiZap className="w-3 h-3" /> Used
                    </span>
                  ) : (
                    <span className="adm-status-badge adm-status-badge--green inline-flex items-center gap-1">
                      <FiCheckCircle className="w-3 h-3" /> Available
                    </span>
                  )}
                </td>
                <td className="adm-td text-center text-gray-700 dark:text-gray-300">
                  {u.has_wildcard && u.wildcard_gameweeks?.length > 0
                    ? u.wildcard_gameweeks.map(gw => `GW${gw}`).join(', ')
                    : <span className="text-gray-400">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Admin Page ───────────────────────────────────────────────────────────
export default function Admin() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      {/* ── Header banner ── */}
      <div className="adm-banner">
        <span className="adm-goldbar" aria-hidden="true" />
        <div className="relative z-10">
          <span className="adm-kicker">Administration</span>
          <h1 className="adm-title mt-2">Admin Panel</h1>
          <p className="mt-1.5 text-sm text-white/60">Manage users, fixtures, wildcards and invites</p>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="adm-tab-bar">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`adm-tab ${active ? 'adm-tab--active' : ''}`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab content ── */}
      <div>
        {activeTab === 'overview'    && <OverviewTab />}
        {activeTab === 'users'       && <UsersTab />}
        {activeTab === 'wildcards'   && <WildcardsTab />}
        {activeTab === 'predictions' && <PredictionsTab />}
        {activeTab === 'missing'     && <MissingTab />}
        {activeTab === 'fixtures'    && <FixturesTab />}
        {activeTab === 'invites'     && <InvitesTab />}
      </div>
    </div>
  );
}
