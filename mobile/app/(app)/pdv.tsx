import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { productsApi } from '@/api/products'
import { salesApi } from '@/api/sales'
import { useCartStore } from '@/store/cart.store'
import { useTheme } from '@/hooks/useTheme'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { BottomSheet } from '@/components/ui/BottomSheet'
import { formatCurrency, PAYMENT_LABELS } from '@/utils/format'
import { colors } from '@/theme/colors'
import type { FormaPagamento, Product } from '@/types'

const PAYMENT_OPTIONS: FormaPagamento[] = [
  'DINHEIRO',
  'CARTAO_CREDITO',
  'CARTAO_DEBITO',
  'PIX',
  'FIADO',
]

export default function PDV() {
  const { theme } = useTheme()
  const c = theme.colors
  const cart = useCartStore()
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [finalizing, setFinalizing] = useState(false)

  async function handleSearch(text: string) {
    setSearch(text)
    if (text.length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const result = await productsApi.findAll({ search: text, limit: 8 })
      setSearchResults(result.data)
    } catch {
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  async function handleBarcodeSearch(barcode: string) {
    try {
      const product = await productsApi.findByBarcode(barcode)
      cart.addItem(product)
      setSearch('')
      setSearchResults([])
    } catch {
      Alert.alert('Produto não encontrado', `Código: ${barcode}`)
    }
  }

  function addToCart(product: Product) {
    cart.addItem(product)
    setSearch('')
    setSearchResults([])
  }

  async function finalize() {
    if (cart.items.length === 0) return
    setFinalizing(true)
    try {
      const sale = await salesApi.create(cart.customerId)
      for (const item of cart.items) {
        await salesApi.addItem(sale.id, {
          productId: item.product.id,
          quantidade: item.quantidade,
        })
      }
      await salesApi.finalize(sale.id, cart.formaPagamento, cart.desconto || undefined)
      cart.clear()
      setShowCheckout(false)
      Alert.alert('Venda Finalizada!', `Total: ${formatCurrency(cart.total())}`, [{ text: 'OK' }])
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.message ?? 'Erro ao finalizar venda')
    } finally {
      setFinalizing(false)
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: c.surface, borderBottomColor: c.border }]}>
        <Text style={[styles.title, { color: c.text }]}>PDV</Text>
        <TouchableOpacity
          onPress={() => router.push('/scanner')}
          style={[styles.scanBtn, { backgroundColor: colors.primary + '15' }]}
        >
          <Ionicons name="barcode-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.searchWrap, { borderBottomColor: c.border, backgroundColor: c.surface }]}>
        <View style={[styles.searchBox, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
          <Ionicons name="search-outline" size={18} color={c.textSecondary} />
          <TextInput
            style={[styles.searchText, { color: c.text }]}
            placeholder="Buscar produto ou escanear código..."
            placeholderTextColor={c.placeholder}
            value={search}
            onChangeText={handleSearch}
          />
        </View>
      </View>

      {searchResults.length > 0 && (
        <View style={[styles.results, { backgroundColor: c.surface, borderColor: c.border }]}>
          {searchResults.map((p) => (
            <TouchableOpacity
              key={p.id}
              onPress={() => addToCart(p)}
              style={[styles.resultRow, { borderBottomColor: c.border }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.resultName, { color: c.text }]}>{p.nome}</Text>
                <Text style={[styles.resultSub, { color: c.textSecondary }]}>
                  {p.category?.nome} · {p.estoque} em estoque
                </Text>
              </View>
              <Text style={[styles.resultPrice, { color: colors.primary }]}>
                {formatCurrency(Number(p.preco))}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        data={cart.items}
        keyExtractor={(item) => item.product.id}
        style={{ flex: 1, backgroundColor: c.background }}
        contentContainerStyle={styles.cartContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyCart}>
            <Ionicons name="cart-outline" size={48} color={c.textTertiary} />
            <Text style={[styles.emptyText, { color: c.textSecondary }]}>
              Carrinho vazio{'\n'}Busque um produto para adicionar
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.cartRow, { backgroundColor: c.surface, borderColor: c.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cartName, { color: c.text }]} numberOfLines={1}>
                {item.product.nome}
              </Text>
              <Text style={[styles.cartPrice, { color: colors.primary }]}>
                {formatCurrency(item.precoUnitario)} × {item.quantidade}
              </Text>
            </View>
            <View style={styles.qtyControls}>
              <TouchableOpacity
                onPress={() => cart.updateQty(item.product.id, item.quantidade - 1)}
                style={[styles.qtyBtn, { borderColor: c.border }]}
              >
                <Ionicons name="remove" size={16} color={c.text} />
              </TouchableOpacity>
              <Text style={[styles.qty, { color: c.text }]}>{item.quantidade}</Text>
              <TouchableOpacity
                onPress={() => cart.updateQty(item.product.id, item.quantidade + 1)}
                style={[styles.qtyBtn, { borderColor: c.border }]}
              >
                <Ionicons name="add" size={16} color={c.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.cartSubtotal, { color: c.text }]}>
              {formatCurrency(item.precoUnitario * item.quantidade)}
            </Text>
          </View>
        )}
      />

      {cart.items.length > 0 && (
        <View style={[styles.footer, { backgroundColor: c.surface, borderTopColor: c.border }]}>
          <View style={styles.footerTotal}>
            <Text style={[styles.footerLabel, { color: c.textSecondary }]}>
              {cart.items.reduce((s, i) => s + i.quantidade, 0)} item(ns)
            </Text>
            <Text style={[styles.footerAmount, { color: c.text }]}>
              {formatCurrency(cart.total())}
            </Text>
          </View>
          <View style={styles.footerActions}>
            <Button
              variant="danger"
              size="md"
              onPress={() => {
                Alert.alert('Limpar carrinho?', '', [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Limpar', style: 'destructive', onPress: cart.clear },
                ])
              }}
            >
              <Ionicons name="trash-outline" size={18} color="#fff" />
            </Button>
            <Button
              size="md"
              onPress={() => setShowCheckout(true)}
              style={{ flex: 1 }}
            >
              Finalizar Venda
            </Button>
          </View>
        </View>
      )}

      <BottomSheet
        visible={showCheckout}
        onClose={() => setShowCheckout(false)}
        title="Finalizar Venda"
        snapTo="75%"
      >
        <View style={styles.checkoutContent}>
          <View style={[styles.totalBox, { backgroundColor: colors.primary + '10' }]}>
            <Text style={[styles.totalLabel, { color: c.textSecondary }]}>Total a pagar</Text>
            <Text style={[styles.totalAmount, { color: colors.primary }]}>
              {formatCurrency(cart.total())}
            </Text>
          </View>

          <Text style={[styles.payLabel, { color: c.text }]}>Forma de Pagamento</Text>
          <View style={styles.payGrid}>
            {PAYMENT_OPTIONS.map((fp) => (
              <TouchableOpacity
                key={fp}
                onPress={() => cart.setFormaPagamento(fp)}
                style={[
                  styles.payOption,
                  {
                    borderColor:
                      cart.formaPagamento === fp ? colors.primary : c.border,
                    backgroundColor:
                      cart.formaPagamento === fp ? colors.primary + '10' : c.surface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.payOptionText,
                    { color: cart.formaPagamento === fp ? colors.primary : c.text },
                  ]}
                >
                  {PAYMENT_LABELS[fp]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button
            onPress={finalize}
            loading={finalizing}
            fullWidth
            size="lg"
            style={{ marginTop: 8 }}
          >
            Confirmar Venda
          </Button>
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
  scanBtn: { padding: 10, borderRadius: 12 },
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
  results: {
    borderBottomWidth: 1,
    maxHeight: 220,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultName: { fontSize: 15, fontWeight: '500' },
  resultSub: { fontSize: 12, marginTop: 2 },
  resultPrice: { fontSize: 15, fontWeight: '700' },
  cartContent: { padding: 12, gap: 8, flexGrow: 1 },
  emptyCart: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    gap: 12,
  },
  emptyText: { fontSize: 14, textAlign: 'center', lineHeight: 22 },
  cartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  cartName: { fontSize: 14, fontWeight: '600' },
  cartPrice: { fontSize: 12, marginTop: 3 },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qty: { fontSize: 16, fontWeight: '600', minWidth: 20, textAlign: 'center' },
  cartSubtotal: { fontSize: 14, fontWeight: '700', minWidth: 70, textAlign: 'right' },
  footer: {
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  footerTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerLabel: { fontSize: 14 },
  footerAmount: { fontSize: 22, fontWeight: '700' },
  footerActions: { flexDirection: 'row', gap: 10 },
  checkoutContent: { gap: 16, paddingBottom: 16 },
  totalBox: { padding: 20, borderRadius: 14, alignItems: 'center' },
  totalLabel: { fontSize: 14 },
  totalAmount: { fontSize: 34, fontWeight: '700', marginTop: 4 },
  payLabel: { fontSize: 15, fontWeight: '600' },
  payGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  payOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    minWidth: '45%',
    alignItems: 'center',
  },
  payOptionText: { fontSize: 13, fontWeight: '600' },
})
