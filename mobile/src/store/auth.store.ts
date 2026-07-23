import { create } from 'zustand'
import * as SecureStore from 'expo-secure-store'
import type { AuthUser, CartItem } from '../types'

interface AuthState {
  token: string | null
  user: AuthUser | null
  isLoading: boolean
  setAuth: (token: string, user: AuthUser) => Promise<void>
  loadAuth: () => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,

  setAuth: async (token, user) => {
    await SecureStore.setItemAsync('accessToken', token)
    await SecureStore.setItemAsync('user', JSON.stringify(user))
    set({ token, user })
  },

  loadAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('accessToken')
      const userJson = await SecureStore.getItemAsync('user')
      if (token && userJson) {
        const user = JSON.parse(userJson) as AuthUser
        set({ token, user, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch {
      set({ isLoading: false })
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('accessToken')
    await SecureStore.deleteItemAsync('user')
    set({ token: null, user: null })
  },
}))
