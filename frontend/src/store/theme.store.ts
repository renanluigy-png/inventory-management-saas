import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeState {
  theme: 'light' | 'dark'
  sidebarOpen: boolean
  toggleTheme: () => void
  setTheme: (t: 'light' | 'dark') => void
  toggleSidebar: () => void
  setSidebarOpen: (v: boolean) => void
}

function applyTheme(theme: 'light' | 'dark') {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      sidebarOpen: true,

      toggleTheme: () => {
        const next = get().theme === 'light' ? 'dark' : 'light'
        applyTheme(next)
        set({ theme: next })
      },

      setTheme: (t) => {
        applyTheme(t)
        set({ theme: t })
      },

      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      setSidebarOpen: (v) => set({ sidebarOpen: v }),
    }),
    {
      name: 'cde-theme',
      partialize: (s) => ({ theme: s.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme)
      },
    }
  )
)
