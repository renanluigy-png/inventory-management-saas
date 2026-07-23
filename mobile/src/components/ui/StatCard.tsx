import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../hooks/useTheme'
import { Card } from './Card'

interface StatCardProps {
  title: string
  value: string
  icon: keyof typeof Ionicons.glyphMap
  iconColor?: string
  iconBg?: string
  trend?: { value: number; label: string }
}

export function StatCard({ title, value, icon, iconColor = '#6366f1', iconBg = '#ede9fe', trend }: StatCardProps) {
  const { theme } = useTheme()
  const c = theme.colors

  return (
    <Card style={styles.card}>
      <View style={styles.top}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={20} color={iconColor} />
        </View>
        {trend && (
          <View style={styles.trend}>
            <Ionicons
              name={trend.value >= 0 ? 'trending-up' : 'trending-down'}
              size={14}
              color={trend.value >= 0 ? '#10b981' : '#ef4444'}
            />
            <Text style={[styles.trendText, { color: trend.value >= 0 ? '#10b981' : '#ef4444' }]}>
              {trend.value >= 0 ? '+' : ''}{trend.value.toFixed(1)}%
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.value, { color: c.text }]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={[styles.title, { color: c.textSecondary }]}>{title}</Text>
    </Card>
  )
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    gap: 8,
    minWidth: 140,
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  trendText: {
    fontSize: 11,
    fontWeight: '600',
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
  },
})
