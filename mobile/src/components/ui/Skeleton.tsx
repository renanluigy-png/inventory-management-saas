import React, { useEffect, useRef } from 'react'
import { Animated, View, StyleSheet, type ViewStyle } from 'react-native'
import { useTheme } from '../../hooks/useTheme'

interface SkeletonProps {
  width?: number | string
  height?: number
  borderRadius?: number
  style?: ViewStyle
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonProps) {
  const { theme } = useTheme()
  const opacity = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [opacity])

  return (
    <Animated.View
      style={[
        {
          width: width as number,
          height,
          borderRadius,
          backgroundColor: theme.colors.skeleton,
          opacity,
        },
        style,
      ]}
    />
  )
}

export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Skeleton height={20} width="60%" borderRadius={6} />
      <View style={{ height: 8 }} />
      <Skeleton height={14} width="40%" borderRadius={6} />
    </View>
  )
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.row}>
          <View style={styles.rowLeft}>
            <Skeleton height={14} width="70%" borderRadius={6} />
            <View style={{ height: 6 }} />
            <Skeleton height={12} width="45%" borderRadius={6} />
          </View>
          <Skeleton height={14} width={60} borderRadius={6} />
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 14,
  },
  list: {
    gap: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e5e7eb',
  },
  rowLeft: {
    flex: 1,
    marginRight: 12,
  },
})
