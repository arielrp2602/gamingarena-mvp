import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor: redirige al login si 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path !== '/login') {
        window.location.href = `/login?redirect=${encodeURIComponent(path)}`;
      }
    }
    return Promise.reject(error);
  },
);

export default api;
