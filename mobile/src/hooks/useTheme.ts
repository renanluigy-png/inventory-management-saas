import { useThemeStore } from '../store/theme.store'
import { getTheme } from '../theme'

export function useTheme() {
  const scheme = useThemeStore((s) => s.scheme)
  const theme = getTheme(scheme)
  return { theme, scheme }
}
