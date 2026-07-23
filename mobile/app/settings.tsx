import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/hooks/useTheme'
import { useThemeStore } from '@/store/theme.store'
import { Header } from '@/components/shared/Header'
import { Card } from '@/components/ui/Card'
import { colors } from '@/theme/colors'

export default function Settings() {
  const { theme, scheme } = useTheme()
  const c = theme.colors
  const toggleScheme = useThemeStore((s) => s.toggle)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [stockAlerts, setStockAlerts] = useState(true)
  const [saleAlerts, setSaleAlerts] = useState(false)
  const [offlineMode, setOfflineMode] = useState(true)

  function SettingRow({
    icon,
    iconColor,
    label,
    sublabel,
    value,
    onToggle,
  }: {
    icon: keyof typeof Ionicons.glyphMap
    iconColor?: string
    label: string
    sublabel?: string
    value: boolean
    onToggle: (v: boolean) => void
  }) {
    return (
      <View style={[styles.settingRow, { borderTopColor: c.border }]}>
        <View style={[styles.settingIcon, { backgroundColor: (iconColor ?? colors.primary) + '15' }]}>
          <Ionicons name={icon} size={18} color={iconColor ?? colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.settingLabel, { color: c.text }]}>{label}</Text>
          {sublabel && (
            <Text style={[styles.settingSubLabel, { color: c.textSecondary }]}>{sublabel}</Text>
          )}
        </View>
        <Switch
          value={value}
          onValueChange={onToggle}
          trackColor={{ false: c.border, true: colors.primary + '80' }}
          thumbColor={value ? colors.primary : c.textTertiary}
        />
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Header title="Configurações" showBack />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Card>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Aparência</Text>
          <View style={styles.settingRow}>
            <View style={[styles.settingIcon, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons
                name={scheme === 'dark' ? 'moon-outline' : 'sunny-outline'}
                size={18}
                color={colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.settingLabel, { color: c.text }]}>Tema Escuro</Text>
              <Text style={[styles.settingSubLabel, { color: c.textSecondary }]}>
                {scheme === 'dark' ? 'Ativado' : 'Desativado'}
              </Text>
            </View>
            <Switch
              value={scheme === 'dark'}
              onValueChange={toggleScheme}
              trackColor={{ false: c.border, true: colors.primary + '80' }}
              thumbColor={scheme === 'dark' ? colors.primary : c.textTertiary}
            />
          </View>
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Notificações</Text>
          <SettingRow
            icon="notifications-outline"
            label="Notificações Push"
            sublabel="Receber alertas do sistema"
            value={notificationsEnabled}
            onToggle={setNotificationsEnabled}
          />
          <SettingRow
            icon="warning-outline"
            iconColor="#f59e0b"
            label="Alerta de Estoque Baixo"
            sublabel="Notificar quando estoque crítico"
            value={stockAlerts}
            onToggle={setStockAlerts}
          />
          <SettingRow
            icon="cash-outline"
            iconColor="#10b981"
            label="Alerta de Vendas Altas"
            sublabel="Notificar venda acima de R$ 1.000"
            value={saleAlerts}
            onToggle={setSaleAlerts}
          />
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Conectividade</Text>
          <SettingRow
            icon="cloud-offline-outline"
            iconColor="#6366f1"
            label="Modo Offline"
            sublabel="Cache de dados para uso sem internet"
            value={offlineMode}
            onToggle={setOfflineMode}
          />
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Conexão</Text>
          <View style={styles.infoRow}>
            <Text style={[styles.infoLabel, { color: c.textSecondary }]}>URL da API</Text>
            <Text style={[styles.infoValue, { color: c.text }]} numberOfLines={1}>
              {process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3333'}
            </Text>
          </View>
          <Text style={[styles.hint, { color: c.textTertiary }]}>
            Para alterar, edite o arquivo .env e reinicie o app
          </Text>
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Sobre</Text>
          <View style={styles.aboutRows}>
            <AboutRow label="Versão" value="1.0.0" c={c} />
            <AboutRow label="Build" value="2026.07" c={c} />
            <AboutRow label="Backend" value="Node.js + Prisma" c={c} />
            <AboutRow label="Plataforma" value="React Native + Expo 52" c={c} />
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}

function AboutRow({ label, value, c }: { label: string; value: string; c: any }) {
  return (
    <View style={[styles.aboutRow, { borderTopColor: c.border }]}>
      <Text style={[styles.aboutLabel, { color: c.textSecondary }]}>{label}</Text>
      <Text style={[styles.aboutValue, { color: c.text }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: { fontSize: 15, fontWeight: '500' },
  settingSubLabel: { fontSize: 12, marginTop: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '500', flex: 1, textAlign: 'right' },
  hint: { fontSize: 12, marginTop: 4 },
  aboutRows: { gap: 0 },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  aboutLabel: { fontSize: 14 },
  aboutValue: { fontSize: 14, fontWeight: '500' },
})
