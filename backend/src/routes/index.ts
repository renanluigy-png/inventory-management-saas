import { Router } from 'express';
import authRoutes from './auth.routes';
import categoryRoutes from './category.routes';
import productRoutes from './product.routes';
import customerRoutes from './customer.routes';
import stockRoutes from './stock.routes';
import saleRoutes from './sale.routes';
import dashboardRoutes from './dashboard.routes';
import reportRoutes from './report.routes';
import auditRoutes from './audit.routes';
import settingsRoutes from './settings.routes';
import systemRoutes from './system.routes';
import userRoutes from './user.routes';
import caixaRoutes from './caixa.routes';
import promotionRoutes from './promotion.routes';
import notificationRoutes from './notification.routes';
import searchRoutes from './search.routes';
// Etapa 13 — Integrações Profissionais
import pixRoutes from './pix.routes';
import fiscalRoutes from './fiscal.routes';
import whatsappRoutes from './whatsapp.routes';
import barcodeRoutes from './barcode.routes';
import storageRoutes from './storage.routes';
// Etapa 14 — SaaS Multi-tenant
import companyRoutes from './company.routes';
import planRoutes from './plan.routes';
import subscriptionRoutes from './subscription.routes';
import inviteRoutes from './invite.routes';
import masterRoutes from './master.routes';
// Etapa 16 — IA Integrada
import aiRoutes from './ai.routes';
// Etapa 15 — Enterprise Premium
import metaRoutes from './meta.routes';
import agendaRoutes from './agenda.routes';
import favoritoRoutes from './favorito.routes';
import historicoRoutes from './historico.routes';
import exportRoutes from './export.routes';
import monitorRoutes from './monitor.routes';
import techlogRoutes from './techlog.routes';
import dashboardLayoutRoutes from './dashboard-layout.routes';

const router = Router();

// ── Autenticação (pública) ──────────────────────────────────
router.use('/auth', authRoutes);

// ── Busca Global (protegida) ────────────────────────────────
router.use('/search', searchRoutes);

// ── Usuários (protegido) ────────────────────────────────────
router.use('/users', userRoutes);

// ── Catálogo (protegido) ────────────────────────────────────
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);

// ── Promoções (protegido) ───────────────────────────────────
router.use('/promotions', promotionRoutes);

// ── Clientes (protegido) ────────────────────────────────────
router.use('/customers', customerRoutes);

// ── Estoque (protegido) ─────────────────────────────────────
router.use('/stock', stockRoutes);

// ── PDV / Vendas (protegido) ────────────────────────────────
router.use('/sales', saleRoutes);

// ── Caixa (protegido) ───────────────────────────────────────
router.use('/caixa', caixaRoutes);

// ── Analytics e Dashboard (protegido) ──────────────────────
router.use('/dashboard', dashboardRoutes);

// ── Relatórios e Exportação (protegido) ────────────────────
router.use('/reports', reportRoutes);

// ── Auditoria (protegido — ADMIN) ───────────────────────────
router.use('/audit', auditRoutes);

// ── Notificações (protegido) ────────────────────────────────
router.use('/notifications', notificationRoutes);

// ── Configurações do Sistema (protegido) ────────────────────
router.use('/settings', settingsRoutes);

// ── Sistema: métricas, backup, restore (ADMIN) ───────────────
router.use('/system', systemRoutes);

// ── PIX / Pagamentos (Etapa 13) ─────────────────────────────
router.use('/pix', pixRoutes);

// ── Fiscal / Documentos (Etapa 13) ──────────────────────────
router.use('/fiscal', fiscalRoutes);

// ── WhatsApp (Etapa 13) ─────────────────────────────────────
router.use('/whatsapp', whatsappRoutes);

// ── Código de Barras (Etapa 13) ─────────────────────────────
router.use('/barcode', barcodeRoutes);

// ── Storage / Upload (Etapa 13) ─────────────────────────────
router.use('/storage', storageRoutes);

// ── SaaS — Empresas e Configuração (Etapa 14) ───────────────
router.use('/companies', companyRoutes);

// ── SaaS — Planos (Etapa 14, parcialmente público) ──────────
router.use('/plans', planRoutes);

// ── SaaS — Assinaturas (Etapa 14) ───────────────────────────
router.use('/subscriptions', subscriptionRoutes);

// ── SaaS — Convites (Etapa 14) ──────────────────────────────
router.use('/invites', inviteRoutes);

// ── SaaS — Painel Master (Etapa 14) ─────────────────────────
router.use('/master', masterRoutes);

// ── Etapa 16 — IA Integrada ──────────────────────────────────
router.use('/ai', aiRoutes);

// ── Etapa 15 — Enterprise Premium ────────────────────────────
router.use('/metas', metaRoutes);
router.use('/agenda', agendaRoutes);
router.use('/favoritos', favoritoRoutes);
router.use('/historico', historicoRoutes);
router.use('/export', exportRoutes);
router.use('/monitor', monitorRoutes);
router.use('/techlogs', techlogRoutes);
router.use('/dashboard-layout', dashboardLayoutRoutes);

export default router;
