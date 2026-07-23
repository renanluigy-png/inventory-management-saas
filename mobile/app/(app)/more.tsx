import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useAuthStore } from '@/store/auth.store'
import { useThemeStore } from '@/store/theme.store'
import { useTheme } from '@/hooks/useTheme'
import { colors } from '@/theme/colors'
import type { Role } from '@/types'

interface MenuItem {
  label: string
  icon: keyof typeof Ionicons.glyphMap
  route: string
  roles?: Role[]
  color?: string
}

const MENU_ITEMS: { section: string; items: MenuItem[] }[] = [
  {
    section: 'Operações',
    items: [
      { label: 'Scanner de Código', icon: 'barcode-outline', route: '/scanner', color: '#6366f1' },
      { label: 'Estoque', icon: 'layers-outline', route: '/stock', color: '#10b981' },
      { label: 'Caixa', icon: 'cash-outline', route: '/caixa', color: '#f59e0b' },
    ],
  },
  {
    section: 'Análise',
    items: [
      { label: 'Relatórios', icon: 'bar-chart-outline', route: '/reports', color: '#3b82f6' },
      { label: 'Promoções', icon: 'pricetag-outline', route: '/promotions', color: '#8b5cf6' },
    ],
  },
  {
    section: 'Conta',
    items: [
      { label: 'Meu Perfil', icon: 'person-outline', route: '/profile', color: '#6366f1' },
      { label: 'Configurações', icon: 'settings-outline', route: '/settings', color: '#6b7280' },
    ],
  },
]

export default function More() {
  const { theme, scheme } = useTheme()
  const c = theme.colors
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const toggleScheme = useThemeStore((s) => s.toggle)

  function handleLogout() {
    Alert.alert('Sair', 'Deseja sair da sua conta?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await logout()
          router.replace('/(auth)/login')
        },
      },
    ])
  }

  const roleLabel: Record<Role, string> = {
    ADMIN: 'Administrador',
    GERENTE: 'Gerente',
    FUNCIONARIO: 'Funcionário',
    CAIXA: 'Caixa',
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <Text style={[styles.title, { color: c.text }]}>Mais</Text>
        <TouchableOpacity onPress={toggleScheme} style={styles.themeBtn}>
          <Ionicons
            name={scheme === 'dark' ? 'sunny-outline' : 'moon-outline'}
            size={22}
            color={c.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View
          style={[styles.profile, { backgroundColor: c.surface, borderBottomColor: c.border }]}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {user?.nome?.charAt(0).toUpperCase() ?? 'U'}
            </Text>
          </View>
          <View>
            <Text style={[styles.profileName, { color: c.text }]}>{user?.nome ?? '—'}</Text>
            <Text style={[styles.profileRole, { color: c.textSecondary }]}>
              {user?.role ? roleLabel[user.role] : '—'}
            </Text>
            <Text style={[styles.profileEmail, { color: c.textTertiary }]}>{user?.email ?? '—'}</Text>
          </View>
        </View>

        {MENU_ITEMS.map((section) => {
          const filtered = section.items.filter(
            (item) => !item.roles || item.roles.includes(user?.role as Role)
          )
          if (filtered.length === 0) return null
          return (
            <View key={section.section} style={styles.section}>
              <Text style={[styles.sectionLabel, { color: c.textSecondary }]}>
                {section.section}
              </Text>
              <View style={[styles.sectionCard, { backgroundColor: c.surface, borderColor: c.border }]}>
                {filtered.map((item, idx) => (
                  <TouchableOpacity
                    key={item.route}
                    onPress={() => router.push(item.route as any)}
                    style={[
                      styles.menuItem,
                      {
                        borderTopWidth: idx === 0 ? 0 : StyleSheet.hairlineWidth,
                        borderTopColor: c.border,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[styles.menuIcon, { backgroundColor: (item.color ?? colors.primary) + '15' }]}
                    >
                      <Ionicons name={item.icon} size={20} color={item.color ?? colors.primary} />
                    </View>
                    <Text style={[styles.menuLabel, { color: c.text }]}>{item.label}</Text>
                    <Ionicons name="chevron-forward" size={16} color={c.textTertiary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )
        })}

        <View style={styles.section}>
          <TouchableOpacity
            onPress={handleLogout}
            style={[styles.logoutBtn, { backgroundColor: '#fee2e2', borderColor: '#fecaca' }]}
          >
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={[styles.logoutText, { color: '#ef4444' }]}>Sair da conta</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.versionArea}>
          <Text style={[styles.version, { color: c.textTertiary }]}>
            Controle de Estoque v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontWeight: '700' },
  themeBtn: { padding: 4 },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 20,
    borderBottomWidth: 1,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: '700' },
  profileName: { fontSize: 17, fontWeight: '700' },
  profileRole: { fontSize: 13, marginTop: 2 },
  profileEmail: { fontSize: 12, marginTop: 1 },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginLeft: 4,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '500' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  logoutText: { fontSize: 16, fontWeight: '600' },
  versionArea: { alignItems: 'center', padding: 24 },
  version: { fontSize: 12 },
})
