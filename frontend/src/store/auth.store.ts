import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AuthUser } from '../types'

interface AuthState {
  token: string | null
  refreshToken: string | null
  user: AuthUser | null
  isAuthenticated: boolean
  setAuth: (token: string, user: AuthUser, refreshToken?: string) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  logout: () => void
  updateUser: (user: Partial<AuthUser>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,

      setAuth: (token, user, refreshToken) =>
        set({ token, user, isAuthenticated: true, refreshToken: refreshToken ?? null }),

      setTokens: (accessToken, newRefreshToken) =>
        set({ token: accessToken, refreshToken: newRefreshToken }),

      logout: () => {
        set({ token: null, refreshToken: null, user: null, isAuthenticated: false })
      },

      updateUser: (partial) => {
        const current = get().user
        if (current) set({ user: { ...current, ...partial } })
      },
    }),
    {
      name: 'cde-auth',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ token: s.token, refreshToken: s.refreshToken, user: s.user }),
      onRehydrateStorage: () => (state) => {
        if (state?.token && state?.user) {
          state.isAuthenticated = true
        }
      },
    }
  )
)
