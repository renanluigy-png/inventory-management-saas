import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import api from '@/api/client'
import { useTheme } from '@/hooks/useTheme'
import { Header } from '@/components/shared/Header'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/utils/format'
import { colors } from '@/theme/colors'

interface Promotion {
  id: string
  nome: string
  desconto: number
  tipo: 'PERCENTUAL' | 'FIXO'
  dataInicio: string
  dataFim: string
  ativa: boolean
}

const schema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  desconto: z.coerce.number().min(0.01, 'Desconto obrigatório'),
  tipo: z.enum(['PERCENTUAL', 'FIXO']),
  dataInicio: z.string().min(1, 'Data de início obrigatória'),
  dataFim: z.string().min(1, 'Data de fim obrigatória'),
})
type FormData = z.infer<typeof schema>

const promotionsApi = {
  findAll: async () => {
    const res = await api.get('/api/v1/promotions')
    return (res.data?.data?.data ?? res.data?.data ?? []) as Promotion[]
  },
  create: async (data: Omit<Promotion, 'id' | 'ativa'>) => {
    const res = await api.post('/api/v1/promotions', data)
    return res.data.data
  },
  remove: async (id: string) => {
    await api.delete(`/api/v1/promotions/${id}`)
  },
}

export default function Promotions() {
  const { theme } = useTheme()
  const c = theme.colors
  const qc = useQueryClient()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: promotions = [], isLoading } = useQuery({
    queryKey: ['promotions'],
    queryFn: promotionsApi.findAll,
  })

  const deleteMutation = useMutation({
    mutationFn: promotionsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['promotions'] }),
  })

  const { control, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { tipo: 'PERCENTUAL' },
  })

  const today = new Date().toISOString().split('T')[0]

  async function onSubmit(data: FormData) {
    setSaving(true)
    try {
      await promotionsApi.create(data as any)
      qc.invalidateQueries({ queryKey: ['promotions'] })
      setSheetOpen(false)
      reset()
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.message ?? 'Erro ao criar promoção')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Header
        title="Promoções"
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

      {promotions.length === 0 && !isLoading ? (
        <EmptyState
          icon="pricetag-outline"
          title="Nenhuma promoção ativa"
          description="Crie promoções com descontos percentuais ou fixos"
          action={<Button onPress={() => setSheetOpen(true)} size="sm">Nova Promoção</Button>}
        />
      ) : (
        <FlatList
          data={promotions}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isExpired = new Date(item.dataFim) < new Date()
            return (
              <Card style={styles.promoCard}>
                <View style={styles.promoHeader}>
                  <View style={styles.promoLeft}>
                    <Text style={[styles.promoName, { color: c.text }]}>{item.nome}</Text>
                    <Badge variant={item.ativa && !isExpired ? 'success' : 'danger'}>
                      {item.ativa && !isExpired ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </View>
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert('Excluir', `Excluir "${item.nome}"?`, [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Excluir', style: 'destructive', onPress: () => deleteMutation.mutate(item.id) },
                      ])
                    }
                  >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
                <View style={styles.promoDetails}>
                  <View style={[styles.discountBadge, { backgroundColor: colors.purple + '15' }]}>
                    <Text style={[styles.discountText, { color: colors.purple }]}>
                      {item.tipo === 'PERCENTUAL' ? `${item.desconto}%` : `R$ ${item.desconto}`} OFF
                    </Text>
                  </View>
                  <Text style={[styles.dates, { color: c.textSecondary }]}>
                    {formatDate(item.dataInicio)} → {formatDate(item.dataFim)}
                  </Text>
                </View>
              </Card>
            )
          }}
        />
      )}

      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Nova Promoção"
        snapTo="90%"
      >
        <View style={styles.form}>
          <Controller
            control={control}
            name="nome"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Nome da Promoção *"
                placeholder="Ex: Desconto de Verão"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.nome?.message}
              />
            )}
          />

          <View>
            <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Tipo de Desconto</Text>
            <Controller
              control={control}
              name="tipo"
              render={({ field: { onChange, value } }) => (
                <View style={styles.tipoRow}>
                  {(['PERCENTUAL', 'FIXO'] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      onPress={() => onChange(t)}
                      style={[
                        styles.tipoBtn,
                        {
                          backgroundColor: value === t ? colors.primary : c.surfaceSecondary,
                          borderColor: value === t ? colors.primary : c.border,
                          flex: 1,
                        },
                      ]}
                    >
                      <Text style={{ color: value === t ? '#fff' : c.text, fontWeight: '600', textAlign: 'center' }}>
                        {t === 'PERCENTUAL' ? 'Percentual (%)' : 'Valor Fixo (R$)'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            />
          </View>

          <Controller
            control={control}
            name="desconto"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Valor do Desconto *"
                keyboardType="decimal-pad"
                value={value ? String(value) : ''}
                onChangeText={(t) => onChange(Number(t))}
                onBlur={onBlur}
                error={errors.desconto?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="dataInicio"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Data de Início *"
                placeholder="AAAA-MM-DD"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.dataInicio?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="dataFim"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Data de Fim *"
                placeholder="AAAA-MM-DD"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.dataFim?.message}
              />
            )}
          />

          <Button onPress={handleSubmit(onSubmit)} loading={saving} fullWidth size="lg">
            Criar Promoção
          </Button>
        </View>
      </BottomSheet>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  addBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 12 },
  promoCard: { gap: 12 },
  promoHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  promoLeft: { flex: 1, gap: 6 },
  promoName: { fontSize: 16, fontWeight: '700' },
  promoDetails: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  discountBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  discountText: { fontSize: 14, fontWeight: '700' },
  dates: { fontSize: 13 },
  form: { gap: 14, paddingBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  tipoRow: { flexDirection: 'row', gap: 10 },
  tipoBtn: { paddingVertical: 12, borderRadius: 10, borderWidth: 1.5 },
})
