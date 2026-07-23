import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Alert, Vibration } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { productsApi } from '@/api/products'
import { useCartStore } from '@/store/cart.store'
import { useTheme } from '@/hooks/useTheme'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/utils/format'
import { colors } from '@/theme/colors'
import type { Product } from '@/types'

export default function Scanner() {
  const { theme } = useTheme()
  const c = theme.colors
  const params = useLocalSearchParams<{ mode?: string }>()
  const mode = params.mode ?? 'pdv'
  const cart = useCartStore()

  const [permission, requestPermission] = useCameraPermissions()
  const [scanned, setScanned] = useState(false)
  const [torch, setTorch] = useState(false)
  const [foundProduct, setFoundProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission()
    }
  }, [])

  async function handleBarcode({ data }: { data: string }) {
    if (scanned || loading) return
    setScanned(true)
    Vibration.vibrate(100)
    setLoading(true)
    try {
      const product = await productsApi.findByBarcode(data)
      setFoundProduct(product)
    } catch {
      Alert.alert(
        'Produto não encontrado',
        `Código: ${data}`,
        [{ text: 'OK', onPress: () => setScanned(false) }]
      )
    } finally {
      setLoading(false)
    }
  }

  function addToCart() {
    if (!foundProduct) return
    cart.addItem(foundProduct)
    Alert.alert('Adicionado!', `${foundProduct.nome} adicionado ao carrinho`, [
      { text: 'Continuar', onPress: () => { setFoundProduct(null); setScanned(false) } },
      { text: 'Ir ao Carrinho', onPress: () => router.back() },
    ])
  }

  if (!permission) return null

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]}>
        <View style={styles.permissionWrap}>
          <Ionicons name="camera-outline" size={64} color={c.textTertiary} />
          <Text style={[styles.permTitle, { color: c.text }]}>Câmera necessária</Text>
          <Text style={[styles.permSub, { color: c.textSecondary }]}>
            Para escanear códigos de barras, permita o acesso à câmera.
          </Text>
          <Button onPress={requestPermission} style={{ marginTop: 16 }}>
            Permitir Câmera
          </Button>
          <Button variant="ghost" onPress={() => router.back()}>
            Voltar
          </Button>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <View style={styles.root}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={torch}
        onBarcodeScanned={scanned ? undefined : handleBarcode}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'code128', 'code39', 'qr', 'upc_a', 'upc_e'],
        }}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Scanner de Código</Text>
          <TouchableOpacity onPress={() => setTorch(!torch)} style={styles.iconBtn}>
            <Ionicons name={torch ? 'flash' : 'flash-outline'} size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.scanArea}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
          <Text style={styles.scanHint}>Aponte para o código de barras</Text>
        </View>

        {foundProduct && (
          <View style={styles.resultCard}>
            <View style={styles.resultInfo}>
              <Text style={styles.resultName} numberOfLines={1}>
                {foundProduct.nome}
              </Text>
              <Text style={styles.resultPrice}>
                {formatCurrency(Number(foundProduct.preco))}
              </Text>
              <Text style={styles.resultStock}>
                {foundProduct.estoque} em estoque
              </Text>
            </View>
            <View style={styles.resultActions}>
              {mode === 'pdv' && (
                <TouchableOpacity
                  onPress={addToCart}
                  style={[styles.addCartBtn, { backgroundColor: colors.primary }]}
                >
                  <Ionicons name="cart" size={20} color="#fff" />
                  <Text style={styles.addCartText}>Adicionar</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => { setFoundProduct(null); setScanned(false) }}
                style={styles.rescanBtn}
              >
                <Text style={styles.rescanText}>Escanear outro</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {loading && (
          <View style={styles.loadingCard}>
            <Text style={styles.loadingText}>Buscando produto...</Text>
          </View>
        )}
      </SafeAreaView>
    </View>
  )
}

const CORNER_SIZE = 24
const CORNER_BORDER = 3

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  safe: { flex: 1 },
  permissionWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 12,
  },
  permTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  permSub: { fontSize: 15, textAlign: 'center', lineHeight: 22 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  scanArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  frame: {
    width: 240,
    height: 160,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#fff',
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_BORDER,
    borderLeftWidth: CORNER_BORDER,
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_BORDER,
    borderRightWidth: CORNER_BORDER,
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_BORDER,
    borderLeftWidth: CORNER_BORDER,
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_BORDER,
    borderRightWidth: CORNER_BORDER,
    borderBottomRightRadius: 4,
  },
  scanHint: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    textAlign: 'center',
  },
  resultCard: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    gap: 16,
  },
  resultInfo: { gap: 4 },
  resultName: { fontSize: 18, fontWeight: '700', color: '#111827' },
  resultPrice: { fontSize: 22, fontWeight: '700', color: colors.primary },
  resultStock: { fontSize: 13, color: '#6b7280' },
  resultActions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  addCartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  addCartText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  rescanBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e5e7eb',
  },
  rescanText: { fontSize: 14, fontWeight: '600', color: '#374151' },
  loadingCard: {
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: 14,
    padding: 16,
    margin: 20,
    alignItems: 'center',
  },
  loadingText: { color: '#fff', fontSize: 15 },
})
