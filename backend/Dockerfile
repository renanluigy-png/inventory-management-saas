# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

# Instala dependências do sistema necessárias para builds nativos
RUN apk add --no-cache python3 make g++

# Copia manifests e schema Prisma antes do código (cache layer)
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

# Instala todas as dependências (dev incluídas para build)
RUN npm ci

# Gera o Prisma Client tipado para o schema atual
RUN npx prisma generate

# Copia o restante do código e compila TypeScript
COPY . .
RUN npm run build

# ── Stage 2: Production Runtime ────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Instala apenas dependências de produção em camada separada
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci --omit=dev && npx prisma generate

# Copia o build compilado do estágio anterior
COPY --from=builder /app/dist ./dist

# Copia entrypoint de inicialização
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Garante que diretórios de runtime existam com permissões corretas
RUN mkdir -p uploads logs backups && \
    chown -R node:node /app

USER node

EXPOSE 3333

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:3333/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
