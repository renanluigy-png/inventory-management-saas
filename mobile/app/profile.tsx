import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { authApi } from '@/api/auth'
import { useAuthStore } from '@/store/auth.store'
import { useTheme } from '@/hooks/useTheme'
import { Header } from '@/components/shared/Header'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { colors } from '@/theme/colors'
import type { Role } from '@/types'

const pwSchema = z
  .object({
    senhaAtual: z.string().min(1, 'Senha atual obrigatória'),
    novaSenha: z.string().min(6, 'Mínimo 6 caracteres'),
    confirmar: z.string().min(1, 'Confirme a nova senha'),
  })
  .refine((d) => d.novaSenha === d.confirmar, {
    message: 'As senhas não coincidem',
    path: ['confirmar'],
  })
type PwFormData = z.infer<typeof pwSchema>

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador',
  GERENTE: 'Gerente',
  FUNCIONARIO: 'Funcionário',
  CAIXA: 'Caixa',
}

export default function Profile() {
  const { theme } = useTheme()
  const c = theme.colors
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const [changingPw, setChangingPw] = useState(false)
  const [showPwForm, setShowPwForm] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PwFormData>({ resolver: zodResolver(pwSchema) })

  async function onChangePw(data: PwFormData) {
    setChangingPw(true)
    try {
      await authApi.changePassword(data.senhaAtual, data.novaSenha)
      Alert.alert('Senha alterada', 'Sua senha foi alterada com sucesso.')
      setShowPwForm(false)
      reset()
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.message ?? 'Senha atual incorreta')
    } finally {
      setChangingPw(false)
    }
  }

  function handleLogout() {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await logout()
        },
      },
    ])
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Header title="Meu Perfil" showBack />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Card style={styles.profileCard}>
          <View style={[styles.avatarWrap, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {user?.nome?.charAt(0).toUpperCase() ?? 'U'}
            </Text>
          </View>
          <Text style={[styles.name, { color: c.text }]}>{user?.nome ?? '—'}</Text>
          <Text style={[styles.role, { color: colors.primary }]}>
            {user?.role ? ROLE_LABELS[user.role] : '—'}
          </Text>
          <Text style={[styles.email, { color: c.textSecondary }]}>{user?.email ?? '—'}</Text>
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Informações da Conta</Text>
          <View style={styles.infoRows}>
            <InfoRow icon="person-outline" label="Nome" value={user?.nome ?? '—'} c={c} />
            <InfoRow icon="mail-outline" label="E-mail" value={user?.email ?? '—'} c={c} />
            <InfoRow icon="shield-checkmark-outline" label="Cargo" value={user?.role ? ROLE_LABELS[user.role] : '—'} c={c} />
          </View>
        </Card>

        <Card>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: c.text }]}>Segurança</Text>
            <TouchableOpacity onPress={() => setShowPwForm(!showPwForm)}>
              <Ionicons
                name={showPwForm ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={c.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {showPwForm && (
            <View style={styles.pwForm}>
              <Controller
                control={control}
                name="senhaAtual"
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input
                    label="Senha Atual"
                    isPassword
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.senhaAtual?.message}
                  />
                )}
              />
              <Controller
                control={control}
                name="novaSenha"
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input
                    label="Nova Senha"
                    isPassword
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.novaSenha?.message}
                    hint="Mínimo 6 caracteres"
                  />
                )}
              />
              <Controller
                control={control}
                name="confirmar"
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input
                    label="Confirmar Nova Senha"
                    isPassword
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.confirmar?.message}
                  />
                )}
              />
              <Button
                onPress={handleSubmit(onChangePw)}
                loading={changingPw}
                fullWidth
              >
                Alterar Senha
              </Button>
            </View>
          )}
        </Card>

        <Button
          variant="danger"
          fullWidth
          onPress={handleLogout}
          leftIcon={<Ionicons name="log-out-outline" size={18} color="#fff" />}
        >
          Sair da Conta
        </Button>
      </ScrollView>
    </SafeAreaView>
  )
}

function InfoRow({
  icon,
  label,
  value,
  c,
}: {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  value: string
  c: any
}) {
  return (
    <View style={[styles.infoRow, { borderTopColor: c.border }]}>
      <Ionicons name={icon} size={18} color={c.textSecondary} />
      <Text style={[styles.infoLabel, { color: c.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: c.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  profileCard: { alignItems: 'center', gap: 8, paddingVertical: 24 },
  avatarWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: { fontSize: 32, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '700' },
  role: { fontSize: 14, fontWeight: '600' },
  email: { fontSize: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoRows: { gap: 0 },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  infoLabel: { fontSize: 14, width: 80 },
  infoValue: { flex: 1, fontSize: 14, fontWeight: '500', textAlign: 'right' },
  pwForm: { gap: 12, marginTop: 12 },
})
