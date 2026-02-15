import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  FiUsers, FiBarChart2, FiAlertCircle, FiGrid,
  FiTrash2, FiShield, FiUser, FiChevronDown, FiRefreshCw,
  FiCheckCircle, FiXCircle,
} from 'react-icons/fi';

const TABS = [
  { id: 'overview', label: 'Overview', icon: FiGrid },
  { id: 'users', label: 'Users', icon: FiUsers },
  { id: 'predictions', label: 'Predictions', icon: FiBarChart2 },
  { id: 'missing', label: 'Missing', icon: FiAlertCircle },
];

// ── Overview Tab ─────────────────────────────────────────────────────────────
function OverviewTab() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminAPI.getOverview()
      .then(r => setData(r.data))
      .catch(() => toast.error('Failed to load overview'))
      .finally(() => setLoading(false));
  }, []);

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
    </div>
  );
}

// ── Users Tab ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);

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
        <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
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
                <td className="px-4 py-3 text-center font-bold text-gray-900">{u.total_points}</td>
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
                  {u.id !== currentUser?.id && (
                    confirmDelete === u.id ? (
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-xs text-red-600 font-medium">Delete?</span>
                        <button onClick={() => deleteUser(u)} className="text-xs text-red-600 font-bold hover:underline">Yes</button>
                        <button onClick={() => setConfirmDelete(null)} className="text-xs text-gray-500 hover:underline">No</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(u.id)}
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
    if (pts === 5) return 'bg-green-100 text-green-700';
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
      </div>
    </div>
  );
}
