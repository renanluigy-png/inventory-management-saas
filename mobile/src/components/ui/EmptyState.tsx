import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../hooks/useTheme'
import { colors } from '../../theme/colors'

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon = 'folder-open-outline', title, description, action }: EmptyStateProps) {
  const { theme } = useTheme()
  const c = theme.colors

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { backgroundColor: c.surfaceSecondary }]}>
        <Ionicons name={icon} size={32} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: c.text }]}>{title}</Text>
      {description && (
        <Text style={[styles.description, { color: c.textSecondary }]}>{description}</Text>
      )}
      {action && <View style={styles.action}>{action}</View>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 260,
  },
  action: {
    marginTop: 8,
  },
})
