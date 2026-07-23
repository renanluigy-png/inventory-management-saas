import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Upload } from 'lucide-react'
import { create, update, uploadImage } from '../../api/products'
import { findAllSimple } from '../../api/categories'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import type { Product } from '../../types'

const schema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  codigoBarras: z.string().optional(),
  descricao: z.string().optional(),
  precoCusto: z.string().optional(),
  preco: z.string().min(1, 'Informe o preço de venda'),
  estoque: z.string().default('0'),
  estoqueMinimo: z.string().default('0'),
  categoryId: z.string().optional(),
  ativo: z.boolean().default(true),
})
type FormData = z.infer<typeof schema>

interface Props {
  product: Product | null
  onClose: () => void
  onSuccess: () => void
}

export default function ProductModal({ product, onClose, onSuccess }: Props) {
  const isEditing = !!product
  const [saving, setSaving] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(product?.imagemUrl ?? null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: categories = [] } = useQuery({
    queryKey: ['categories-simple'],
    queryFn: findAllSimple,
  })

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: product?.nome ?? '',
      codigoBarras: product?.codigoBarras ?? '',
      descricao: product?.descricao ?? '',
      precoCusto: product?.precoCusto != null ? String(Number(product.precoCusto)) : '',
      preco: product ? String(Number(product.preco)) : '',
      estoque: product ? String(product.estoque) : '0',
      estoqueMinimo: product ? String(product.estoqueMinimo) : '0',
      categoryId: product?.categoryId ?? '',
      ativo: product?.ativo ?? true,
    },
  })

  async function onSubmit(data: FormData) {
    setSaving(true)
    try {
      const payload = {
        nome: data.nome,
        codigoBarras: data.codigoBarras || undefined,
        descricao: data.descricao || undefined,
        precoCusto: data.precoCusto ? Number(data.precoCusto) : undefined,
        preco: Number(data.preco),
        estoque: Number(data.estoque),
        estoqueMinimo: Number(data.estoqueMinimo),
        categoryId: data.categoryId || undefined,
        ativo: data.ativo,
      }

      let id = product?.id
      if (isEditing && id) {
        await update(id, payload)
      } else {
        const created = await create(payload)
        id = created.id
      }

      if (imageFile && id) {
        await uploadImage(id, imageFile)
      }

      toast.success(isEditing ? 'Produto atualizado' : 'Produto criado')
      onSuccess()
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Erro ao salvar produto')
    } finally {
      setSaving(false)
    }
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const categoryOptions = [
    { value: '', label: 'Sem categoria' },
    ...categories.map((c) => ({ value: c.id, label: c.nome })),
  ]

  return (
    <Modal title={isEditing ? 'Editar Produto' : 'Novo Produto'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-start gap-4">
          <div
            className="flex-shrink-0 h-24 w-24 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer overflow-hidden flex items-center justify-center bg-gray-50 dark:bg-gray-800 hover:border-indigo-400 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {imagePreview ? (
              <img src={imagePreview} alt="preview" className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center text-gray-400">
                <Upload className="h-6 w-6" />
                <span className="text-xs mt-1">Imagem</span>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          <div className="flex-1 space-y-3">
            <Input label="Nome *" error={errors.nome?.message} {...register('nome')} />
            <Input label="Código de Barras" {...register('codigoBarras')} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Preço de Custo" type="number" step="0.01" error={errors.precoCusto?.message} {...register('precoCusto')} />
          <Input label="Preço de Venda *" type="number" step="0.01" error={errors.preco?.message} {...register('preco')} />
          <Input label="Estoque Atual" type="number" {...register('estoque')} />
          <Input label="Estoque Mínimo" type="number" {...register('estoqueMinimo')} />
        </div>

        <Select label="Categoria" options={categoryOptions} {...register('categoryId')} />
        <Input label="Descrição" {...register('descricao')} />

        <div className="flex items-center gap-2">
          <input id="ativo" type="checkbox" className="h-4 w-4 rounded border-gray-300 text-indigo-600" {...register('ativo')} />
          <label htmlFor="ativo" className="text-sm text-gray-700 dark:text-gray-300">Produto ativo</label>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button type="submit" loading={saving}>{isEditing ? 'Salvar' : 'Criar'}</Button>
        </div>
      </form>
    </Modal>
  )
}
