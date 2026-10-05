#!/bin/sh
set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Controle de Estoque — Backend"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "⏳ Aguardando banco de dados..."
node - <<'NODE'
const u = new URL(process.env.DATABASE_URL);
console.log(`  PostgreSQL: ${u.hostname}:${u.port || '5432'} / ${u.pathname.replace(/^\//, '')}`);
NODE

MAX_TRIES=30
TRIES=0
until node - <<'NODE'
const { Client } = require('pg');
const c = new Client({ connectionString: process.env.DATABASE_URL });
c.connect()
  .then(() => c.end().then(() => process.exit(0)))
  .catch(async (e) => {
    console.error(`  DB_ERROR: ${e.message}`);
    try { await c.end(); } catch {}
    process.exit(1);
  });
NODE
do
  TRIES=$((TRIES + 1))
  if [ $TRIES -ge $MAX_TRIES ]; then
    echo "✗ Banco de dados indisponível após ${MAX_TRIES} tentativas. Abortando."
    exit 1
  fi
  echo "  tentativa ${TRIES}/${MAX_TRIES} — aguardando 2s..."
  sleep 2
done
echo "✓ Banco de dados disponível"

echo "⏳ Executando migrations..."
npx prisma migrate deploy
echo "✓ Migrations aplicadas"

echo "🚀 Iniciando servidor..."
exec node dist/server.js
