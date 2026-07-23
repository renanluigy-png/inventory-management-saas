import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  type TextInputProps,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../hooks/useTheme'

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  hint?: string
  leftIcon?: React.ReactNode
  rightElement?: React.ReactNode
  isPassword?: boolean
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightElement,
  isPassword,
  style,
  ...props
}: InputProps) {
  const { theme, scheme } = useTheme()
  const [showPassword, setShowPassword] = useState(false)
  const c = theme.colors

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: c.textSecondary }]}>{label}</Text>
      )}

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: c.inputBackground,
            borderColor: error ? '#ef4444' : c.border,
          },
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

        <TextInput
          style={[
            styles.input,
            {
              color: c.text,
              flex: 1,
            },
            style,
          ]}
          placeholderTextColor={c.placeholder}
          secureTextEntry={isPassword && !showPassword}
          {...props}
        />

        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.rightIcon}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={c.textSecondary}
            />
          </TouchableOpacity>
        )}

        {rightElement && !isPassword && (
          <View style={styles.rightIcon}>{rightElement}</View>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {!error && hint && (
        <Text style={[styles.hint, { color: c.textTertiary }]}>{hint}</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 10,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  input: {
    fontSize: 15,
    paddingVertical: 12,
  },
  leftIcon: {
    marginRight: 10,
  },
  rightIcon: {
    marginLeft: 10,
  },
  error: {
    fontSize: 12,
    color: '#ef4444',
    fontWeight: '500',
  },
  hint: {
    fontSize: 12,
  },
})
