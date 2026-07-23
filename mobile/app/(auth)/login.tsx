import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { LinearGradient } from 'expo-linear-gradient'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth.store'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { colors } from '@/theme/colors'

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(1, 'Senha obrigatória'),
})
type FormData = z.infer<typeof schema>

export default function Login() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const [loading, setLoading] = useState(false)

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', senha: '' },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const result = await authApi.login(data.email, data.senha)
      await setAuth(result.accessToken, result.user)
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? 'E-mail ou senha incorretos'
      Alert.alert('Erro ao entrar', msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#6366f1', '#4f46e5', '#312e81']}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.kv}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View entering={FadeInUp.delay(100).duration(600)} style={styles.logoArea}>
              <View style={styles.logoIcon}>
                <Ionicons name="storefront" size={36} color="#fff" />
              </View>
              <Text style={styles.appName}>Controle de Estoque</Text>
              <Text style={styles.appSub}>Gestão inteligente para seu negócio</Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.card}>
              <Text style={styles.cardTitle}>Entrar na sua conta</Text>

              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input
                    label="E-mail"
                    placeholder="admin@empresa.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    returnKeyType="next"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.email?.message}
                    leftIcon={
                      <Ionicons name="mail-outline" size={18} color={colors.primary} />
                    }
                  />
                )}
              />

              <Controller
                control={control}
                name="senha"
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input
                    label="Senha"
                    placeholder="••••••••"
                    isPassword
                    autoComplete="password"
                    returnKeyType="done"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.senha?.message}
                    leftIcon={
                      <Ionicons name="lock-closed-outline" size={18} color={colors.primary} />
                    }
                    onSubmitEditing={handleSubmit(onSubmit)}
                  />
                )}
              />

              <Button
                onPress={handleSubmit(onSubmit)}
                loading={loading}
                fullWidth
                size="lg"
                style={styles.loginBtn}
              >
                Entrar
              </Button>

              <View style={styles.hint}>
                <Ionicons name="information-circle-outline" size={14} color="#6b7280" />
                <Text style={styles.hintText}>
                  Credencial de teste: admin@empresa.com / senha123
                </Text>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  kv: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 28,
  },
  logoArea: {
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 76,
    height: 76,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  appName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
  },
  appSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  loginBtn: {
    marginTop: 4,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  hintText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
})
