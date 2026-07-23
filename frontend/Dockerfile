# ── Stage 1: Builder ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Aceita a URL do backend como build arg (pode ser sobrescrito no docker-compose)
ARG VITE_API_URL=http://localhost:3333
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ── Stage 2: Servidor Nginx ────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

# Remove a config padrão do nginx e substitui pela nossa
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia o build do React
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
