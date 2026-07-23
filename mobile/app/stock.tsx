import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { stockApi } from '@/api/stock'
import { productsApi } from '@/api/products'
import { useTheme } from '@/hooks/useTheme'
import { Header } from '@/components/shared/Header'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { SkeletonList } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDateTime } from '@/utils/format'
import { colors } from '@/theme/colors'
import type { StockMovement, MovementType } from '@/types'

const schema = z.object({
  productId: z.string().min(1, 'Produto obrigatório'),
  tipo: z.enum(['ENTRADA', 'SAIDA', 'AJUSTE', 'DEVOLUCAO']),
  quantidade: z.coerce.number().min(1, 'Mínimo 1'),
  motivo: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const TIPO_LABELS: Record<MovementType, string> = {
  ENTRADA: 'Entrada',
  SAIDA: 'Saída',
  AJUSTE: 'Ajuste',
  DEVOLUCAO: 'Devolução',
}
const TIPO_COLORS: Record<MovementType, 'success' | 'danger' | 'info' | 'warning'> = {
  ENTRADA: 'success',
  SAIDA: 'danger',
  AJUSTE: 'info',
  DEVOLUCAO: 'warning',
}

export default function Stock() {
  const { theme } = useTheme()
  const c = theme.colors
  const qc = useQueryClient()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['stock'],
    queryFn: () => stockApi.findAll({ limit: 50 }),
  })

  const { data: products } = useQuery({
    queryKey: ['products-simple'],
    queryFn: () => productsApi.findAll({ limit: 200 }),
  })

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'ENTRADA', quantidade: 1 },
  })

  async function onSubmit(data: FormData) {
    setSaving(true)
    try {
      await stockApi.create(data)
      qc.invalidateQueries({ queryKey: ['stock'] })
      qc.invalidateQueries({ queryKey: ['products'] })
      setSheetOpen(false)
      reset()
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.message ?? 'Erro ao registrar movimentação')
    } finally {
      setSaving(false)
    }
  }

  const movements = data?.data ?? []

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Header
        title="Controle de Estoque"
        showBack
        rightElement={
          <TouchableOpacity
            onPress={() => setSheetOpen(true)}
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        }
      />

      {isLoading ? (
        <View style={{ backgroundColor: c.surface, flex: 1 }}>
          <SkeletonList count={10} />
        </View>
      ) : movements.length === 0 ? (
        <EmptyState
          icon="layers-outline"
          title="Nenhuma movimentação"
          description="Registre entradas, saídas e ajustes de estoque"
          action={<Button onPress={() => setSheetOpen(true)} size="sm">Nova Movimentação</Button>}
        />
      ) : (
        <FlatList
          data={movements}
          keyExtractor={(item) => item.id}
          style={{ flex: 1, backgroundColor: c.surface }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          renderItem={({ item }: { item: StockMovement }) => (
            <View style={[styles.row, { borderBottomColor: c.border }]}>
              <View style={styles.rowLeft}>
                <Text style={[styles.productName, { color: c.text }]} numberOfLines={1}>
                  {item.product?.nome ?? '—'}
                </Text>
                <Text style={[styles.meta, { color: c.textSecondary }]}>
                  {item.user?.nome ?? '—'} · {formatDateTime(item.createdAt)}
                </Text>
                {item.motivo && (
                  <Text style={[styles.motivo, { color: c.textTertiary }]}>{item.motivo}</Text>
                )}
              </View>
              <View style={styles.rowRight}>
                <Badge variant={TIPO_COLORS[item.tipo]}>{TIPO_LABELS[item.tipo]}</Badge>
                <Text
                  style={[
                    styles.qty,
                    {
                      color:
                        item.tipo === 'ENTRADA' || item.tipo === 'DEVOLUCAO'
                          ? '#10b981'
                          : '#ef4444',
                    },
                  ]}
                >
                  {item.tipo === 'ENTRADA' || item.tipo === 'DEVOLUCAO' ? '+' : '-'}
                  {item.quantidade}
                </Text>
              </View>
            </View>
          )}
        />
      )}

      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Nova Movimentação"
        snapTo="90%"
      >
        <View style={styles.form}>
          <View>
            <Text style={[styles.label, { color: c.textSecondary }]}>Produto *</Text>
            <Controller
              control={control}
              name="productId"
              render={({ field: { onChange, value } }) => (
                <View style={[styles.select, { borderColor: c.border, backgroundColor: c.inputBackground }]}>
                  {(products?.data ?? []).map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      onPress={() => onChange(p.id)}
                      style={[
                        styles.selectOption,
                        {
                          backgroundColor: value === p.id ? colors.primary + '15' : 'transparent',
                          borderRadius: 8,
                        },
                      ]}
                    >
                      <Text style={{ color: value === p.id ? colors.primary : c.text, fontWeight: value === p.id ? '600' : '400' }}>
                        {p.nome} (est: {p.estoque})
                      </Text>
                    </TouchableOpacity>
                  )).slice(0, 10)}
                </View>
              )}
            />
            {errors.productId && (
              <Text style={styles.errorText}>{errors.productId.message}</Text>
            )}
          </View>

          <View>
            <Text style={[styles.label, { color: c.textSecondary }]}>Tipo *</Text>
            <Controller
              control={control}
              name="tipo"
              render={({ field: { onChange, value } }) => (
                <View style={styles.tipoRow}>
                  {(['ENTRADA', 'SAIDA', 'AJUSTE', 'DEVOLUCAO'] as MovementType[]).map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => onChange(t)}
                      style={[
                        styles.tipoBtn,
                        {
                          backgroundColor: value === t ? colors.primary : c.surfaceSecondary,
                          borderColor: value === t ? colors.primary : c.border,
                        },
                      ]}
                    >
                      <Text style={{ color: value === t ? '#fff' : c.text, fontSize: 12, fontWeight: '600' }}>
                        {TIPO_LABELS[t]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
          </View>

          <Controller
            control={control}
            name="quantidade"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Quantidade *"
                keyboardType="number-pad"
                value={String(value)}
                onChangeText={(t) => onChange(Number(t))}
                onBlur={onBlur}
                error={errors.quantidade?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="motivo"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Motivo (opcional)"
                placeholder="Descrição da movimentação"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />

          <Button onPress={handleSubmit(onSubmit)} loading={saving} fullWidth size="lg">
            Registrar Movimentação
          </Button>
        </View>
      </BottomSheet>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  addBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: { flex: 1, gap: 3 },
  rowRight: { alignItems: 'flex-end', gap: 6 },
  productName: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12 },
  motivo: { fontSize: 12 },
  qty: { fontSize: 17, fontWeight: '700' },
  form: { gap: 14, paddingBottom: 20 },
  label: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  select: {
    borderWidth: 1.5,
    borderRadius: 10,
    overflow: 'hidden',
    maxHeight: 180,
  },
  selectOption: { paddingHorizontal: 12, paddingVertical: 10 },
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 4 },
  tipoRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tipoBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
  },
})
