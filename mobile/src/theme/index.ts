import { colors, type ColorScheme } from './colors'

export function getTheme(scheme: ColorScheme) {
  const c = colors[scheme]
  return {
    colors: {
      ...colors,
      ...c,
    },
    spacing: {
      xs: 4,
      sm: 8,
      md: 16,
      lg: 24,
      xl: 32,
      xxl: 48,
    },
    radius: {
      sm: 6,
      md: 10,
      lg: 14,
      xl: 20,
      full: 9999,
    },
    fontSizes: {
      xs: 11,
      sm: 13,
      base: 15,
      md: 17,
      lg: 19,
      xl: 22,
      xxl: 28,
    },
    shadow: {
      card: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: scheme === 'dark' ? 0.3 : 0.06,
        shadowRadius: 8,
        elevation: 3,
      },
    },
  }
}

export type Theme = ReturnType<typeof getTheme>
export { colors }
