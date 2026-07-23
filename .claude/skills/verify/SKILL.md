# Verify — Run Recipe

## Stack

- Backend: Express + Prisma + PostgreSQL — porta **3333**
- Frontend: Vite + React — porta **5173**
- Monorepo: `backend/` e `frontend/` na raiz

## Subir o backend

```bash
cd backend
npm run dev
# aguarda: "Server running on port 3333"
```

Variáveis de ambiente estão em `backend/.env` (já configuradas localmente).

## Obter JWT para chamadas curl

```bash
curl -s -X POST http://localhost:3333/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@demo.com","senha":"admin123"}' \
  | node -e "let d=''; process.stdin.on('data',c=>d+=c); process.stdin.on('end',()=>{ console.log(JSON.parse(d).data.accessToken); })"
```

O `companyId` do usuário admin é extraído do JWT automaticamente pelo middleware.

## Shape das respostas HTTP (ground truth)

**Paginated GET:** `{ status, data: T[], meta: { total, page, limit, totalPages } }` (flat — backend usa `res.json({ status, ...result })`)

**Single-item POST/PUT:** `{ status, message, data: { [entityKey]: Entity } }` onde `entityKey` é `category`, `product`, `customer`, `sale`, `user`

**Erro:** `{ status: 'error', message: string }`

## Flows críticos para verificar

1. **Multitenancy:** POST entidade → GET entidade com mesmo JWT → confirmar `companyId` no array retornado
2. **Categories → Products:** POST /categories → ID retornado → POST /products com `categoryId` → GET /products confirma join `category.nome`
3. **Stock baixo:** GET /products/low-stock — usa raw SQL com filtro `companyId`
4. **Auth:** token expirado → 401; sem token → 401; MASTER sem companyId → vê todos os registros

## Gotchas

- `Category.nome` é `@unique` global (não por empresa) — duas empresas com mesmo nome de categoria geram `P2002`
- Mesmo problema: `Product.sku`, `Product.codigoBarras`, `Customer.cpf`, `Customer.email`
- Frontend usa `type PageRes<T> = { status: string; data: T[]; meta: PaginationMeta }` local em cada arquivo de API — o tipo `PaginatedApiResponse<T>` em `types/index.ts` está obsoleto
