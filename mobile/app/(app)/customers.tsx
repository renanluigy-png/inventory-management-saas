import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Ionicons } from '@expo/vector-icons'
import { customersApi } from '@/api/customers'
import { useTheme } from '@/hooks/useTheme'
import { useDebounce } from '@/hooks/useDebounce'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { SkeletonList } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCPF, formatPhone } from '@/utils/format'
import { maskCPF, maskPhone } from '@/utils/masks'
import { colors } from '@/theme/colors'
import type { Customer } from '@/types'

const schema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  cpf: z.string().optional(),
  telefone: z.string().optional(),
  endereco: z.string().optional(),
})
type FormData = z.infer<typeof schema>

export default function Customers() {
  const { theme } = useTheme()
  const c = theme.colors
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 400)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [saving, setSaving] = useState(false)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['customers', page, debouncedSearch],
    queryFn: () => customersApi.findAll({ page, limit: 20, search: debouncedSearch || undefined }),
  })

  const deleteMutation = useMutation({
    mutationFn: customersApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  function openCreate() {
    setEditing(null)
    reset({ nome: '', email: '', cpf: '', telefone: '', endereco: '' })
    setSheetOpen(true)
  }

  function openEdit(customer: Customer) {
    setEditing(customer)
    reset({
      nome: customer.nome,
      email: customer.email ?? '',
      cpf: customer.cpf ?? '',
      telefone: customer.telefone ?? '',
      endereco: customer.endereco ?? '',
    })
    setSheetOpen(true)
  }

  async function onSubmit(data: FormData) {
    setSaving(true)
    try {
      const payload = {
        nome: data.nome,
        email: data.email || undefined,
        cpf: data.cpf ? data.cpf.replace(/\D/g, '') : undefined,
        telefone: data.telefone ? data.telefone.replace(/\D/g, '') : undefined,
        endereco: data.endereco || undefined,
      }
      if (editing) {
        await customersApi.update(editing.id, payload)
      } else {
        await customersApi.create(payload)
      }
      qc.invalidateQueries({ queryKey: ['customers'] })
      setSheetOpen(false)
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.message ?? 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  function confirmDelete(customer: Customer) {
    Alert.alert('Excluir cliente', `Deseja excluir "${customer.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => deleteMutation.mutate(customer.id),
      },
    ])
  }

  const renderItem = useCallback(
    ({ item }: { item: Customer }) => (
      <View style={[styles.row, { borderBottomColor: c.border }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.avatarText, { color: colors.primary }]}>
            {item.nome.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: c.text }]}>{item.nome}</Text>
          <Text style={[styles.sub, { color: c.textSecondary }]}>
            {item.cpf ? formatCPF(item.cpf) : item.email ?? '—'}
          </Text>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity onPress={() => openEdit(item)} style={styles.actionBtn}>
            <Ionicons name="pencil-outline" size={18} color={c.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.actionBtn}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    ),
    [c]
  )

  const customers = data?.data ?? []

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <Text style={[styles.title, { color: c.text }]}>Clientes</Text>
        <TouchableOpacity
          onPress={openCreate}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <View style={[styles.searchBox, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
          <Ionicons name="search-outline" size={18} color={c.textSecondary} />
          <TextInput
            style={[styles.searchText, { color: c.text }]}
            placeholder="Buscar cliente..."
            placeholderTextColor={c.placeholder}
            value={search}
            onChangeText={(t) => { setSearch(t); setPage(1) }}
          />
        </View>
      </View>

      {isLoading ? (
        <View style={{ backgroundColor: c.surface, flex: 1 }}>
          <SkeletonList count={10} />
        </View>
      ) : customers.length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Nenhum cliente"
          description="Cadastre seu primeiro cliente"
          action={
            <Button onPress={openCreate} size="sm">
              Novo Cliente
            </Button>
          }
        />
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          style={{ flex: 1, backgroundColor: c.surface }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor={colors.primary}
            />
          }
          initialNumToRender={15}
          maxToRenderPerBatch={10}
        />
      )}

      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title={editing ? 'Editar Cliente' : 'Novo Cliente'}
        snapTo="90%"
      >
        <View style={styles.form}>
          <Controller
            control={control}
            name="nome"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Nome *"
                placeholder="Nome completo"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.nome?.message}
              />
            )}
          />
          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="cpf"
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input
                    label="CPF"
                    placeholder="000.000.000-00"
                    keyboardType="number-pad"
                    value={value}
                    onChangeText={(t) => onChange(maskCPF(t))}
                    onBlur={onBlur}
                    error={errors.cpf?.message}
                  />
                )}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="telefone"
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input
                    label="Telefone"
                    placeholder="(00) 00000-0000"
                    keyboardType="phone-pad"
                    value={value}
                    onChangeText={(t) => onChange(maskPhone(t))}
                    onBlur={onBlur}
                  />
                )}
              />
            </View>
          </View>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="E-mail"
                placeholder="cliente@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="endereco"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Endereço"
                placeholder="Rua, número, bairro..."
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />
          <View style={styles.formActions}>
            <Button
              variant="secondary"
              onPress={() => setSheetOpen(false)}
              style={{ flex: 1 }}
            >
              Cancelar
            </Button>
            <Button
              onPress={handleSubmit(onSubmit)}
              loading={saving}
              style={{ flex: 1 }}
            >
              {editing ? 'Salvar' : 'Criar'}
            </Button>
          </View>
        </View>
      </BottomSheet>
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
  addBtn: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  searchWrap: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchText: { flex: 1, fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700' },
  name: { fontSize: 15, fontWeight: '600' },
  sub: { fontSize: 13, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6 },
  form: { gap: 14, paddingBottom: 20 },
  row2: { flexDirection: 'row', gap: 10 },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
})
