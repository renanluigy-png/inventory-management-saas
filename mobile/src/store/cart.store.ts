import { create } from 'zustand'
import type { CartItem, Product, FormaPagamento } from '../types'

interface CartState {
  items: CartItem[]
  customerId: string | undefined
  formaPagamento: FormaPagamento
  desconto: number
  addItem: (product: Product, quantidade?: number) => void
  removeItem: (productId: string) => void
  updateQty: (productId: string, quantidade: number) => void
  setCustomer: (customerId: string | undefined) => void
  setFormaPagamento: (fp: FormaPagamento) => void
  setDesconto: (value: number) => void
  clear: () => void
  total: () => number
  subtotal: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  customerId: undefined,
  formaPagamento: 'DINHEIRO',
  desconto: 0,

  addItem: (product, quantidade = 1) => {
    const existing = get().items.find((i) => i.product.id === product.id)
    if (existing) {
      set({
        items: get().items.map((i) =>
          i.product.id === product.id
            ? { ...i, quantidade: i.quantidade + quantidade }
            : i
        ),
      })
    } else {
      set({
        items: [
          ...get().items,
          { product, quantidade, precoUnitario: Number(product.preco) },
        ],
      })
    }
  },

  removeItem: (productId) => {
    set({ items: get().items.filter((i) => i.product.id !== productId) })
  },

  updateQty: (productId, quantidade) => {
    if (quantidade <= 0) {
      get().removeItem(productId)
      return
    }
    set({
      items: get().items.map((i) =>
        i.product.id === productId ? { ...i, quantidade } : i
      ),
    })
  },

  setCustomer: (customerId) => set({ customerId }),
  setFormaPagamento: (formaPagamento) => set({ formaPagamento }),
  setDesconto: (desconto) => set({ desconto }),

  clear: () =>
    set({
      items: [],
      customerId: undefined,
      formaPagamento: 'DINHEIRO',
      desconto: 0,
    }),

  subtotal: () =>
    get().items.reduce((sum, i) => sum + i.precoUnitario * i.quantidade, 0),

  total: () => {
    const sub = get().subtotal()
    return Math.max(0, sub - get().desconto)
  },
}))
