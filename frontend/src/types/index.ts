export type Role = 'MASTER' | 'ADMIN' | 'GERENTE' | 'FUNCIONARIO' | 'CAIXA'

export interface AuthUser {
  id: string
  nome: string
  email: string
  role: Role
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: AuthUser
}

export interface User {
  id: string
  nome: string
  email: string
  role: Role
  ativo: boolean
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  nome: string
  descricao?: string | null
  ativo: boolean
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  sku?: string | null
  nome: string
  descricao?: string | null
  preco: string | number
  precoCusto?: string | number | null
  estoque: number
  estoqueMinimo: number
  codigoBarras?: string | null
  unidade: string
  imagemUrl?: string | null
  ativo: boolean
  categoryId?: string | null
  category?: Pick<Category, 'id' | 'nome'> | null
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: string
  nome: string
  cpf?: string | null
  email?: string | null
  telefone?: string | null
  endereco?: string | null
  ativo: boolean
  createdAt: string
  updatedAt: string
}

export type StatusVenda = 'ABERTA' | 'FINALIZADA' | 'CANCELADA'
export type FormaPagamento = 'DINHEIRO' | 'CARTAO_CREDITO' | 'CARTAO_DEBITO' | 'PIX' | 'FIADO'

export interface SaleItem {
  id: string
  saleId: string
  productId: string
  quantidade: number
  precoUnit: string | number
  desconto: string | number
  subtotal: string | number
  product: {
    id: string
    nome: string
    sku?: string | null
    unidade: string
    imagemUrl?: string | null
  }
}

export interface Sale {
  id: string
  numero: number
  customerId?: string | null
  userId: string
  total: string | number
  desconto: string | number
  status: StatusVenda
  formaPagamento?: FormaPagamento | null
  observacao?: string | null
  createdAt: string
  updatedAt: string
  customer?: Pick<Customer, 'id' | 'nome' | 'cpf'> | null
  user: Pick<User, 'id' | 'nome'>
  itens: SaleItem[]
}

export type TipoMovimentacao =
  | 'ENTRADA' | 'SAIDA' | 'AJUSTE' | 'VENDA'
  | 'DEVOLUCAO' | 'BAIXA_PERDA' | 'BAIXA_AVARIA' | 'TRANSFERENCIA'

export interface StockMovement {
  id: string
  productId: string
  userId: string
  tipo: TipoMovimentacao
  quantidade: number
  quantAnterior: number
  quantNova: number
  motivo?: string | null
  createdAt: string
  product: Pick<Product, 'id' | 'nome' | 'sku'>
  user: Pick<User, 'id' | 'nome'>
}

export interface DashboardMetrics {
  faturamentoHoje: number
  faturamentoMes: number
  lucroHoje: number
  lucroMes: number
  quantidadeVendasHoje: number
  quantidadeVendasMes: number
  quantidadeProdutos: number
  quantidadeClientes: number
  produtosSemEstoque: number
  produtosEstoqueBaixo: number
  ticketMedio: number
  caixaAtual?: {
    id: string
    responsavel: { id: string; nome: string }
    abertura: string
    saldoAtual: number
  } | null
}

export interface TopProduct {
  produto: { id: string; sku: string | null; nome: string; imagemUrl: string | null }
  quantidadeVendida: number
  faturamento: number
  lucro: number
}

export interface SalesChartPoint {
  data: string
  total: number
  quantidade: number
}

export interface SystemSettings {
  id: string
  nomeEmpresa: string
  cnpj?: string | null
  telefone?: string | null
  email?: string | null
  endereco?: string | null
  logoUrl?: string | null
  tema: 'light' | 'dark'
  moeda: string
  impostoPercent: string | number
  estoqueMinimoPadrao: number
  permitirVendaSemEstoque: boolean
  createdAt: string
  updatedAt: string
}

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'PERMISSION_CHANGE'

export interface AuditLog {
  id: string
  usuarioId?: string | null
  entidade: string
  entidadeId?: string | null
  acao: AuditAction
  dadosAntes?: unknown
  dadosDepois?: unknown
  ip?: string | null
  userAgent?: string | null
  dataHora: string
  usuario?: Pick<User, 'id' | 'nome' | 'email' | 'role'> | null
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface ApiResponse<T> {
  status: string
  data: T
  message?: string
}

export interface PaginatedData<T> {
  data: T[]
  meta: PaginationMeta
}

export type PaginatedApiResponse<T> = ApiResponse<PaginatedData<T>>
