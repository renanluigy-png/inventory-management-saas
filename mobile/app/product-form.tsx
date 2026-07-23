import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { productsApi } from '@/api/products'
import { categoriesApi } from '@/api/categories'
import { useTheme } from '@/hooks/useTheme'
import { Header } from '@/components/shared/Header'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Loading } from '@/components/ui/Loading'
import { colors } from '@/theme/colors'

const schema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  descricao: z.string().optional(),
  preco: z.coerce.number().min(0.01, 'Preço obrigatório'),
  precoCusto: z.coerce.number().optional(),
  codigoBarras: z.string().optional(),
  estoque: z.coerce.number().min(0).default(0),
  estoqueMinimo: z.coerce.number().min(0).default(0),
  unidade: z.string().optional(),
  categoryId: z.string().min(1, 'Categoria obrigatória'),
})
type FormData = z.infer<typeof schema>

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3333'

export default function ProductForm() {
  const { theme } = useTheme()
  const c = theme.colors
  const params = useLocalSearchParams<{ id?: string }>()
  const isEditing = Boolean(params.id)
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [localImage, setLocalImage] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.findAll,
  })

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', params.id],
    queryFn: () => productsApi.findById(params.id!),
    enabled: isEditing,
  })

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (product) {
      reset({
        nome: product.nome,
        descricao: product.descricao ?? '',
        preco: Number(product.preco),
        precoCusto: product.precoCusto ? Number(product.precoCusto) : undefined,
        codigoBarras: product.codigoBarras ?? '',
        estoque: product.estoque,
        estoqueMinimo: product.estoqueMinimo ?? 0,
        unidade: product.unidade ?? '',
        categoryId: product.categoryId,
      })
    }
  }, [product])

  const selectedCategory = watch('categoryId')

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      setLocalImage(result.assets[0].uri)
    }
  }

  async function takePhoto() {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      setLocalImage(result.assets[0].uri)
    }
  }

  function showImageOptions() {
    Alert.alert('Imagem do Produto', 'Escolha a origem', [
      { text: 'Câmera', onPress: takePhoto },
      { text: 'Galeria', onPress: pickImage },
      { text: 'Cancelar', style: 'cancel' },
    ])
  }

  async function onSubmit(data: FormData) {
    setSaving(true)
    try {
      let savedId = params.id
      if (isEditing && params.id) {
        await productsApi.update(params.id, data)
        savedId = params.id
      } else {
        const created = await productsApi.create(data)
        savedId = created.id
      }

      if (localImage && savedId) {
        setUploadingImage(true)
        try {
          await productsApi.uploadImage(savedId, localImage)
        } catch {
          Alert.alert('Aviso', 'Produto salvo, mas falha ao enviar imagem.')
        } finally {
          setUploadingImage(false)
        }
      }

      qc.invalidateQueries({ queryKey: ['products'] })
      router.back()
    } catch (err: any) {
      Alert.alert('Erro', err?.response?.data?.message ?? 'Erro ao salvar produto')
    } finally {
      setSaving(false)
    }
  }

  if (isEditing && isLoading) return <Loading fullScreen message="Carregando produto..." />

  const imageUri =
    localImage ??
    (product?.imagemUrl ? `${BASE_URL}${product.imagemUrl}` : null)

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.background }]} edges={['top']}>
      <Header title={isEditing ? 'Editar Produto' : 'Novo Produto'} showBack />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <TouchableOpacity onPress={showImageOptions} style={styles.imagePicker}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.productImage} />
            ) : (
              <View style={[styles.imagePlaceholder, { backgroundColor: c.surfaceSecondary, borderColor: c.border }]}>
                <Ionicons name="camera-outline" size={32} color={c.textTertiary} />
                <Text style={[styles.imageHint, { color: c.textSecondary }]}>
                  Adicionar Foto
                </Text>
              </View>
            )}
            <View style={[styles.imageEditBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="pencil" size={14} color="#fff" />
            </View>
          </TouchableOpacity>

          <Controller
            control={control}
            name="nome"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Nome *"
                placeholder="Nome do produto"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.nome?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="descricao"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Descrição"
                placeholder="Descrição opcional"
                multiline
                numberOfLines={3}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={{ height: 80, textAlignVertical: 'top' }}
              />
            )}
          />

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="preco"
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input
                    label="Preço de Venda *"
                    keyboardType="decimal-pad"
                    value={value ? String(value) : ''}
                    onChangeText={(t) => onChange(Number(t))}
                    onBlur={onBlur}
                    error={errors.preco?.message}
                  />
                )}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="precoCusto"
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input
                    label="Preço de Custo"
                    keyboardType="decimal-pad"
                    value={value ? String(value) : ''}
                    onChangeText={(t) => onChange(Number(t))}
                    onBlur={onBlur}
                  />
                )}
              />
            </View>
          </View>

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="estoque"
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input
                    label="Estoque Atual"
                    keyboardType="number-pad"
                    value={value !== undefined ? String(value) : '0'}
                    onChangeText={(t) => onChange(Number(t))}
                    onBlur={onBlur}
                  />
                )}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="estoqueMinimo"
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input
                    label="Estoque Mínimo"
                    keyboardType="number-pad"
                    value={value !== undefined ? String(value) : '0'}
                    onChangeText={(t) => onChange(Number(t))}
                    onBlur={onBlur}
                  />
                )}
              />
            </View>
          </View>

          <Controller
            control={control}
            name="codigoBarras"
            render={({ field: { onChange, value, onBlur } }) => (
              <Input
                label="Código de Barras"
                placeholder="EAN-13 ou similar"
                keyboardType="number-pad"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                rightElement={
                  <TouchableOpacity onPress={() => router.push({ pathname: '/scanner', params: { mode: 'barcode' } })}>
                    <Ionicons name="barcode-outline" size={20} color={colors.primary} />
                  </TouchableOpacity>
                }
              />
            )}
          />

          <View>
            <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>Categoria *</Text>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  onPress={() => setValue('categoryId', cat.id)}
                  style={[
                    styles.catOption,
                    {
                      borderColor: selectedCategory === cat.id ? colors.primary : c.border,
                      backgroundColor: selectedCategory === cat.id ? colors.primary + '10' : c.surface,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: selectedCategory === cat.id ? colors.primary : c.text,
                    }}
                  >
                    {cat.nome}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.categoryId && (
              <Text style={styles.errorText}>{errors.categoryId.message}</Text>
            )}
          </View>

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Controller
                control={control}
                name="unidade"
                render={({ field: { onChange, value, onBlur } }) => (
                  <Input
                    label="Unidade"
                    placeholder="un, kg, L..."
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                  />
                )}
              />
            </View>
          </View>

          <Button
            onPress={handleSubmit(onSubmit)}
            loading={saving || uploadingImage}
            fullWidth
            size="lg"
          >
            {isEditing ? 'Salvar Alterações' : 'Criar Produto'}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  imagePicker: { alignSelf: 'center', position: 'relative', marginBottom: 8 },
  productImage: { width: 100, height: 100, borderRadius: 16 },
  imagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  imageHint: { fontSize: 11, fontWeight: '500' },
  imageEditBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  row2: { flexDirection: 'row', gap: 10 },
  fieldLabel: { fontSize: 13, fontWeight: '500', marginBottom: 8 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catOption: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 4 },
})
