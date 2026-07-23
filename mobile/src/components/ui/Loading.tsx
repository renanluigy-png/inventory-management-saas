import React from 'react'
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { colors } from '../../theme/colors'

interface LoadingProps {
  message?: string
  size?: 'small' | 'large'
  fullScreen?: boolean
}

export function Loading({ message, size = 'large', fullScreen = false }: LoadingProps) {
  const { theme } = useTheme()
  const c = theme.colors

  if (fullScreen) {
    return (
      <View style={[styles.fullScreen, { backgroundColor: c.background }]}>
        <ActivityIndicator size={size} color={colors.primary} />
        {message && (
          <Text style={[styles.message, { color: c.textSecondary }]}>{message}</Text>
        )}
      </View>
    )
  }

  return (
    <View style={styles.inline}>
      <ActivityIndicator size={size} color={colors.primary} />
      {message && (
        <Text style={[styles.message, { color: c.textSecondary }]}>{message}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  inline: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
  },
})
