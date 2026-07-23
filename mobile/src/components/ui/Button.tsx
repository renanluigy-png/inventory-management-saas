import React from 'react'
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  View,
  type TouchableOpacityProps,
} from 'react-native'
import { useTheme } from '../../hooks/useTheme'
import { colors } from '../../theme/colors'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'outline'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends TouchableOpacityProps {
  variant?: Variant
  size?: Size
  loading?: boolean
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  children: React.ReactNode
  fullWidth?: boolean
}

const variantStyles: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary: { bg: colors.primary, text: '#fff' },
  secondary: { bg: '#f3f4f6', text: colors.primary },
  danger: { bg: colors.danger, text: '#fff' },
  ghost: { bg: 'transparent', text: colors.primary },
  success: { bg: colors.secondary, text: '#fff' },
  outline: { bg: 'transparent', text: colors.primary, border: colors.primary },
}

const sizeStyles: Record<Size, { paddingH: number; paddingV: number; fontSize: number; iconSize: number }> = {
  sm: { paddingH: 12, paddingV: 6, fontSize: 13, iconSize: 14 },
  md: { paddingH: 18, paddingV: 11, fontSize: 15, iconSize: 16 },
  lg: { paddingH: 24, paddingV: 14, fontSize: 17, iconSize: 18 },
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  children,
  fullWidth = false,
  disabled,
  style,
  ...props
}: ButtonProps) {
  const { scheme } = useTheme()
  const vs = variantStyles[variant]
  const ss = sizeStyles[size]
  const isDisabled = disabled || loading

  const bg =
    variant === 'secondary' && scheme === 'dark' ? '#1e293b' : vs.bg

  const textColor =
    variant === 'secondary' && scheme === 'dark' ? colors.primaryLight : vs.text

  return (
    <TouchableOpacity
      style={[
        styles.base,
        {
          backgroundColor: bg,
          paddingHorizontal: ss.paddingH,
          paddingVertical: ss.paddingV,
          borderWidth: vs.border ? 1.5 : 0,
          borderColor: vs.border,
          width: fullWidth ? '100%' : undefined,
          opacity: isDisabled ? 0.6 : 1,
        },
        style,
      ]}
      disabled={isDisabled}
      activeOpacity={0.75}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={vs.text} />
      ) : (
        <>
          {leftIcon && <View style={styles.icon}>{leftIcon}</View>}
          <Text style={[styles.text, { color: textColor, fontSize: ss.fontSize }]}>
            {children}
          </Text>
          {rightIcon && <View style={styles.icon}>{rightIcon}</View>}
        </>
      )}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    gap: 6,
  },
  text: {
    fontWeight: '600',
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
