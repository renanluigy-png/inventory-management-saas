/**
 * Configuração central de ambiente do frontend — única fonte de verdade
 * para as URLs de API/WebSocket. Evita fallbacks duplicados e inconsistentes
 * espalhados pelo código (ex.: um arquivo caindo para localhost:3333, outro
 * para localhost:3000).
 *
 * Em desenvolvimento, VITE_API_URL fica vazio de propósito: as chamadas usam
 * caminhos relativos, resolvidos pelo proxy do Vite (vite.config.ts) até
 * http://localhost:3333. Em produção, VITE_API_URL é obrigatório e deve vir
 * de frontend/.env.production — sem fallback para localhost, que nunca
 * existe para quem acessa o site publicado.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? ''

export const WS_BASE_URL = import.meta.env.VITE_WS_URL || API_BASE_URL

if (import.meta.env.PROD && !API_BASE_URL) {
  console.error(
    '[config] VITE_API_URL não foi definida no build de produção — as chamadas à API vão falhar.'
  )
}
