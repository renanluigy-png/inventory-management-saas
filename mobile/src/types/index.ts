export type Role = 'ADMIN' | 'GERENTE' | 'FUNCIONARIO' | 'CAIXA'

export type FormaPagamento =
  | 'DINHEIRO'
  | 'CARTAO_CREDITO'
  | 'CARTAO_DEBITO'
  | 'PIX'
  | 'FIADO'

export type SaleStatus = 'ABERTA' | 'FINALIZADA' | 'CANCELADA'

export type MovementType = 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'DEVOLUCAO'

export interface AuthUser {
  id: string
  nome: string
  email: string
  role: Role
}

export interface LoginResponse {
  accessToken: string
  user: AuthUser
}

export interface Category {
  id: string
  nome: string
  descricao?: string
  _count?: { products: number }
}

export interface Product {
  id: string
  nome: string
  descricao?: string
  preco: string | number
  precoCusto?: string | number
  codigoBarras?: string
  estoque: number
  estoqueMinimo?: number
  unidade?: string
  imagemUrl?: string
  ativo: boolean
  categoryId: string
  category: Category
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: string
  nome: string
  email?: string
  cpf?: string
  telefone?: string
  endereco?: string
  createdAt: string
  _count?: { sales: number }
}

export interface SaleItem {
  id: string
  productId: string
  product: Product
  quantidade: number
  precoUnitario: string | number
  subtotal: string | number
}

export interface Sale {
  id: string
  customer?: Customer
  customerId?: string
  status: SaleStatus
  formaPagamento?: FormaPagamento
  total: string | number
  desconto?: string | number
  items: SaleItem[]
  createdAt: string
  updatedAt: string
}

export interface StockMovement {
  id: string
  productId: string
  product: Product
  userId: string
  user: AuthUser
  tipo: MovementType
  quantidade: number
  motivo?: string
  createdAt: string
}

export interface Caixa {
  id: string
  userId: string
  user: AuthUser
  status: 'ABERTO' | 'FECHADO'
  saldoInicial: string | number
  saldoFinal?: string | number
  abertura: string
  fechamento?: string
}

export interface DashboardMetrics {
  faturamentoMes: string | number
  lucroMes: string | number
  quantidadeProdutos: number
  quantidadeClientes: number
  produtosEstoqueBaixo: number
  produtosSemEstoque: number
  ticketMedio: string | number
}

export interface TopProduct {
  productId: string
  product?: Product
  nome?: string
  quantidadeVendida: number
  totalVendas: string | number
}

export interface SalesChartPoint {
  data: string
  total: string | number
  quantidade: number
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface CartItem {
  product: Product
  quantidade: number
  precoUnitario: number
}

export interface Notification {
  id: string
  title: string
  body: string
  type: 'LOW_STOCK' | 'OPEN_CAIXA' | 'PROMO_EXPIRY' | 'HIGH_SALE' | 'GENERIC'
  read: boolean
  createdAt: string
}
