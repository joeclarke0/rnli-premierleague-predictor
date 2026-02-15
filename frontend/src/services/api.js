import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Add Authorization header if token exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor: Handle 401 errors (redirect to login)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============================================================================
// Authentication API
// ============================================================================

export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (username, email, password) => api.post('/auth/register', { username, email, password }),
  me: () => api.get('/auth/me'),
};

// ============================================================================
// Fixtures API
// ============================================================================

export const fixturesAPI = {
  getAll: (params) => api.get('/fixtures', { params }),
  getByGameweek: (gameweek) => api.get('/fixtures', { params: { gameweek } }),
};

// ============================================================================
// Predictions API
// ============================================================================

export const predictionsAPI = {
  submit: (data) => api.post('/predictions', data),
  get: (params) => api.get('/predictions', { params }),
  getByGameweek: (gameweek) => api.get('/predictions', { params: { gameweek } }),
};

// ============================================================================
// Results API
// ============================================================================

export const resultsAPI = {
  submit: (data) => api.post('/results', data),
  get: (params) => api.get('/results', { params }),
  getByGameweek: (gameweek) => api.get('/results', { params: { gameweek } }),
};

// ============================================================================
// Leaderboard API
// ============================================================================

export const leaderboardAPI = {
  get: () => api.get('/leaderboard'),
};

// ============================================================================
// User Stats API
// ============================================================================

export const statsAPI = {
  getMyStats: () => api.get('/users/me/stats'),
};

// ============================================================================
// Settings API
// ============================================================================

export const settingsAPI = {
  getAll: () => api.get('/settings'),
  update: (key, value) => api.put(`/settings/${key}`, { value }),
};

// ============================================================================
// Admin API
// ============================================================================

export const adminAPI = {
  getOverview: () => api.get('/admin/overview'),
  getUsers: () => api.get('/admin/users'),
  updateUserRole: (userId, role) => api.patch(`/admin/users/${userId}/role`, { role }),
  deleteUser: (userId) => api.delete(`/admin/users/${userId}`),
  getPredictions: (gameweek) => api.get('/admin/predictions', { params: { gameweek } }),
  getMissingPredictions: (gameweek) => api.get('/admin/missing-predictions', { params: { gameweek } }),
};

export default api;
