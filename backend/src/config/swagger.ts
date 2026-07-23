import swaggerJSDoc from 'swagger-jsdoc';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Controle de Estoque — API',
      version: '1.0.0',
      description:
        'API REST para sistema de controle de estoque, PDV e gestão empresarial.\n\n' +
        'Autenticação: Bearer JWT. Obtenha o token em **POST /api/v1/auth/login**.',
      contact: { name: 'Suporte', email: 'suporte@empresa.com' },
    },
    servers: [
      { url: 'http://localhost:3333', description: 'Desenvolvimento' },
      { url: 'https://api.empresa.com', description: 'Produção' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: { type: 'string', example: 'error' },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            path: { type: 'string' },
          },
        },
        SystemSettings: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nomeEmpresa: { type: 'string' },
            cnpj: { type: 'string', nullable: true },
            telefone: { type: 'string', nullable: true },
            email: { type: 'string', format: 'email', nullable: true },
            endereco: { type: 'string', nullable: true },
            logoUrl: { type: 'string', nullable: true },
            tema: { type: 'string', enum: ['light', 'dark'] },
            moeda: { type: 'string', example: 'BRL' },
            impostoPercent: { type: 'number', example: 0 },
            estoqueMinimoPadrao: { type: 'integer', example: 5 },
            permitirVendaSemEstoque: { type: 'boolean' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Autenticação e perfil' },
      { name: 'Produtos', description: 'Gestão de produtos' },
      { name: 'Categorias', description: 'Gestão de categorias' },
      { name: 'Clientes', description: 'Gestão de clientes' },
      { name: 'Estoque', description: 'Movimentações de estoque' },
      { name: 'Vendas (PDV)', description: 'Ponto de venda' },
      { name: 'Dashboard', description: 'KPIs e analytics' },
      { name: 'Relatórios', description: 'Relatórios e exportações' },
      { name: 'Configurações', description: 'Configurações do sistema' },
      { name: 'Auditoria', description: 'Log de auditoria' },
      { name: 'Sistema', description: 'Health, métricas e backup' },
    ],
    paths: {
      '/health': {
        get: {
          tags: ['Sistema'],
          summary: 'Health check',
          security: [],
          responses: {
            '200': { description: 'API e banco operacionais' },
            '503': { description: 'Serviço degradado' },
          },
        },
      },
      '/api/v1/auth/login': {
        post: {
          tags: ['Auth'],
          summary: 'Autenticar e obter token JWT',
          security: [],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['email', 'senha'],
                  properties: {
                    email: { type: 'string', format: 'email' },
                    senha: { type: 'string', minLength: 6 },
                  },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Login bem-sucedido. Retorna token e dados do usuário.' },
            '401': { description: 'Credenciais inválidas.' },
          },
        },
      },
      '/api/v1/settings': {
        get: {
          tags: ['Configurações'],
          summary: 'Retorna as configurações do sistema',
          responses: { '200': { description: 'Configurações atuais' } },
        },
        put: {
          tags: ['Configurações'],
          summary: 'Atualiza as configurações (ADMIN)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SystemSettings' },
              },
            },
          },
          responses: { '200': { description: 'Configurações atualizadas' } },
        },
      },
      '/api/v1/audit': {
        get: {
          tags: ['Auditoria'],
          summary: 'Lista eventos de auditoria (ADMIN)',
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'limit', schema: { type: 'integer', default: 20 } },
            { in: 'query', name: 'entidade', schema: { type: 'string' } },
            { in: 'query', name: 'acao', schema: { type: 'string', enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'PERMISSION_CHANGE'] } },
            { in: 'query', name: 'dataInicio', schema: { type: 'string', format: 'date' } },
            { in: 'query', name: 'dataFim', schema: { type: 'string', format: 'date' } },
          ],
          responses: { '200': { description: 'Lista paginada de eventos de auditoria' } },
        },
      },
      '/api/v1/system/metrics': {
        get: {
          tags: ['Sistema'],
          summary: 'Métricas do servidor (ADMIN)',
          responses: { '200': { description: 'Snapshot de métricas de performance' } },
        },
      },
      '/api/v1/system/backup': {
        get: {
          tags: ['Sistema'],
          summary: 'Lista backups existentes (ADMIN)',
          responses: { '200': { description: 'Lista de arquivos ZIP de backup' } },
        },
        post: {
          tags: ['Sistema'],
          summary: 'Cria um novo backup (ADMIN)',
          parameters: [
            { in: 'query', name: 'type', schema: { type: 'string', enum: ['full', 'database', 'uploads', 'settings'], default: 'full' } },
          ],
          responses: { '201': { description: 'Backup criado com sucesso' } },
        },
      },
      '/api/v1/system/restore': {
        post: {
          tags: ['Sistema'],
          summary: 'Restaura dados de um backup ZIP (ADMIN)',
          parameters: [
            { in: 'query', name: 'confirm', schema: { type: 'string', enum: ['true', 'false'], default: 'false' } },
          ],
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: { backup: { type: 'string', format: 'binary' } },
                },
              },
            },
          },
          responses: {
            '200': { description: 'Inspeção ou restore concluído' },
          },
        },
      },
    },
  },
  // Não lemos JSDoc dos arquivos — spec definida inline acima
  apis: [],
};

export const swaggerSpec = swaggerJSDoc(options);
