export interface PlanLimits {
  limiteUsuarios: number;
  limiteProdutos: number;
  limiteClientes: number;
  limiteVendasMes: number;
  limiteStorageMb: number;
  modulos: string[];
}

export interface CompanyContext {
  id: string;
  nome: string;
  ativo: boolean;
  subscriptionStatus?: string;
  plan?: PlanLimits;
}

export interface PlatformStats {
  totalEmpresas: number;
  empresasAtivas: number;
  empresasTrial: number;
  empresasSuspensas: number;
  novosUltimoMes: number;
  cancelamentosUltimoMes: number;
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  churnRate: number;
  totalUsuarios: number;
}

export interface CreateCompanyInput {
  nome: string;
  nomeFantasia?: string;
  razaoSocial?: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  planTier?: string;
  trialDays?: number;
}

export interface InviteInput {
  email: string;
  role?: string;
}
