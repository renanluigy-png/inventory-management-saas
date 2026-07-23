import React from 'react'
import { View, StyleSheet, type ViewProps } from 'react-native'
import { useTheme } from '../../hooks/useTheme'

interface CardProps extends ViewProps {
  children: React.ReactNode
  padding?: number
}

export function Card({ children, padding = 16, style, ...props }: CardProps) {
  const { theme, scheme } = useTheme()
  const c = theme.colors

  return (
    <View
      style={[
        styles.card,
        theme.shadow.card,
        {
          backgroundColor: c.card,
          borderColor: c.border,
          padding,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
  },
})
