import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL deve ser uma URL válida'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter no mínimo 32 caracteres'),
  JWT_EXPIRES_IN: z.coerce.number().positive().default(28800),
  JWT_REFRESH_EXPIRES_IN: z.coerce.number().positive().default(604800),
  PORT: z.coerce.number().default(3333),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  // ── E-mail ──────────────────────────────────────────────────
  EMAIL_HOST:  z.string().optional(),
  EMAIL_PORT:  z.coerce.number().optional(),
  EMAIL_USER:  z.string().optional(),
  EMAIL_PASS:  z.string().optional(),
  EMAIL_FROM:  z.string().optional(),

  // ── PIX / Pagamentos ────────────────────────────────────────
  // Provider ativo: mock | mercadopago | pagseguro | asaas | gerencianet | stripe
  PIX_PROVIDER: z.string().default('mock'),

  // Mercado Pago
  MERCADOPAGO_ACCESS_TOKEN:  z.string().optional(),

  // PagSeguro
  PAGSEGURO_TOKEN:           z.string().optional(),
  PAGSEGURO_EMAIL:           z.string().optional(),

  // Asaas
  ASAAS_API_KEY:             z.string().optional(),
  ASAAS_ENV:                 z.enum(['sandbox', 'production']).default('sandbox'),

  // Gerencianet / Efí
  GERENCIANET_CLIENT_ID:     z.string().optional(),
  GERENCIANET_CLIENT_SECRET: z.string().optional(),
  GERENCIANET_PIX_KEY:       z.string().optional(),
  GERENCIANET_ENV:           z.enum(['sandbox', 'production']).default('sandbox'),

  // Stripe (pagamentos internacionais)
  STRIPE_SECRET_KEY:         z.string().optional(),
  STRIPE_WEBHOOK_SECRET:     z.string().optional(),

  // ── WhatsApp ────────────────────────────────────────────────
  // Provider ativo: mock | meta | evolution | zapi
  WHATSAPP_PROVIDER: z.string().default('mock'),

  // Meta Cloud API
  WHATSAPP_META_TOKEN:       z.string().optional(),
  WHATSAPP_META_PHONE_ID:    z.string().optional(),

  // Evolution API (auto-hospedado)
  EVOLUTION_API_URL:         z.string().optional(),
  EVOLUTION_API_KEY:         z.string().optional(),
  EVOLUTION_INSTANCE:        z.string().optional(),

  // Z-API
  ZAPI_INSTANCE_ID:          z.string().optional(),
  ZAPI_TOKEN:                z.string().optional(),

  // ── Storage / Upload ────────────────────────────────────────
  // Provider ativo: local | s3 | cloudinary
  STORAGE_PROVIDER: z.string().default('local'),

  // Amazon S3
  AWS_ACCESS_KEY_ID:         z.string().optional(),
  AWS_SECRET_ACCESS_KEY:     z.string().optional(),
  AWS_S3_BUCKET:             z.string().optional(),
  AWS_S3_REGION:             z.string().default('us-east-1'),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME:     z.string().optional(),
  CLOUDINARY_API_KEY:        z.string().optional(),
  CLOUDINARY_API_SECRET:     z.string().optional(),

  // ── Fiscal ──────────────────────────────────────────────────
  // Provider ativo: mock | sefaz | sat
  FISCAL_PROVIDER:           z.string().default('mock'),

  // ── Impressão ───────────────────────────────────────────────
  // Provider: local | network
  PRINT_PROVIDER:            z.string().default('local'),
  PRINTER_HOST:              z.string().optional(),
  PRINTER_PORT:              z.coerce.number().default(9100),

  // ── IA — Provedores ──────────────────────────────────────────
  // Provider ativo: anthropic | openai | local
  AI_PROVIDER:       z.enum(['anthropic', 'openai', 'local']).default('local'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL:   z.string().default('claude-haiku-4-5-20251001'),
  OPENAI_API_KEY:    z.string().optional(),
  OPENAI_MODEL:      z.string().default('gpt-4o-mini'),
  AI_MAX_TOKENS:     z.coerce.number().default(2048),
  AI_TEMPERATURE:    z.coerce.number().default(0.7),

  // ── SaaS / Multi-tenant ─────────────────────────────────────
  SAAS_TRIAL_DAYS:           z.coerce.number().default(14),
  PLATFORM_NAME:             z.string().default('ERP SaaS'),
  PLATFORM_EMAIL:            z.string().optional(),
  INVITE_TOKEN_EXPIRES_HOURS: z.coerce.number().default(48),
  // E-mail do administrador master inicial (criado no seed)
  MASTER_EMAIL:              z.string().default('master@controleestoque.com'),
  MASTER_SENHA:              z.string().min(8, 'MASTER_SENHA deve ter no mínimo 8 caracteres'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('\n❌ Variáveis de ambiente inválidas ou ausentes:');
  console.error(parsed.error.flatten().fieldErrors);
  console.error('\nCopie o arquivo .env.example para .env e preencha os valores.\n');
  process.exit(1);
}

export const env = parsed.data;
