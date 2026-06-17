import { useState, useEffect, useCallback } from 'react';
import { adminAPI, settingsAPI, fixturesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import toast from 'react-hot-toast';
import {
  FiUsers, FiBarChart2, FiAlertCircle, FiGrid,
  FiTrash2, FiShield, FiUser, FiChevronDown, FiRefreshCw,
  FiCheckCircle, FiXCircle, FiEdit2, FiUpload, FiDownload,
  FiKey, FiX, FiMail, FiCopy, FiPlus, FiSlash, FiCalendar, FiStar,
} from 'react-icons/fi';

const TABS = [
  { id: 'overview', label: 'Overview', icon: FiGrid },
  { id: 'users', label: 'Users', icon: FiUsers },
  { id: 'predictions', label: 'Predictions', icon: FiBarChart2 },
  { id: 'missing', label: 'Missing', icon: FiAlertCircle },
  { id: 'fixtures', label: 'Fixtures', icon: FiUpload },
  { id: 'invites', label: 'Invites', icon: FiMail },
];

// ── Overview Tab ─────────────────────────────────────────────────────────────
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

  if (loading) return <div className="animate-pulse space-y-4">{[1,2,3].map(i => <div key={i} className="card h-20 bg-gray-100" />)}</div>;
  if (!data) return null;

  const stats = [
    { label: 'Registered Players', value: data.total_users, color: 'text-blue-600' },
    { label: 'Total Predictions', value: data.total_predictions, color: 'text-green-600' },
    { label: 'Results Entered', value: `${data.total_results} / ${data.total_fixtures}`, color: 'text-amber-700' },
    { label: 'Season Progress', value: `${data.completion_pct}%`, color: 'text-rnli-blue' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="card">
            <p className="text-xs text-gray-500 font-medium mb-1">{s.label}</p>
            <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>
      <div className="card">
        <h3 className="font-bold text-gray-700 mb-3">Season Status</h3>
        <div className="w-full bg-gray-100 rounded-full h-3 mb-2">
          <div
            className="bg-rnli-blue h-3 rounded-full transition-all duration-700"
            style={{ width: `${data.completion_pct}%` }}
          />
        </div>
        <p className="text-sm text-gray-500">
          {data.total_results} of {data.total_fixtures} fixtures have results entered.
          {data.next_gameweek && <> Next up: <span className="font-semibold text-gray-700">Gameweek {data.next_gameweek}</span></>}
        </p>
      </div>

      {/* Season label setting */}
      <div className="card">
        <h3 className="font-bold text-gray-700 mb-1">Season Label</h3>
        <p className="text-xs text-gray-400 mb-3">Displayed in the navbar, footer, and homepage. Change this at the start of each new season.</p>
        {editingSeason ? (
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={seasonInput}
              onChange={(e) => setSeasonInput(e.target.value)}
              placeholder="e.g. 2025/26"
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rnli-blue w-40"
              onKeyDown={(e) => e.key === 'Enter' && handleSeasonSave()}
              autoFocus
            />
            <button
              onClick={handleSeasonSave}
              disabled={savingSeason}
              className="btn-primary text-sm px-4 py-2"
            >
              {savingSeason ? 'Saving…' : 'Save'}
            </button>
            <button
              onClick={() => setEditingSeason(false)}
              className="text-sm text-gray-500 hover:text-gray-700 px-2 py-2"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-rnli-blue">{seasonName}</span>
            <button
              onClick={() => { setSeasonInput(seasonName); setEditingSeason(true); }}
              className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-rnli-blue transition-colors border border-gray-200 rounded-lg px-3 py-1.5 hover:border-rnli-blue"
            >
              <FiEdit2 className="w-3.5 h-3.5" />
              Change season
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-pw-title"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 id="reset-pw-title" className="font-bold text-gray-900 flex items-center gap-2">
            <FiKey className="w-4 h-4 text-rnli-blue" /> Reset password
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Set a new password for <span className="font-semibold text-gray-700">{user.username}</span>.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="new-pw" className="block text-xs font-semibold text-gray-600 mb-1">New password</label>
            <input
              id="new-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="At least 8 characters"
              autoFocus
            />
            {tooShort && <p className="text-xs text-orange-500 mt-1">Min 8 characters</p>}
          </div>
          <div>
            <label htmlFor="confirm-pw" className="block text-xs font-semibold text-gray-600 mb-1">Confirm password</label>
            <input
              id="confirm-pw"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="input-field"
              placeholder="Re-enter password"
            />
            {mismatch && <p className="text-xs text-red-500 mt-1">Passwords do not match</p>}
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 text-sm py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={!canSubmit} className="btn-primary flex-1 text-sm py-2 disabled:opacity-50">
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

  if (loading) return <div className="animate-pulse space-y-2">{[1,2,3,4].map(i => <div key={i} className="card h-16 bg-gray-100" />)}</div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center mb-2">
        <p className="text-sm text-gray-500">{users.length} users registered</p>
        <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" aria-label="Refresh list">
          <FiRefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-semibold text-gray-600">User</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Email</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Predictions</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Points</th>
              <th className="text-center px-4 py-3 font-semibold text-gray-600">Role</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} className={`border-b border-gray-200 last:border-0 ${i % 2 === 0 ? '' : 'bg-gray-50'}`}>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {u.username}
                  {u.id === currentUser?.id && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">YOU</span>}
                </td>
                <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{u.email}</td>
                <td className="px-4 py-3 text-center text-gray-700">{u.prediction_count}</td>
                <td className="px-4 py-3 text-center font-bold text-gray-900">
                  <span className="inline-flex items-center gap-1.5 justify-center">
                    {u.total_points}
                    {u.has_wildcard && (
                      <span
                        className="inline-flex items-center text-amber-500"
                        title={`Wildcard active (Gameweek${u.wildcard_gameweeks?.length > 1 ? 's' : ''} ${(u.wildcard_gameweeks ?? []).join(', ')}) — total includes doubled points`}
                        aria-label="Wildcard active — total includes doubled points"
                      >
                        <FiStar className="w-3.5 h-3.5 fill-current" />
                      </span>
                    )}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  {u.id === currentUser?.id ? (
                    <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded-full font-semibold">
                      <FiShield className="w-3 h-3" /> admin
                    </span>
                  ) : (
                    <button
                      onClick={() => toggleRole(u)}
                      className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold border transition-colors ${
                        u.role === 'admin'
                          ? 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      {u.role === 'admin' ? <FiShield className="w-3 h-3" /> : <FiUser className="w-3 h-3" />}
                      {u.role}
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  {confirmDelete === u.id ? (
                    <div className="flex items-center gap-2 justify-end">
                      <span className="text-xs text-red-600 font-medium">Delete?</span>
                      <button onClick={() => deleteUser(u)} className="text-xs text-red-600 font-bold hover:underline">Yes</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-500 hover:underline">No</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => setResetUser(u)}
                        className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:text-rnli-blue hover:border-rnli-blue transition-colors"
                        aria-label={`Reset password for ${u.username}`}
                      >
                        <FiKey className="w-3.5 h-3.5" /> Reset Password
                      </button>
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => setConfirmDelete(u.id)}
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                          aria-label={`Delete user ${u.username}`}
                        >
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

      {resetUser && (
        <ResetPasswordModal user={resetUser} onClose={() => setResetUser(null)} />
      )}
    </div>
  );
}

// ── Predictions Tab ───────────────────────────────────────────────────────────
function PredictionsTab() {
  const [gameweek, setGameweek] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = (gw) => {
    setLoading(true);
    setData(null);
    adminAPI.getPredictions(gw)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load predictions'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(gameweek); }, [gameweek]);

  const pointsColor = (pts) => {
    // Wildcarded points are pre-doubled by the API: exact 5 -> 10, result 2 -> 4.
    if (pts === 10) return 'bg-green-200 text-green-800';
    if (pts === 5) return 'bg-green-100 text-green-700';
    if (pts === 4) return 'bg-blue-200 text-blue-800';
    if (pts === 2) return 'bg-blue-100 text-blue-700';
    if (pts === 0) return 'bg-red-100 text-red-600';
    return 'text-gray-400';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold text-gray-700">Gameweek:</label>
        <div className="relative">
          <select
            value={gameweek}
            onChange={e => setGameweek(Number(e.target.value))}
            className="input-field w-36 pr-8 appearance-none"
          >
            {Array.from({ length: 38 }, (_, i) => i + 1).map(gw => (
              <option key={gw} value={gw}>Gameweek {gw}</option>
            ))}
          </select>
          <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {loading && <div className="animate-pulse card h-40 bg-gray-100" />}

      {data && (
        <div className="space-y-4">
          {data.fixtures.length === 0 && (
            <div className="card text-center text-gray-500 py-10">No fixtures for this gameweek.</div>
          )}
          {data.fixtures.map(f => (
            <div key={f.fixture_id} className="card p-0 overflow-hidden">
              {/* Fixture header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
                <span className="font-bold text-gray-900 text-sm">{f.home_team} vs {f.away_team}</span>
                {f.result ? (
                  <span className="text-sm font-black text-green-600">{f.result.home} – {f.result.away}</span>
                ) : (
                  <span className="text-xs text-gray-400 italic">No result yet</span>
                )}
              </div>
              {/* Predictions grid */}
              <div className="divide-y divide-gray-100">
                {f.predictions.map(p => (
                  <div key={p.user_id} className="flex items-center justify-between px-4 py-2 text-sm">
                    <span className="text-gray-700 font-medium w-28 truncate">{p.username}</span>
                    {p.predicted_home !== null ? (
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-gray-900">{p.predicted_home} – {p.predicted_away}</span>
                        {p.points !== null && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${pointsColor(p.points)}`}>
                            {p.points} pts
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic text-xs">No prediction</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Missing Tab ───────────────────────────────────────────────────────────────
function MissingTab() {
  const [gameweek, setGameweek] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = (gw) => {
    setLoading(true);
    setData(null);
    adminAPI.getMissingPredictions(gw)
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(gameweek); }, [gameweek]);

  const missing = data?.summary.filter(u => !u.complete) ?? [];
  const complete = data?.summary.filter(u => u.complete) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-semibold text-gray-700">Gameweek:</label>
        <div className="relative">
          <select
            value={gameweek}
            onChange={e => setGameweek(Number(e.target.value))}
            className="input-field w-36 pr-8 appearance-none"
          >
            {Array.from({ length: 38 }, (_, i) => i + 1).map(gw => (
              <option key={gw} value={gw}>Gameweek {gw}</option>
            ))}
          </select>
          <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {loading && <div className="animate-pulse card h-40 bg-gray-100" />}

      {data && (
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Missing */}
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border-b border-red-200">
              <FiXCircle className="w-4 h-4 text-red-500" />
              <span className="font-bold text-red-700 text-sm">
                Missing Predictions ({missing.length})
              </span>
            </div>
            {missing.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500 text-center">Everyone has predicted! 🎉</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {missing.map(u => (
                  <li key={u.user_id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="font-medium text-gray-900">{u.username}</span>
                    <span className="text-red-600 font-semibold text-xs">
                      {u.submitted}/{u.total} done
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Complete */}
          <div className="card p-0 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border-b border-green-200">
              <FiCheckCircle className="w-4 h-4 text-green-600" />
              <span className="font-bold text-green-700 text-sm">
                All Done ({complete.length})
              </span>
            </div>
            {complete.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500 text-center">No completed predictions yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {complete.map(u => (
                  <li key={u.user_id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <span className="font-medium text-gray-900">{u.username}</span>
                    <span className="text-green-600 font-semibold text-xs">{u.total}/{u.total} ✓</span>
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

// Manage per-fixture status (scheduled / postponed). Lets an admin postpone a
// fixture (excluding it from scoring + locking predictions) or reschedule it.
function FixtureStatusManager() {
  const [gameweek, setGameweek] = useState(1);
  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback((gw) => {
    setLoading(true);
    fixturesAPI.getByGameweek(gw)
      .then((r) => setFixtures(r.data.fixtures))
      .catch(() => toast.error('Failed to load fixtures'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(gameweek); }, [gameweek, load]);

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

  const statusBadge = (status) => {
    if (status === 'postponed') return 'bg-amber-100 text-amber-700';
    if (status === 'completed') return 'bg-green-100 text-green-700';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-gray-700">Fixture Status</h3>
          <p className="text-xs text-gray-400">Postpone a fixture to exclude it from scoring, or reschedule it back.</p>
        </div>
        <div className="relative">
          <select
            value={gameweek}
            onChange={(e) => setGameweek(Number(e.target.value))}
            className="input-field w-36 pr-8 appearance-none"
          >
            {Array.from({ length: 38 }, (_, i) => i + 1).map((gw) => (
              <option key={gw} value={gw}>Gameweek {gw}</option>
            ))}
          </select>
          <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-12 bg-gray-100 rounded" />)}</div>
      ) : fixtures.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-6">No fixtures for this gameweek.</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {fixtures.map((f) => {
            const postponed = f.status === 'postponed';
            const busy = updatingId === f.id;
            return (
              <li key={f.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{f.home_team} vs {f.away_team}</p>
                  <p className="text-xs text-gray-400">{f.date}{f.time ? ` · ${f.time}` : ''}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge(f.status)}`}>
                    {f.status || 'scheduled'}
                  </span>
                  {postponed ? (
                    <button
                      onClick={() => setStatus(f, 'scheduled')}
                      disabled={busy}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-gray-200 text-gray-600 hover:border-rnli-blue hover:text-rnli-blue transition-colors disabled:opacity-50"
                    >
                      <FiCalendar className="w-3.5 h-3.5" /> Reschedule
                    </button>
                  ) : (
                    <button
                      onClick={() => setStatus(f, 'postponed')}
                      disabled={busy}
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded border border-amber-200 text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50"
                    >
                      <FiSlash className="w-3.5 h-3.5" /> Postpone
                    </button>
                  )}
                </div>
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

  const handleFile = (f) => {
    setFile(f);
    setResult(null);
    setError(null);
    setConfirmed(false);
  };

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_ROWS.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fixtures_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    if (!file || !confirmed) return;
    const formData = new FormData();
    formData.append('file', file);
    setUploading(true);
    setError(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/admin/fixtures/upload?replace=true`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          body: formData,
        }
      );
      const data = await res.json();
      if (!res.ok) {
        const detail = data.detail;
        const msg = typeof detail === 'object' ? detail.message : detail;
        const errs = typeof detail === 'object' ? detail.errors : [];
        setError({ message: msg, errors: errs });
      } else {
        setResult(data);
        setFile(null);
        setConfirmed(false);
        toast.success(`${data.imported} fixtures imported across ${data.gameweeks.length} gameweeks!`);
      }
    } catch {
      setError({ message: 'Upload failed — check your connection and try again', errors: [] });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Fixture status management */}
      <FixtureStatusManager />

      {/* Instructions */}
      <div className="card bg-blue-50 border border-blue-200">
        <h3 className="font-bold text-rnli-blue mb-2">How to load or update fixtures</h3>
        <ol className="text-sm text-gray-700 space-y-1.5 list-decimal list-inside">
          <li>Download the <strong>CSV template</strong> below to see the required format.</li>
          <li>Get the fixture list from <strong>football-data.co.uk</strong> (free, download the season CSV) or prepare your own using the template format.</li>
          <li>Ensure your CSV has these columns: <code className="bg-white px-1 rounded text-xs">week, date, home, away</code> — plus optional <code className="bg-white px-1 rounded text-xs">time, venue</code>.</li>
          <li>Dates must be in <code className="bg-white px-1 rounded text-xs">YYYY-MM-DD</code> format; times in <code className="bg-white px-1 rounded text-xs">HH:MM</code>.</li>
          <li>Upload the file below — fixtures are <strong>matched on teams + gameweek and updated in place</strong>. New fixtures are added; existing predictions and results are preserved.</li>
        </ol>
        <button
          onClick={downloadTemplate}
          className="mt-3 flex items-center gap-2 text-xs font-semibold text-rnli-blue hover:underline"
        >
          <FiDownload className="w-3.5 h-3.5" />
          Download CSV template
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
          dragOver ? 'border-rnli-blue bg-blue-50' : file ? 'border-green-400 bg-green-50' : 'border-gray-300 hover:border-rnli-blue hover:bg-blue-50'
        }`}
        onClick={() => document.getElementById('fixture-csv-input').click()}
      >
        <input
          id="fixture-csv-input"
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]); }}
        />
        {file ? (
          <div className="space-y-1">
            <FiCheckCircle className="w-8 h-8 text-green-500 mx-auto" />
            <p className="font-semibold text-green-700">{file.name}</p>
            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB · click to change</p>
          </div>
        ) : (
          <div className="space-y-2">
            <FiUpload className="w-8 h-8 text-gray-400 mx-auto" />
            <p className="font-semibold text-gray-600">Drop your CSV here, or click to browse</p>
            <p className="text-xs text-gray-400">Accepts .csv files only</p>
          </div>
        )}
      </div>

      {/* Confirmation */}
      {file && (
        <div className="card bg-blue-50 border border-blue-200">
          <p className="text-sm font-semibold text-blue-800 mb-2">This import updates matching fixtures and adds new ones. Existing predictions and results are preserved.</p>
          <label className="flex items-center gap-2 text-sm text-blue-900 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="w-4 h-4"
            />
            I understand — import these fixtures
          </label>
        </div>
      )}

      {/* Upload button */}
      {file && (
        <button
          onClick={handleUpload}
          disabled={uploading || !confirmed}
          className="btn-primary flex items-center gap-2 disabled:opacity-50"
        >
          {uploading ? (
            <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Uploading…</>
          ) : (
            <><FiUpload className="w-4 h-4" />Upload & Import Fixtures</>
          )}
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="card bg-red-50 border border-red-300">
          <p className="font-semibold text-red-700 mb-2">{error.message}</p>
          {error.errors?.length > 0 && (
            <ul className="text-xs text-red-600 space-y-1 list-disc list-inside">
              {error.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}

      {/* Success */}
      {result && (
        <div className="card bg-green-50 border border-green-300">
          <p className="font-bold text-green-700 text-lg mb-1">Import successful!</p>
          <p className="text-sm text-green-800">
            {result.imported} fixtures processed across gameweeks {result.gameweeks[0]}–{result.gameweeks[result.gameweeks.length - 1]}
            {typeof result.inserted === 'number' && (
              <> ({result.inserted} added, {result.updated} updated).</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Invites Tab ───────────────────────────────────────────────────────────────
function InvitesTab() {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    adminAPI.getInvites()
      .then((r) => setInvites(r.data.invites))
      .catch(() => toast.error('Failed to load invites'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build an absolute URL for sharing from the relative invite_url the API returns.
  const fullUrl = (path) => `${window.location.origin}${path}`;

  const copyLink = async (path) => {
    const url = fullUrl(path);
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Invite link copied to clipboard');
    } catch {
      // Clipboard API can fail on insecure contexts; show the URL as a fallback.
      toast.error('Could not copy automatically — copy manually');
      window.prompt('Copy this invite link:', url);
    }
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await adminAPI.createInvite();
      await copyLink(res.data.invite_url);
      load();
    } catch {
      toast.error('Failed to generate invite');
    } finally {
      setGenerating(false);
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

  const statusBadge = (status) => {
    if (status === 'used') return 'bg-green-100 text-green-700';
    if (status === 'expired') return 'bg-gray-100 text-gray-500';
    return 'bg-blue-100 text-blue-700';
  };

  const pending = invites.filter((i) => i.status === 'pending');

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">{pending.length} pending · {invites.length} total</p>
          <p className="text-xs text-gray-400">Each invite link can be used once and expires after 7 days.</p>
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="btn-primary flex items-center gap-2 text-sm whitespace-nowrap disabled:opacity-50"
        >
          {generating ? (
            <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Generating…</>
          ) : (
            <><FiPlus className="w-4 h-4" />Generate Invite</>
          )}
        </button>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">{[1, 2, 3].map((i) => <div key={i} className="card h-16 bg-gray-100" />)}</div>
      ) : invites.length === 0 ? (
        <div className="card text-center py-10 text-gray-400">No invites yet. Generate one to invite a player.</div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Used by</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Expires</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {invites.map((inv, i) => (
                <tr key={inv.id} className={`border-b border-gray-200 last:border-0 ${i % 2 === 0 ? '' : 'bg-gray-50'}`}>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusBadge(inv.status)}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{inv.used_by || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                    {inv.expires_at ? new Date(inv.expires_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center gap-1 justify-end">
                      {inv.status === 'pending' && (
                        <>
                          <button
                            onClick={() => copyLink(inv.invite_url)}
                            className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-200 text-gray-500 hover:text-rnli-blue hover:border-rnli-blue transition-colors"
                            aria-label="Copy invite link"
                          >
                            <FiCopy className="w-3.5 h-3.5" /> Copy
                          </button>
                          <button
                            onClick={() => revoke(inv)}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                            aria-label="Revoke invite"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
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

// ── Main Admin Page ───────────────────────────────────────────────────────────
export default function Admin() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-rnli-blue">Admin Panel</h1>
        <p className="text-sm text-gray-500 mt-1">Manage users, view predictions and track missing entries</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === tab.id
                  ? 'border-rnli-blue text-rnli-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'overview' && <OverviewTab />}
        {activeTab === 'users' && <UsersTab />}
        {activeTab === 'predictions' && <PredictionsTab />}
        {activeTab === 'missing' && <MissingTab />}
        {activeTab === 'fixtures' && <FixturesTab />}
        {activeTab === 'invites' && <InvitesTab />}
      </div>
    </div>
  );
}
