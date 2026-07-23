import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../hooks/useTheme'

interface HeaderProps {
  title: string
  subtitle?: string
  showBack?: boolean
  rightElement?: React.ReactNode
  onBack?: () => void
}

export function Header({ title, subtitle, showBack, rightElement, onBack }: HeaderProps) {
  const { theme, scheme } = useTheme()
  const c = theme.colors
  const insets = useSafeAreaInsets()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.back()
    }
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: c.surface,
          borderBottomColor: c.border,
          paddingTop: insets.top + 8,
        },
      ]}
    >
      <StatusBar
        barStyle={scheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={c.surface}
      />
      <View style={styles.row}>
        {showBack ? (
          <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={c.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}

        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[styles.subtitle, { color: c.textSecondary }]} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>

        <View style={styles.right}>
          {rightElement ?? <View style={styles.placeholder} />}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingBottom: 10,
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
  },
  backBtn: {
    padding: 4,
    marginRight: 4,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 1,
  },
  right: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  placeholder: {
    width: 36,
  },
})
