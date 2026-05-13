import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Helper to build query params, omitting nulls
function params(obj) {
  const p = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v != null) p[k] = v;
  }
  return { params: p };
}

// ── Auth ──────────────────────────────────────────────────
export const authApi = {
  login: (username, password) =>
    api.post('/v1/auth/login', { username, password }),
  register: (username, password, chessComUsername) =>
    api.post('/v1/auth/register', { username, password, chessComUsername }),
};

// ── Stats ─────────────────────────────────────────────────
export const statsApi = {
  getOverview: (filters = {}) =>
    api.get('/stats/overview', params({
      range: filters.timeRange,
      timeClass: filters.timeClass,
      color: filters.color,
    })),

  getWinRatesByColor: (filters = {}) =>
    api.get('/stats/color', params({
      range: filters.timeRange,
      timeClass: filters.timeClass,
    })),

  getRatingProgression: (filters = {}) =>
    api.get('/stats/rating', params({
      range: filters.timeRange,
      timeClass: filters.timeClass,
    })),

  getOpenings: (filters = {}) =>
    api.get('/stats/openings', params({
      range: filters.timeRange,
      timeClass: filters.timeClass,
      color: filters.color,
    })),
};

// ── Games ─────────────────────────────────────────────────
export const gamesApi = {
  list: (params) => api.get('/games', { params }),
  get: (id) => api.get(`/games/${id}`),          // <-- add this
  search: (filters) => api.get('/games/search', { params: filters }),
  sync: () => api.post('/sync'),
};

export const repertoireApi = {
  list: (color) =>
    api.get(`/v1/repertoires${color ? `?color=${color}` : ''}`),
  get: (id) => api.get(`/v1/repertoires/${id}`),
  create: (data) => api.post('/v1/repertoires', data),
  delete: (id) => api.delete(`/v1/repertoires/${id}`),
  addLine: (repId, data) => api.post(`/v1/repertoires/${repId}/lines`, data),
  updateLine: (repId, lineId, data) =>
    api.put(`/v1/repertoires/${repId}/lines/${lineId}`, data),
  deleteLine: (repId, lineId) =>
    api.delete(`/v1/repertoires/${repId}/lines/${lineId}`),
  updateMoveAnnotation: (repId, lineId, moveId, annotation) =>
    api.put(`/v1/repertoires/${repId}/lines/${lineId}/moves/${moveId}`, { annotation }),
  getDrill: (repId) => api.get(`/v1/repertoires/${repId}/drill`),
  submitDrillResult: (repId, data) =>
    api.post(`/v1/repertoires/${repId}/drill/result`, data),
  getDeviations: (repId, limit = 20) =>
    api.get(`/v1/repertoires/${repId}/deviations?limit=${limit}`),
  getAccuracy: (repId) => api.get(`/v1/repertoires/${repId}/accuracy`),
};

export default api;