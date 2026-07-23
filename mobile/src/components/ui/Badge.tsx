import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: '#f3f4f6', text: '#374151' },
  success: { bg: '#d1fae5', text: '#065f46' },
  warning: { bg: '#fef3c7', text: '#92400e' },
  danger: { bg: '#fee2e2', text: '#991b1b' },
  info: { bg: '#dbeafe', text: '#1e40af' },
  purple: { bg: '#ede9fe', text: '#5b21b6' },
}

export function Badge({ children, variant = 'default' }: BadgeProps) {
  const colors = variantColors[variant]
  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{children}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
})
