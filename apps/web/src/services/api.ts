import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mp_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refreshToken = localStorage.getItem('mp_refresh_token');

      if (refreshToken) {
        try {
          const baseURL = import.meta.env.VITE_API_URL || '/api';
          const { data } = await axios.post(`${baseURL}/auth/refresh`, { refreshToken });
          if (data.success && data.data) {
            localStorage.setItem('mp_token', data.data.token);
            localStorage.setItem('mp_refresh_token', data.data.refreshToken);
            original.headers.Authorization = `Bearer ${data.data.token}`;
            return api(original);
          }
        } catch {
          // Refresh failed
        }
      }

      localStorage.removeItem('mp_token');
      localStorage.removeItem('mp_refresh_token');
      localStorage.removeItem('mp_user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;
