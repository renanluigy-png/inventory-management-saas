import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  RefreshControl,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { productsApi } from '@/api/products'
import { useTheme } from '@/hooks/useTheme'
import { useDebounce } from '@/hooks/useDebounce'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Loading } from '@/components/ui/Loading'
import { EmptyState } from '@/components/ui/EmptyState'
import { SkeletonList } from '@/components/ui/Skeleton'
import { formatCurrency } from '@/utils/format'
import { colors } from '@/theme/colors'
import type { Product } from '@/types'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3333'

export default function Products() {
  const { theme } = useTheme()
  const c = theme.colors
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 400)

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['products', page, debouncedSearch],
    queryFn: () => productsApi.findAll({ page, limit: 20, search: debouncedSearch || undefined }),
  })

  const deleteMutation = useMutation({
    mutationFn: productsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
    },
  })

  function confirmDelete(product: Product) {
    Alert.alert(
      'Excluir Produto',
      `Deseja excluir "${product.nome}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(product.id),
        },
      ]
    )
  }

  const renderItem = useCallback(
    ({ item }: { item: Product }) => {
      const stockLow = item.estoque <= (item.estoqueMinimo ?? 0)
      const imageUrl = item.imagemUrl ? `${BASE_URL}${item.imagemUrl}` : null

      return (
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/product-detail', params: { id: item.id } })}
          activeOpacity={0.7}
        >
          <View style={[styles.row, { borderBottomColor: c.border }]}>
            <View style={[styles.imgWrap, { backgroundColor: c.surfaceSecondary }]}>
              {imageUrl ? (
                <Image source={{ uri: imageUrl }} style={styles.img} />
              ) : (
                <Ionicons name="cube-outline" size={22} color={c.textTertiary} />
              )}
            </View>
            <View style={styles.rowInfo}>
              <Text style={[styles.productName, { color: c.text }]} numberOfLines={1}>
                {item.nome}
              </Text>
              <Text style={[styles.productCategory, { color: c.textSecondary }]}>
                {item.category?.nome ?? '—'}
              </Text>
              <View style={styles.rowBottom}>
                <Text style={[styles.price, { color: colors.primary }]}>
                  {formatCurrency(Number(item.preco))}
                </Text>
                <Badge variant={stockLow ? 'danger' : 'success'}>
                  {item.estoque} un
                </Badge>
              </View>
            </View>
            <View style={styles.rowActions}>
              <TouchableOpacity
                onPress={() =>
                  router.push({ pathname: '/product-form', params: { id: item.id } })
                }
                style={styles.actionBtn}
              >
                <Ionicons name="pencil-outline" size={18} color={c.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => confirmDelete(item)} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      )
    },
    [c]
  )

  const products = data?.data ?? []
  const meta = data?.meta
  const hasMore = meta ? page < meta.totalPages : false

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <Text style={[styles.title, { color: c.text }]}>Produtos</Text>
        <TouchableOpacity
          onPress={() => router.push('/product-form')}
          style={[styles.addBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchWrap, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <View style={[styles.searchInput, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
          <Ionicons name="search-outline" size={18} color={c.textSecondary} />
          <TextInput
            style={[styles.searchText, { color: c.text }]}
            placeholder="Buscar produto ou código..."
            placeholderTextColor={c.placeholder}
            value={search}
            onChangeText={(t) => { setSearch(t); setPage(1) }}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={c.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          onPress={() => router.push('/scanner')}
          style={[styles.scanBtn, { backgroundColor: colors.primary + '15' }]}
        >
          <Ionicons name="barcode-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <Card style={styles.listCard}>
          <SkeletonList count={8} />
        </Card>
      ) : products.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="Nenhum produto encontrado"
          description={search ? `Nenhum resultado para "${search}"` : 'Cadastre seu primeiro produto'}
          action={
            <TouchableOpacity
              onPress={() => router.push('/product-form')}
              style={[styles.emptyActionBtn, { backgroundColor: colors.primary }]}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.emptyActionText}>Novo Produto</Text>
            </TouchableOpacity>
          }
        />
      ) : (
        <FlatList
          data={products}
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
          onEndReached={() => hasMore && setPage((p) => p + 1)}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isFetching && !isLoading ? <Loading size="small" /> : null
          }
          ItemSeparatorComponent={() => null}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
        />
      )}
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
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchText: { flex: 1, fontSize: 15 },
  scanBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCard: { margin: 0, borderRadius: 0, borderWidth: 0 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  imgWrap: {
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  img: { width: 52, height: 52, resizeMode: 'cover' },
  rowInfo: { flex: 1, gap: 3 },
  productName: { fontSize: 15, fontWeight: '600' },
  productCategory: { fontSize: 12 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  price: { fontSize: 14, fontWeight: '700' },
  rowActions: { gap: 4 },
  actionBtn: { padding: 6 },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyActionText: { color: '#fff', fontWeight: '600', fontSize: 14 },
})
