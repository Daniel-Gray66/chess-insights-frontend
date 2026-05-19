import axios from 'axios';
import { supabase } from './supabase';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Store token for sync access
let currentToken = null;

export const setAuthToken = (token) => {
  currentToken = token;
};

// Attach token to every request
api.interceptors.request.use((config) => {
  if (currentToken) {
    config.headers.Authorization = `Bearer ${currentToken}`;
  }
  return config;
});

// Redirect to login on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await supabase.auth.signOut();
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
  get: (id) => api.get(`/games/${id}`),
  search: (filters) => api.get('/games/search', { params: filters }),
  sync: () => api.post('/sync'),
};

// ── Repertoire ────────────────────────────────────────────
export const repertoireApi = {
  list: (color) =>
    api.get(`/v1/repertoires${color ? `?color=${color}` : ''}`),
  get: (id) => api.get(`/v1/repertoires/${id}`),
  create: (data) => api.post('/v1/repertoires', data),
  delete: (id) => api.delete(`/v1/repertoires/${id}`),
  updateVisibility: (id, visibility) =>
    api.patch(`/v1/repertoires/${id}/visibility`, { visibility }),
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

// ── Community ─────────────────────────────────────────────
export const communityApi = {
  browse: (color) =>
    api.get(`/v1/community/repertoires${color ? `?color=${color}` : ''}`),
  search: (query, color) =>
    api.get('/v1/community/repertoires/search', params({ q: query, color })),
  getRepertoire: (id) => api.get(`/v1/community/repertoires/${id}`),
  bookmark: (id) => api.post(`/v1/community/repertoires/${id}/bookmark`),
  unbookmark: (id) => api.delete(`/v1/community/repertoires/${id}/bookmark`),
  getBookmarks: () => api.get('/v1/community/bookmarks'),
  copy: (id) => api.post(`/v1/community/repertoires/${id}/copy`),
};

export default api;