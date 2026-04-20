import axios from 'axios';

const requestTimeoutMs = Number(import.meta.env.VITE_API_TIMEOUT_MS || 120000);

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
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    if (error.code === 'ECONNABORTED' || String(error.message || '').toLowerCase().includes('timeout')) {
      return Promise.reject(new Error('Request timed out. Increase VITE_API_TIMEOUT_MS or reduce test duration.'));
    }

    const details = error.response?.data?.details;
    const detailsMessage = Array.isArray(details) && details.length ? details[0] : '';
    const message = detailsMessage || error.response?.data?.message || error.message || 'Request failed';
    return Promise.reject(new Error(message));
  },
);

export default apiClient;
