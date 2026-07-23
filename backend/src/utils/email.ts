import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from './logger';

const BRAND_COLOR = '#6366f1';
const BRAND_NAME = 'ERP Controle de Estoque';

function createTransporter() {
  if (env.EMAIL_HOST && env.EMAIL_USER && env.EMAIL_PASS) {
    return nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT ?? 587,
      secure: (env.EMAIL_PORT ?? 587) === 465,
      auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
    });
  }
  return null;
}

const from = env.EMAIL_FROM ?? `${BRAND_NAME} <noreply@erp.local>`;

// ── Template base ──────────────────────────────────────────────────────────────

function baseTemplate(titulo: string, conteudo: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo}</title></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f5f7;padding:32px 0">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
        <!-- Header -->
        <tr><td style="background:${BRAND_COLOR};border-radius:8px 8px 0 0;padding:24px 32px;text-align:center">
          <span style="color:#fff;font-size:18px;font-weight:700">${BRAND_NAME}</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="background:#fff;padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb">
          ${conteudo}
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:16px 32px;text-align:center">
          <p style="margin:0;font-size:12px;color:#9ca3af">
            Você recebeu este e-mail porque possui uma conta no <strong>${BRAND_NAME}</strong>.<br>
            Este é um e-mail automático — não responda.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  const transporter = createTransporter();

  if (!transporter) {
    logger.warn(`[Email] SMTP não configurado — subject: "${subject}" | to: ${to}`);
    logger.debug(`[Email] HTML omitido no log por segurança.`);
    return;
  }

  await transporter.sendMail({ from, to, subject, html });
  logger.info(`[Email] Enviado para ${to}: ${subject}`);
}

// ── Templates ──────────────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, nome: string, resetLink: string): Promise<void> {
  const conteudo = `
    <h2 style="color:#111827;margin:0 0 16px">Recuperação de Senha</h2>
    <p style="color:#4b5563;margin:0 0 8px">Olá, <strong>${nome}</strong>.</p>
    <p style="color:#4b5563;margin:0 0 24px">Recebemos uma solicitação para redefinir a senha da sua conta. O link expira em <strong>1 hora</strong>.</p>
    <p style="text-align:center;margin:0 0 24px">
      <a href="${resetLink}" style="display:inline-block;padding:12px 28px;background:${BRAND_COLOR};color:#fff;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px">
        Redefinir Senha
      </a>
    </p>
    <p style="font-size:12px;color:#9ca3af;margin:0">Se você não solicitou a redefinição, ignore este e-mail. Sua senha não será alterada.</p>
  `;
  await sendMail(to, 'Recuperação de senha — ' + BRAND_NAME, baseTemplate('Recuperação de Senha', conteudo));
}

export async function sendWelcomeEmail(to: string, nome: string, loginUrl: string): Promise<void> {
  const conteudo = `
    <h2 style="color:#111827;margin:0 0 16px">Bem-vindo ao ${BRAND_NAME}! 🎉</h2>
    <p style="color:#4b5563;margin:0 0 8px">Olá, <strong>${nome}</strong>!</p>
    <p style="color:#4b5563;margin:0 0 24px">Sua conta foi criada com sucesso. Acesse o sistema usando o botão abaixo.</p>
    <p style="text-align:center;margin:0 0 24px">
      <a href="${loginUrl}" style="display:inline-block;padding:12px 28px;background:${BRAND_COLOR};color:#fff;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px">
        Acessar o Sistema
      </a>
    </p>
    <div style="background:#f9fafb;border-radius:6px;padding:16px;margin:0 0 8px">
      <p style="margin:0;font-size:13px;color:#374151"><strong>Dica de segurança:</strong> Troque sua senha no primeiro acesso em <em>Configurações → Alterar Senha</em>.</p>
    </div>
  `;
  await sendMail(to, `Bem-vindo ao ${BRAND_NAME}`, baseTemplate('Bem-vindo', conteudo));
}

export async function sendSaleConfirmationEmail(to: string, dados: {
  nomeCliente: string;
  numeroVenda: number;
  itens: Array<{ nome: string; quantidade: number; precoUnit: number; subtotal: number }>;
  total: number;
  desconto: number;
  formaPagamento?: string;
}): Promise<void> {
  const itensHtml = dados.itens.map((i) => `
    <tr style="border-bottom:1px solid #f3f4f6">
      <td style="padding:8px 0;font-size:13px;color:#374151">${i.nome}</td>
      <td style="padding:8px 0;font-size:13px;color:#6b7280;text-align:center">${i.quantidade}</td>
      <td style="padding:8px 0;font-size:13px;color:#6b7280;text-align:right">R$ ${i.precoUnit.toFixed(2)}</td>
      <td style="padding:8px 0;font-size:13px;color:#111827;font-weight:600;text-align:right">R$ ${i.subtotal.toFixed(2)}</td>
    </tr>
  `).join('');

  const conteudo = `
    <h2 style="color:#111827;margin:0 0 4px">Confirmação de Venda #${dados.numeroVenda}</h2>
    <p style="color:#6b7280;font-size:13px;margin:0 0 24px">Obrigado pela sua compra, <strong>${dados.nomeCliente}</strong>!</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 16px">
      <thead>
        <tr style="border-bottom:2px solid #e5e7eb">
          <th style="padding:8px 0;font-size:12px;color:#6b7280;text-align:left;font-weight:600;text-transform:uppercase">Produto</th>
          <th style="padding:8px 0;font-size:12px;color:#6b7280;text-align:center;font-weight:600;text-transform:uppercase">Qtd</th>
          <th style="padding:8px 0;font-size:12px;color:#6b7280;text-align:right;font-weight:600;text-transform:uppercase">Preço</th>
          <th style="padding:8px 0;font-size:12px;color:#6b7280;text-align:right;font-weight:600;text-transform:uppercase">Total</th>
        </tr>
      </thead>
      <tbody>${itensHtml}</tbody>
    </table>
    ${dados.desconto > 0 ? `<p style="text-align:right;margin:0 0 4px;font-size:13px;color:#6b7280">Desconto: -R$ ${dados.desconto.toFixed(2)}</p>` : ''}
    <p style="text-align:right;margin:0 0 16px;font-size:16px;font-weight:700;color:${BRAND_COLOR}">Total: R$ ${dados.total.toFixed(2)}</p>
    ${dados.formaPagamento ? `<p style="font-size:13px;color:#6b7280;margin:0">Forma de pagamento: <strong>${dados.formaPagamento}</strong></p>` : ''}
  `;

  await sendMail(to, `Venda #${dados.numeroVenda} confirmada — ${BRAND_NAME}`, baseTemplate('Confirmação de Venda', conteudo));
}

export async function sendDailyReport(to: string, dados: {
  data: string;
  totalVendas: number;
  quantidadeVendas: number;
  ticketMedio: number;
  produtoMaisVendido?: string;
}): Promise<void> {
  const conteudo = `
    <h2 style="color:#111827;margin:0 0 4px">Relatório Diário</h2>
    <p style="color:#6b7280;font-size:13px;margin:0 0 24px">${dados.data}</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${metricaRow('💰 Faturamento', `R$ ${dados.totalVendas.toFixed(2)}`)}
      ${metricaRow('🛒 Vendas realizadas', String(dados.quantidadeVendas))}
      ${metricaRow('🎯 Ticket médio', `R$ ${dados.ticketMedio.toFixed(2)}`)}
      ${dados.produtoMaisVendido ? metricaRow('⭐ Produto mais vendido', dados.produtoMaisVendido) : ''}
    </table>
  `;
  await sendMail(to, `Relatório Diário — ${dados.data}`, baseTemplate('Relatório Diário', conteudo));
}

export async function sendWeeklyReport(to: string, dados: {
  semana: string;
  totalVendas: number;
  quantidadeVendas: number;
  crescimento?: string;
  diasComVendas: number;
}): Promise<void> {
  const conteudo = `
    <h2 style="color:#111827;margin:0 0 4px">Relatório Semanal</h2>
    <p style="color:#6b7280;font-size:13px;margin:0 0 24px">${dados.semana}</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${metricaRow('💰 Faturamento semanal', `R$ ${dados.totalVendas.toFixed(2)}`)}
      ${metricaRow('🛒 Total de vendas', String(dados.quantidadeVendas))}
      ${metricaRow('📅 Dias com vendas', String(dados.diasComVendas))}
      ${dados.crescimento ? metricaRow('📈 Vs semana anterior', dados.crescimento) : ''}
    </table>
  `;
  await sendMail(to, `Relatório Semanal — ${dados.semana}`, baseTemplate('Relatório Semanal', conteudo));
}

export async function sendMonthlyReport(to: string, dados: {
  mes: string;
  totalVendas: number;
  quantidadeVendas: number;
  lucroEstimado: number;
  ticketMedio: number;
  crescimento?: string;
  produtosAbaixoEstoque: number;
}): Promise<void> {
  const conteudo = `
    <h2 style="color:#111827;margin:0 0 4px">Relatório Mensal</h2>
    <p style="color:#6b7280;font-size:13px;margin:0 0 24px">${dados.mes}</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${metricaRow('💰 Faturamento', `R$ ${dados.totalVendas.toFixed(2)}`)}
      ${metricaRow('📈 Lucro estimado', `R$ ${dados.lucroEstimado.toFixed(2)}`)}
      ${metricaRow('🛒 Vendas realizadas', String(dados.quantidadeVendas))}
      ${metricaRow('🎯 Ticket médio', `R$ ${dados.ticketMedio.toFixed(2)}`)}
      ${dados.crescimento ? metricaRow('📊 Crescimento', dados.crescimento) : ''}
      ${metricaRow('⚠️ Produtos abaixo do mínimo', String(dados.produtosAbaixoEstoque))}
    </table>
  `;
  await sendMail(to, `Relatório Mensal — ${dados.mes}`, baseTemplate('Relatório Mensal', conteudo));
}

export async function sendInviteEmail(to: string, dados: {
  nomeEmpresa: string;
  role: string;
  inviteLink: string;
  expiresHours: number;
}): Promise<void> {
  const roleLabel: Record<string, string> = {
    ADMIN: 'Administrador',
    GERENTE: 'Gerente',
    FUNCIONARIO: 'Funcionário',
    CAIXA: 'Operador de Caixa',
  };

  const conteudo = `
    <h2 style="color:#111827;margin:0 0 16px">Você foi convidado!</h2>
    <p style="color:#4b5563;margin:0 0 8px">
      Você recebeu um convite para ingressar na empresa <strong>${dados.nomeEmpresa}</strong>
      como <strong>${roleLabel[dados.role] ?? dados.role}</strong>.
    </p>
    <p style="color:#4b5563;margin:0 0 24px">Clique no botão abaixo para criar sua conta. O convite expira em <strong>${dados.expiresHours} horas</strong>.</p>
    <p style="text-align:center;margin:0 0 24px">
      <a href="${dados.inviteLink}" style="display:inline-block;padding:12px 28px;background:${BRAND_COLOR};color:#fff;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px">
        Aceitar Convite
      </a>
    </p>
    <p style="font-size:12px;color:#9ca3af;margin:0">Se você não esperava este convite, pode ignorá-lo com segurança.</p>
  `;
  await sendMail(to, `Convite para ${dados.nomeEmpresa} — ${BRAND_NAME}`, baseTemplate('Convite', conteudo));
}

export async function sendSubscriptionSuspendedEmail(to: string, nomeEmpresa: string): Promise<void> {
  const conteudo = `
    <h2 style="color:#DC2626;margin:0 0 16px">Assinatura Suspensa</h2>
    <p style="color:#4b5563;margin:0 0 8px">Olá,</p>
    <p style="color:#4b5563;margin:0 0 24px">
      A assinatura da empresa <strong>${nomeEmpresa}</strong> foi suspensa por inadimplência.
      Para reativar o acesso, entre em contato com o suporte ou regularize o pagamento.
    </p>
    <p style="font-size:12px;color:#9ca3af;margin:0">Caso já tenha regularizado, aguarde até 24 horas para a reativação automática.</p>
  `;
  await sendMail(to, `Assinatura suspensa — ${nomeEmpresa}`, baseTemplate('Assinatura Suspensa', conteudo));
}

export async function sendTrialExpiringEmail(to: string, dados: {
  nomeEmpresa: string;
  diasRestantes: number;
  upgradeLink: string;
}): Promise<void> {
  const conteudo = `
    <h2 style="color:#B45309;margin:0 0 16px">Seu período de teste está acabando</h2>
    <p style="color:#4b5563;margin:0 0 8px">
      O período de avaliação da empresa <strong>${dados.nomeEmpresa}</strong>
      termina em <strong>${dados.diasRestantes} dia(s)</strong>.
    </p>
    <p style="color:#4b5563;margin:0 0 24px">Para continuar usando todas as funcionalidades, escolha um plano:</p>
    <p style="text-align:center;margin:0 0 24px">
      <a href="${dados.upgradeLink}" style="display:inline-block;padding:12px 28px;background:${BRAND_COLOR};color:#fff;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px">
        Ver Planos
      </a>
    </p>
  `;
  await sendMail(to, `Período de teste expirando — ${dados.nomeEmpresa}`, baseTemplate('Trial Expirando', conteudo));
}

function metricaRow(label: string, valor: string): string {
  return `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:14px;color:#4b5563">${label}</td>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;font-size:14px;font-weight:700;color:#111827;text-align:right">${valor}</td>
    </tr>
  `;
}
