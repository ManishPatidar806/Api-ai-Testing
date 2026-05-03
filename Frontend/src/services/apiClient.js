import axios from 'axios';

const requestTimeoutMs = Number(import.meta.env.VITE_API_TIMEOUT_MS || 120000);
const coldStartTimeoutMs = Number(import.meta.env.VITE_API_COLD_START_TIMEOUT_MS || 180000);
let shouldApplyColdStartTimeout = true;

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1',
  timeout: Number.isFinite(requestTimeoutMs) && requestTimeoutMs > 0 ? requestTimeoutMs : 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (shouldApplyColdStartTimeout) {
    const configuredTimeout = Number(config.timeout || requestTimeoutMs || 120000);
    const fallbackTimeout = Number.isFinite(coldStartTimeoutMs) && coldStartTimeoutMs > 0 ? coldStartTimeoutMs : 180000;
    config.timeout = Math.max(configuredTimeout, fallbackTimeout);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    shouldApplyColdStartTimeout = false;
    return response;
  },
  (error) => {
    shouldApplyColdStartTimeout = false;

    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    if (error.code === 'ECONNABORTED' || String(error.message || '').toLowerCase().includes('timeout')) {
      return Promise.reject(new Error('Request timed out. Render may still be waking up, so please wait 2-3 minutes and retry.'));
    }

    const details = error.response?.data?.details;
    const detailsMessage = Array.isArray(details) && details.length ? details[0] : '';
    const message = detailsMessage || error.response?.data?.message || error.message || 'Request failed';
    return Promise.reject(new Error(message));
  },
);

export default apiClient;
