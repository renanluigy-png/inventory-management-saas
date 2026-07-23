import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { caixaApi } from '@/api/caixa'
import { useTheme } from '@/hooks/useTheme'
import { Header } from '@/components/shared/Header'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDateTime } from '@/utils/format'
import { parseCurrency, maskCurrency } from '@/utils/masks'
import { colors } from '@/theme/colors'
import type { Caixa } from '@/types'

type SheetMode = 'open' | 'close' | 'sangria' | 'suprimento' | null

export default function CaixaScreen() {
  const { theme } = useTheme()
  const c = theme.colors
  const qc = useQueryClient()
  const [sheetMode, setSheetMode] = useState<SheetMode>(null)
  const [valorInput, setValorInput] = useState('')
  const [motivoInput, setMotivoInput] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: caixa, isLoading, refetch } = useQuery({
    queryKey: ['caixa-current'],
    queryFn: caixaApi.getCurrent,
    refetchInterval: 30000,
  })

  const isOpen = caixa?.status === 'ABERTO'

  async function handleAction() {
    const valor = parseCurrency(valorInput)
    if (!valor && sheetMode !== 'close') {
      Alert.alert('Valor inválido', 'Informe um valor maior que zero.')
      return
    }
    setLoading(true)
    try {
      if (sheetMode === 'open') {
        await caixaApi.open(valor)
      } else if (sheetMode === 'close' && caixa) {
        await caixaApi.close(caixa.id, valor || Number(caixa.saldoInicial))
      } else if (sheetMode === 'sangria' && caixa) {
        await caixaApi.sangria(caixa.id, valor, motivoInput || undefined)
      } else if (sheetMode === 'suprimento' && caixa) {
        await caixaApi.suprimento(caixa.id, valor, motivoInput || undefined)
      }
      qc.invalidateQueries({ queryKey: ['caixa-current'] })
      setSheetMode(null)
      setValorInput('')
      setMotivoInput('')
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.message ?? 'Operação falhou')
    } finally {
      setLoading(false)
    }
  }

  const sheetTitles: Record<string, string> = {
    open: 'Abrir Caixa',
    close: 'Fechar Caixa',
    sangria: 'Sangria',
    suprimento: 'Suprimento',
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Header title="Caixa" showBack />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusIcon, { backgroundColor: isOpen ? '#d1fae5' : '#fee2e2' }]}>
              <Ionicons
                name="cash-outline"
                size={28}
                color={isOpen ? '#10b981' : '#ef4444'}
              />
            </View>
            <View>
              <Text style={[styles.statusLabel, { color: c.textSecondary }]}>Status do Caixa</Text>
              <Badge variant={isOpen ? 'success' : 'danger'}>
                {isOpen ? 'Aberto' : 'Fechado'}
              </Badge>
            </View>
          </View>

          {caixa && isOpen && (
            <View style={styles.statusDetails}>
              <DetailRow label="Saldo Inicial" value={formatCurrency(Number(caixa.saldoInicial))} c={c} />
              <DetailRow label="Abertura" value={formatDateTime(caixa.abertura)} c={c} />
              {caixa.user?.nome && (
                <DetailRow label="Operador" value={caixa.user.nome} c={c} />
              )}
            </View>
          )}
        </Card>

        {!isOpen ? (
          <Button
            fullWidth
            size="lg"
            onPress={() => setSheetMode('open')}
            leftIcon={<Ionicons name="lock-open-outline" size={20} color="#fff" />}
          >
            Abrir Caixa
          </Button>
        ) : (
          <View style={styles.actions}>
            <Button
              variant="secondary"
              style={{ flex: 1 }}
              onPress={() => setSheetMode('sangria')}
              leftIcon={<Ionicons name="arrow-down-outline" size={18} color={colors.primary} />}
            >
              Sangria
            </Button>
            <Button
              variant="secondary"
              style={{ flex: 1 }}
              onPress={() => setSheetMode('suprimento')}
              leftIcon={<Ionicons name="arrow-up-outline" size={18} color={colors.primary} />}
            >
              Suprimento
            </Button>
            <Button
              variant="danger"
              style={{ flex: 1 }}
              onPress={() => setSheetMode('close')}
              leftIcon={<Ionicons name="lock-closed-outline" size={18} color="#fff" />}
            >
              Fechar
            </Button>
          </View>
        )}

        <Card>
          <Text style={[styles.infoTitle, { color: c.text }]}>Informações</Text>
          <Text style={[styles.infoText, { color: c.textSecondary }]}>
            • Abra o caixa antes de iniciar vendas do dia{'\n'}
            • Realize sangrias quando o caixa estiver com muito dinheiro{'\n'}
            • Suprimento adiciona dinheiro ao caixa{'\n'}
            • Feche o caixa ao final do expediente
          </Text>
        </Card>
      </ScrollView>

      <BottomSheet
        visible={sheetMode !== null}
        onClose={() => setSheetMode(null)}
        title={sheetMode ? sheetTitles[sheetMode] : ''}
        snapTo="50%"
      >
        <View style={styles.sheetContent}>
          {sheetMode !== 'close' && (
            <Input
              label="Valor (R$)"
              keyboardType="decimal-pad"
              placeholder="R$ 0,00"
              value={valorInput}
              onChangeText={(t) => setValorInput(maskCurrency(t))}
            />
          )}

          {(sheetMode === 'sangria' || sheetMode === 'suprimento') && (
            <Input
              label="Motivo (opcional)"
              placeholder="Descreva o motivo..."
              value={motivoInput}
              onChangeText={setMotivoInput}
            />
          )}

          {sheetMode === 'close' && (
            <Input
              label="Saldo Final (R$)"
              keyboardType="decimal-pad"
              placeholder="R$ 0,00"
              value={valorInput}
              onChangeText={(t) => setValorInput(maskCurrency(t))}
              hint="Informe o valor total em caixa"
            />
          )}

          <Button onPress={handleAction} loading={loading} fullWidth size="lg">
            {sheetMode ? sheetTitles[sheetMode] : 'Confirmar'}
          </Button>
        </View>
      </BottomSheet>
    </SafeAreaView>
  )
}

function DetailRow({ label, value, c }: { label: string; value: string; c: any }) {
  return (
    <View style={[styles.detailRow, { borderTopColor: c.border }]}>
      <Text style={[styles.detailLabel, { color: c.textSecondary }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: c.text }]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  statusCard: { gap: 16 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statusIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusLabel: { fontSize: 13, marginBottom: 6 },
  statusDetails: { gap: 0 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  detailLabel: { fontSize: 14 },
  detailValue: { fontSize: 14, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10 },
  infoTitle: { fontSize: 15, fontWeight: '600', marginBottom: 8 },
  infoText: { fontSize: 13, lineHeight: 22 },
  sheetContent: { gap: 14, paddingBottom: 16 },
})
