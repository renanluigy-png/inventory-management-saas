import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { BarChart } from 'react-native-chart-kit'
import { Ionicons } from '@expo/vector-icons'
import { reportsApi } from '@/api/reports'
import { dashboardApi } from '@/api/dashboard'
import { useTheme } from '@/hooks/useTheme'
import { Header } from '@/components/shared/Header'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { formatCurrency, formatNumber } from '@/utils/format'
import { colors } from '@/theme/colors'

const { width: SCREEN_W } = Dimensions.get('window')
const CHART_W = SCREEN_W - 48

export default function Reports() {
  const { theme, scheme } = useTheme()
  const c = theme.colors
  const today = new Date().toISOString().split('T')[0]
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0]
  const [downloading, setDownloading] = useState<string | null>(null)

  const { data: financial, isLoading: finLoading } = useQuery({
    queryKey: ['report-financial', firstOfMonth, today],
    queryFn: () => reportsApi.financial({ dataInicio: firstOfMonth, dataFim: today }),
  })

  const { data: inventory, isLoading: invLoading } = useQuery({
    queryKey: ['report-inventory'],
    queryFn: () => reportsApi.inventory(),
  })

  const { data: salesChart } = useQuery({
    queryKey: ['dashboard-chart-30'],
    queryFn: () => dashboardApi.getSalesChart(30),
  })

  const chartConfig = {
    backgroundColor: c.surface,
    backgroundGradientFrom: c.surface,
    backgroundGradientTo: c.surface,
    decimalPlaces: 0,
    color: () => colors.primary,
    labelColor: () => c.textSecondary,
  }

  const barData = React.useMemo(() => {
    if (!salesChart || salesChart.length === 0) return null
    const slice = salesChart.slice(-7)
    return {
      labels: slice.map((p) =>
        new Date(p.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      ),
      datasets: [{ data: slice.map((p) => Number(p.total) || 0) }],
    }
  }, [salesChart])

  async function handleDownload(type: 'financial' | 'inventory') {
    setDownloading(type)
    try {
      if (type === 'financial') {
        await reportsApi.downloadFinancialPdf({ dataInicio: firstOfMonth, dataFim: today })
      } else {
        await reportsApi.downloadInventoryPdf()
      }
    } catch {
      Alert.alert('Erro', 'Não foi possível gerar o relatório')
    } finally {
      setDownloading(null)
    }
  }

  function MetricBox({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
      <View style={[styles.metricBox, { backgroundColor: c.surfaceSecondary }]}>
        <Text style={[styles.metricLabel, { color: c.textSecondary }]}>{label}</Text>
        <Text style={[styles.metricValue, { color: color ?? c.text }]}>{value}</Text>
      </View>
    )
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Header title="Relatórios" showBack />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Card>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLeft}>
              <Ionicons name="bar-chart-outline" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: c.text }]}>Relatório Financeiro</Text>
            </View>
            <Button
              variant="outline"
              size="sm"
              loading={downloading === 'financial'}
              onPress={() => handleDownload('financial')}
              leftIcon={<Ionicons name="download-outline" size={14} color={colors.primary} />}
            >
              PDF
            </Button>
          </View>
          <Text style={[styles.period, { color: c.textSecondary }]}>
            {new Date(firstOfMonth).toLocaleDateString('pt-BR')} – {new Date(today).toLocaleDateString('pt-BR')}
          </Text>
          {finLoading ? (
            <Loading size="small" />
          ) : (
            <View style={styles.metricsGrid}>
              <MetricBox label="Faturamento" value={formatCurrency(Number((financial as any)?.totalVendas ?? 0))} color={colors.primary} />
              <MetricBox label="Nº Vendas" value={formatNumber((financial as any)?.quantidadeVendas ?? 0)} />
              <MetricBox label="Ticket Médio" value={formatCurrency(Number((financial as any)?.ticketMedio ?? 0))} />
              <MetricBox label="Lucro Est." value={formatCurrency(Number((financial as any)?.lucroEstimado ?? 0))} color="#10b981" />
            </View>
          )}
        </Card>

        {barData && (
          <Card padding={0} style={{ overflow: 'hidden' }}>
            <Text style={[styles.sectionTitle, { color: c.text, padding: 16, paddingBottom: 4 }]}>
              Vendas (últimos 7 dias)
            </Text>
            <BarChart
              data={barData}
              width={CHART_W}
              height={180}
              chartConfig={chartConfig}
              style={{ borderRadius: 14 }}
              fromZero
              withInnerLines={false}
              showValuesOnTopOfBars={false}
              yAxisLabel="R$"
              yAxisSuffix=""
            />
          </Card>
        )}

        <Card>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionLeft}>
              <Ionicons name="layers-outline" size={20} color="#10b981" />
              <Text style={[styles.sectionTitle, { color: c.text }]}>Relatório de Estoque</Text>
            </View>
            <Button
              variant="outline"
              size="sm"
              loading={downloading === 'inventory'}
              onPress={() => handleDownload('inventory')}
              leftIcon={<Ionicons name="download-outline" size={14} color={colors.primary} />}
            >
              PDF
            </Button>
          </View>
          {invLoading ? (
            <Loading size="small" />
          ) : (
            <View style={styles.metricsGrid}>
              <MetricBox label="Total Produtos" value={formatNumber((inventory as any)?.totalProdutos ?? 0)} />
              <MetricBox label="Valor em Estoque" value={formatCurrency(Number((inventory as any)?.valorTotal ?? 0))} color={colors.primary} />
              <MetricBox label="Est. Baixo" value={formatNumber((inventory as any)?.produtosEstoqueBaixo ?? 0)} color="#f59e0b" />
              <MetricBox label="Sem Estoque" value={formatNumber((inventory as any)?.produtosSemEstoque ?? 0)} color="#ef4444" />
            </View>
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  period: { fontSize: 12, marginBottom: 12 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricBox: {
    flex: 1,
    minWidth: '45%',
    padding: 14,
    borderRadius: 10,
    gap: 4,
  },
  metricLabel: { fontSize: 11, fontWeight: '500' },
  metricValue: { fontSize: 18, fontWeight: '700' },
})
