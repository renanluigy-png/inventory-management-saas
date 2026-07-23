import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Ionicons } from '@expo/vector-icons'
import { productsApi } from '@/api/products'
import { useCartStore } from '@/store/cart.store'
import { useTheme } from '@/hooks/useTheme'
import { Header } from '@/components/shared/Header'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { formatCurrency, formatNumber } from '@/utils/format'
import { colors } from '@/theme/colors'

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3333'

export default function ProductDetail() {
  const { theme } = useTheme()
  const c = theme.colors
  const params = useLocalSearchParams<{ id: string }>()
  const qc = useQueryClient()
  const cart = useCartStore()

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', params.id],
    queryFn: () => productsApi.findById(params.id),
  })

  const deleteMutation = useMutation({
    mutationFn: productsApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['products'] })
      router.back()
    },
    onError: (err: any) => {
      Alert.alert('Erro', err?.response?.data?.message ?? 'Erro ao excluir')
    },
  })

  if (isLoading) return <Loading fullScreen message="Carregando produto..." />
  if (!product) return null

  const stockLow = product.estoque <= (product.estoqueMinimo ?? 0)
  const imageUrl = product.imagemUrl ? `${BASE_URL}${product.imagemUrl}` : null

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Header
        title="Detalhes do Produto"
        showBack
        rightElement={
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/product-form', params: { id: product.id } })}
            style={styles.editBtn}
          >
            <Ionicons name="pencil-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.imageArea}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} />
          ) : (
            <View style={[styles.imagePlaceholder, { backgroundColor: c.surfaceSecondary }]}>
              <Ionicons name="cube-outline" size={48} color={c.textTertiary} />
            </View>
          )}
        </View>

        <Card>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: c.text }]}>{product.nome}</Text>
            <Badge variant={product.ativo ? 'success' : 'default'}>
              {product.ativo ? 'Ativo' : 'Inativo'}
            </Badge>
          </View>
          {product.descricao && (
            <Text style={[styles.description, { color: c.textSecondary }]}>
              {product.descricao}
            </Text>
          )}
          <View style={styles.tagRow}>
            <View style={[styles.tag, { backgroundColor: colors.primary + '10' }]}>
              <Text style={[styles.tagText, { color: colors.primary }]}>
                {product.category?.nome ?? '—'}
              </Text>
            </View>
            {product.codigoBarras && (
              <View style={[styles.tag, { backgroundColor: c.surfaceSecondary }]}>
                <Ionicons name="barcode-outline" size={12} color={c.textSecondary} />
                <Text style={[styles.tagText, { color: c.textSecondary }]}>
                  {product.codigoBarras}
                </Text>
              </View>
            )}
          </View>
        </Card>

        <View style={styles.priceRow}>
          <Card style={{ flex: 1 }}>
            <Text style={[styles.priceLabel, { color: c.textSecondary }]}>Preço de Venda</Text>
            <Text style={[styles.price, { color: colors.primary }]}>
              {formatCurrency(Number(product.preco))}
            </Text>
          </Card>
          {product.precoCusto && (
            <Card style={{ flex: 1 }}>
              <Text style={[styles.priceLabel, { color: c.textSecondary }]}>Preço de Custo</Text>
              <Text style={[styles.price, { color: c.text }]}>
                {formatCurrency(Number(product.precoCusto))}
              </Text>
            </Card>
          )}
        </View>

        <Card>
          <Text style={[styles.sectionTitle, { color: c.text }]}>Estoque</Text>
          <View style={styles.stockRow}>
            <View style={styles.stockItem}>
              <Text style={[styles.stockValue, { color: stockLow ? '#ef4444' : '#10b981' }]}>
                {formatNumber(product.estoque)}
              </Text>
              <Text style={[styles.stockLabel, { color: c.textSecondary }]}>
                {product.unidade ?? 'un'} em estoque
              </Text>
            </View>
            <View style={styles.stockItem}>
              <Text style={[styles.stockValue, { color: c.text }]}>
                {formatNumber(product.estoqueMinimo ?? 0)}
              </Text>
              <Text style={[styles.stockLabel, { color: c.textSecondary }]}>mínimo</Text>
            </View>
          </View>
          {stockLow && (
            <View style={[styles.alertBox, { backgroundColor: '#fef3c7', borderColor: '#f59e0b' }]}>
              <Ionicons name="warning-outline" size={16} color="#92400e" />
              <Text style={{ color: '#92400e', fontSize: 13, fontWeight: '500' }}>
                Estoque abaixo do mínimo
              </Text>
            </View>
          )}
        </Card>

        <View style={styles.actions}>
          <Button
            variant="secondary"
            style={{ flex: 1 }}
            onPress={() => {
              cart.addItem(product)
              Alert.alert('Adicionado!', `${product.nome} adicionado ao carrinho`)
            }}
            leftIcon={<Ionicons name="cart-outline" size={18} color={colors.primary} />}
          >
            Adicionar ao PDV
          </Button>
          <Button
            variant="danger"
            onPress={() =>
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
          >
            <Ionicons name="trash-outline" size={18} color="#fff" />
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 16, paddingBottom: 32 },
  imageArea: { alignItems: 'center' },
  image: { width: 160, height: 160, borderRadius: 20 },
  imagePlaceholder: {
    width: 160,
    height: 160,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: { padding: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  name: { flex: 1, fontSize: 20, fontWeight: '700' },
  description: { fontSize: 14, lineHeight: 20, marginBottom: 12 },
  tagRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  tagText: { fontSize: 12, fontWeight: '600' },
  priceRow: { flexDirection: 'row', gap: 12 },
  priceLabel: { fontSize: 12, marginBottom: 4 },
  price: { fontSize: 22, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  stockRow: { flexDirection: 'row', gap: 24 },
  stockItem: { alignItems: 'center', gap: 4 },
  stockValue: { fontSize: 28, fontWeight: '700' },
  stockLabel: { fontSize: 12 },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
  },
  actions: { flexDirection: 'row', gap: 10 },
})
