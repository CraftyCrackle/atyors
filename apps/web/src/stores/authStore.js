import { create } from 'zustand';
import { api } from '../services/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,

  init: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) { set({ loading: false }); return; }
    try {
      const res = await api.get('/auth/me');
      const user = res?.data?.user;
      if (user) {
        set({ user, loading: false });
      } else {
        // api.js already handled the 401 (cleared tokens + redirected) — just stop loading.
        set({ loading: false });
      }
    } catch {
      // Network / server error — don't blow away a valid session.
      // api.js is responsible for clearing tokens on auth failures.
      set({ loading: false });
    }
  },

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    if (res.data.pendingVerification) {
      return res.data;
    }
    localStorage.setItem('accessToken', res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    set({ user: res.data.user });
    return res.data;
  },

  register: async (data) => {
    const res = await api.post('/auth/register', data);
    if (res.data.pendingVerification) {
      return res.data;
    }
    localStorage.setItem('accessToken', res.data.accessToken);
    localStorage.setItem('refreshToken', res.data.refreshToken);
    set({ user: res.data.user });
    return res.data;
  },

  logout: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    try {
      if (refreshToken) await api.post('/auth/logout', { refreshToken });
    } catch { /* best-effort */ }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null });
    window.location.href = '/';
  },

  updateUser: (user) => set({ user }),
}));
