/**
 * API Service Layer
 * Centralized axios client for all backend requests.
 * Automatically attaches X-Session-Id header from localStorage.
 */

import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5173';

// Create axios instance
const client = axios.create({
  baseURL: `${BASE_URL}/api`,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach session ID
client.interceptors.request.use((config) => {
  const sessionId = localStorage.getItem('mp_session_id');
  if (sessionId) {
    config.headers['X-Session-Id'] = sessionId;
  }
  return config;
});

// Response interceptor: normalize errors
client.interceptors.response.use(
  (response) => response,
  (error) => {
    const normalized = {
      message: error.response?.data?.error || error.message || 'Network error',
      errorCode: error.response?.data?.errorCode || 'UNKNOWN',
      status: error.response?.status,
      retryAfterSeconds: error.response?.data?.retryAfterSeconds,
    };
    return Promise.reject(normalized);
  }
);

// ─── Session API ─────────────────────────────────────────────────────────────
export const sessionsApi = {
  create: () => client.post('/sessions').then(r => r.data),
  getMe: () => client.get('/sessions/me').then(r => r.data),
};

// ─── Watchlist API ───────────────────────────────────────────────────────────
export const watchlistApi = {
  getAll: () => client.get('/watchlist').then(r => r.data),
  add: (symbol, companyName) =>
    client.post('/watchlist', { symbol, companyName }).then(r => r.data),
  remove: (symbol) => client.delete(`/watchlist/${symbol}`).then(r => r.data),
};

// ─── Stocks API ──────────────────────────────────────────────────────────────
export const stocksApi = {
  getWatchlistQuotes: () => client.get('/stocks/quotes').then(r => r.data),
  getQuote: (symbol) => client.get(`/stocks/quote/${symbol}`).then(r => r.data),
  search: (q) => client.get('/stocks/search', { params: { q } }).then(r => r.data),
};

// ─── Snapshots API ───────────────────────────────────────────────────────────
export const snapshotsApi = {
  commit: () => client.post('/snapshots/commit').then(r => r.data),
  getDiff: () => client.get('/snapshots/diff').then(r => r.data),
};

// ─── Health API ───────────────────────────────────────────────────────────────
export const healthApi = {
  check: () => client.get('/health').then(r => r.data),
};

export default client;
