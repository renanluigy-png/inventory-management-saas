#!/bin/sh
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Controle de Estoque — Backend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Aguarda o banco de dados estar disponível (max 60s)
echo "⏳ Aguardando banco de dados..."
MAX_TRIES=30
TRIES=0
until node -e "
  const { Client } = require('pg');
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  c.connect().then(() => { console.log('ok'); c.end(); process.exit(0); })
    .catch(e => { c.end(); process.exit(1); });
" 2>/dev/null; do
  TRIES=$((TRIES + 1))
  if [ $TRIES -ge $MAX_TRIES ]; then
    echo "✗ Banco de dados indisponível após ${MAX_TRIES} tentativas. Abortando."
    exit 1
  fi
  echo "  tentativa ${TRIES}/${MAX_TRIES} — aguardando 2s..."
  sleep 2
done
echo "✓ Banco de dados disponível"

# Executa as migrations pendentes de forma segura (idempotente)
echo "⏳ Executando migrations..."
npx prisma migrate deploy
echo "✓ Migrations aplicadas"

# Inicia o servidor
echo "🚀 Iniciando servidor..."
exec node dist/server.js
