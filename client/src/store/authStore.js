import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../utils/api'

export const useAuthStore = create(persist((set) => ({
  user: null, token: null, loading: false,
  login: async (email, password) => {
    set({ loading: true })
    try {
      const { data } = await api.post('/auth/login', { email, password })
      set({ user: data.user, token: data.token, loading: false })
      return { ok: true }
    } catch (e) { set({ loading: false }); return { ok: false, error: e.response?.data?.message || 'Login failed' } }
  },
  register: async (name, email, password) => {
    set({ loading: true })
    try {
      const { data } = await api.post('/auth/register', { name, email, password })
      set({ user: data.user, token: data.token, loading: false })
      return { ok: true }
    } catch (e) { set({ loading: false }); return { ok: false, error: e.response?.data?.message || 'Registration failed' } }
  },
  logout: () => { set({ user: null, token: null }); localStorage.removeItem('sine-auth') },
}), { name: 'sine-auth', partialize: s => ({ user: s.user, token: s.token }) }))
