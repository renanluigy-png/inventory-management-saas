import React from 'react'
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Dimensions,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery } from '@tanstack/react-query'
import { LineChart } from 'react-native-chart-kit'
import { Ionicons } from '@expo/vector-icons'
import { dashboardApi } from '@/api/dashboard'
import { useTheme } from '@/hooks/useTheme'
import { useAuthStore } from '@/store/auth.store'
import { useThemeStore } from '@/store/theme.store'
import { StatCard } from '@/components/ui/StatCard'
import { Card } from '@/components/ui/Card'
import { Loading } from '@/components/ui/Loading'
import { formatCurrency, formatNumber } from '@/utils/format'
import { colors } from '@/theme/colors'

const { width: SCREEN_W } = Dimensions.get('window')
const CHART_W = SCREEN_W - 48

export default function Dashboard() {
  const { theme, scheme } = useTheme()
  const c = theme.colors
  const user = useAuthStore((s) => s.user)
  const toggleScheme = useThemeStore((s) => s.toggle)

  const {
    data: metrics,
    isLoading: mLoading,
    refetch: refetchMetrics,
  } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: dashboardApi.getMetrics,
  })

  const { data: salesChart, isLoading: cLoading } = useQuery({
    queryKey: ['dashboard-chart'],
    queryFn: () => dashboardApi.getSalesChart(30),
  })

  const { data: topProducts } = useQuery({
    queryKey: ['dashboard-top'],
    queryFn: dashboardApi.getTopProducts,
  })

  const [refreshing, setRefreshing] = React.useState(false)
  async function onRefresh() {
    setRefreshing(true)
    await refetchMetrics()
    setRefreshing(false)
  }

  const chartData = React.useMemo(() => {
    if (!salesChart || salesChart.length === 0) return null
    const slice = salesChart.slice(-14)
    return {
      labels: slice.map((p) =>
        new Date(p.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      ),
      datasets: [{ data: slice.map((p) => Number(p.total) || 0) }],
    }
  }, [salesChart])

  const chartConfig = {
    backgroundColor: c.surface,
    backgroundGradientFrom: c.surface,
    backgroundGradientTo: c.surface,
    decimalPlaces: 0,
    color: () => colors.primary,
    labelColor: () => c.textSecondary,
    style: { borderRadius: 14 },
    propsForDots: {
      r: '3',
      strokeWidth: '2',
      stroke: colors.primary,
    },
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.topBar, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <View>
          <Text style={[styles.greeting, { color: c.textSecondary }]}>
            Bom dia,
          </Text>
          <Text style={[styles.userName, { color: c.text }]}>
            {user?.nome?.split(' ')[0] ?? 'Usuário'}
          </Text>
        </View>
        <View style={styles.topActions}>
          <Ionicons
            name={scheme === 'dark' ? 'sunny-outline' : 'moon-outline'}
            size={22}
            color={c.textSecondary}
            onPress={toggleScheme}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <Text style={[styles.sectionTitle, { color: c.text }]}>Resumo do Mês</Text>

        {mLoading ? (
          <Loading />
        ) : (
          <View style={styles.statsGrid}>
            <StatCard
              title="Faturamento"
              value={formatCurrency(Number(metrics?.faturamentoMes ?? 0))}
              icon="trending-up"
              iconColor="#10b981"
              iconBg="#d1fae5"
            />
            <StatCard
              title="Lucro"
              value={formatCurrency(Number(metrics?.lucroMes ?? 0))}
              icon="cash-outline"
              iconColor="#6366f1"
              iconBg="#ede9fe"
            />
            <StatCard
              title="Produtos"
              value={formatNumber(metrics?.quantidadeProdutos ?? 0)}
              icon="cube-outline"
              iconColor="#3b82f6"
              iconBg="#dbeafe"
            />
            <StatCard
              title="Clientes"
              value={formatNumber(metrics?.quantidadeClientes ?? 0)}
              icon="people-outline"
              iconColor="#f59e0b"
              iconBg="#fef3c7"
            />
          </View>
        )}

        {metrics && metrics.produtosEstoqueBaixo > 0 && (
          <View style={[styles.alert, { backgroundColor: '#fef3c7', borderColor: '#f59e0b' }]}>
            <Ionicons name="warning-outline" size={18} color="#92400e" />
            <Text style={[styles.alertText, { color: '#92400e' }]}>
              {metrics.produtosEstoqueBaixo} produto(s) com estoque baixo
            </Text>
          </View>
        )}

        {chartData && (
          <Card style={styles.chartCard} padding={0}>
            <Text style={[styles.sectionTitle, { color: c.text, padding: 16, paddingBottom: 4 }]}>
              Vendas (14 dias)
            </Text>
            <LineChart
              data={chartData}
              width={CHART_W}
              height={180}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
              withInnerLines={false}
              withOuterLines={false}
              formatYLabel={(y) => `R$${Number(y) >= 1000 ? (Number(y) / 1000).toFixed(0) + 'k' : y}`}
            />
          </Card>
        )}

        {topProducts && topProducts.length > 0 && (
          <Card>
            <Text style={[styles.sectionTitle, { color: c.text, marginBottom: 12 }]}>
              Top Produtos
            </Text>
            {topProducts.slice(0, 5).map((tp, idx) => (
              <View
                key={tp.productId}
                style={[
                  styles.topRow,
                  {
                    borderTopColor: c.border,
                    borderTopWidth: idx === 0 ? 0 : StyleSheet.hairlineWidth,
                  },
                ]}
              >
                <View style={[styles.rankBadge, { backgroundColor: colors.primary + '15' }]}>
                  <Text style={[styles.rank, { color: colors.primary }]}>#{idx + 1}</Text>
                </View>
                <Text style={[styles.topName, { color: c.text }]} numberOfLines={1}>
                  {tp.product?.nome ?? tp.nome ?? '—'}
                </Text>
                <View style={styles.topRight}>
                  <Text style={[styles.topQty, { color: c.textSecondary }]}>
                    {tp.quantidadeVendida} un.
                  </Text>
                  <Text style={[styles.topTotal, { color: colors.primary }]}>
                    {formatCurrency(Number(tp.totalVendas))}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  greeting: { fontSize: 13 },
  userName: { fontSize: 20, fontWeight: '700' },
  topActions: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  alertText: { fontSize: 13, fontWeight: '500', flex: 1 },
  chartCard: { overflow: 'hidden' },
  chart: { borderRadius: 14 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rank: { fontSize: 12, fontWeight: '700' },
  topName: { flex: 1, fontSize: 14, fontWeight: '500' },
  topRight: { alignItems: 'flex-end', gap: 2 },
  topQty: { fontSize: 11 },
  topTotal: { fontSize: 13, fontWeight: '600' },
})
