import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('\n🌱 Iniciando seed do banco de dados...\n');

  // ----------------------------------------------------------------
  // USUÁRIO ADMINISTRADOR PADRÃO
  // ----------------------------------------------------------------
  const senhaHash = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@estoque.com' },
    update: {},
    create: {
      nome: 'Administrador',
      email: 'admin@estoque.com',
      senha: senhaHash,
      role: Role.ADMIN,
    },
  });

  console.log(`✅ Usuário admin: ${admin.email}`);

  // ----------------------------------------------------------------
  // CATEGORIAS PADRÃO
  // ----------------------------------------------------------------
  const categorias = [
    { nome: 'Alimentos', descricao: 'Produtos alimentícios em geral' },
    { nome: 'Bebidas', descricao: 'Bebidas alcoólicas e não alcoólicas' },
    { nome: 'Limpeza', descricao: 'Produtos de limpeza e higiene do lar' },
    { nome: 'Higiene Pessoal', descricao: 'Produtos de higiene e cuidado pessoal' },
    { nome: 'Eletrônicos', descricao: 'Aparelhos e acessórios eletrônicos' },
    { nome: 'Papelaria', descricao: 'Material de escritório e papelaria' },
    { nome: 'Outros', descricao: 'Produtos sem categoria específica' },
  ];

  for (const categoria of categorias) {
    await prisma.category.upsert({
      where: { nome: categoria.nome },
      update: {},
      create: categoria,
    });
  }

  console.log(`✅ ${categorias.length} categorias criadas`);

  // ----------------------------------------------------------------
  // RESUMO
  // ----------------------------------------------------------------
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║       Seed concluído com sucesso!    ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('\n📧 Login:  admin@estoque.com');
  console.log('🔑 Senha:  admin123');
  console.log('\n⚠️  Altere a senha do admin após o primeiro acesso!\n');
}

main()
  .catch((error) => {
    console.error('\n❌ Erro durante o seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
