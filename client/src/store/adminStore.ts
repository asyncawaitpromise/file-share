import { create } from 'zustand'
import { apiClient, ApiError } from '../services/apiClient.ts'

interface AdminState {
  isLoggedIn: boolean
  isChecked: boolean
  checkSession: () => Promise<void>
  login: (password: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
}

export const useAdminStore = create<AdminState>((set) => ({
  isLoggedIn: false,
  isChecked: false,

  checkSession: async () => {
    try {
      await apiClient.get('/api/admin/me')
      set({ isLoggedIn: true })
    } catch {
      set({ isLoggedIn: false })
    } finally {
      set({ isChecked: true })
    }
  },

  login: async (password) => {
    try {
      await apiClient.post('/api/admin/login', { password })
      set({ isLoggedIn: true, isChecked: true })
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof ApiError ? err.message : 'Login failed' }
    }
  },

  logout: async () => {
    try {
      await apiClient.post('/api/admin/logout')
    } finally {
      set({ isLoggedIn: false })
    }
  },
}))
