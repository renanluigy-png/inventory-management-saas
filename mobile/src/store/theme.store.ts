import { create } from 'zustand'
import { Appearance } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { ColorScheme } from '../theme/colors'

interface ThemeState {
  scheme: ColorScheme
  setScheme: (scheme: ColorScheme) => Promise<void>
  loadScheme: () => Promise<void>
  toggle: () => Promise<void>
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  scheme: (Appearance.getColorScheme() as ColorScheme) ?? 'light',

  setScheme: async (scheme) => {
    await AsyncStorage.setItem('theme', scheme)
    set({ scheme })
  },

  loadScheme: async () => {
    try {
      const saved = await AsyncStorage.getItem('theme')
      if (saved === 'light' || saved === 'dark') {
        set({ scheme: saved })
      }
    } catch {}
  },

  toggle: async () => {
    const next = get().scheme === 'light' ? 'dark' : 'light'
    await get().setScheme(next)
  },
}))
