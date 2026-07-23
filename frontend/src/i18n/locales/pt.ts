const pt = {
  translation: {
    // ── Navegação ──────────────────────────────────────────────
    nav: {
      dashboard:    'Dashboard',
      sales:        'PDV / Vendas',
      products:     'Produtos',
      categories:   'Categorias',
      customers:    'Clientes',
      stock:        'Estoque',
      promotions:   'Promoções',
      caixa:        'Caixa',
      reports:      'Relatórios',
      users:        'Usuários',
      settings:     'Configurações',
      audit:        'Auditoria',
    },

    // ── Autenticação ───────────────────────────────────────────
    auth: {
      login:              'Entrar',
      logout:             'Sair',
      email:              'E-mail',
      password:           'Senha',
      forgotPassword:     'Esqueceu a senha?',
      resetPassword:      'Redefinir Senha',
      changePassword:     'Alterar Senha',
      currentPassword:    'Senha atual',
      newPassword:        'Nova senha',
      confirmPassword:    'Confirmar nova senha',
      welcome:            'Bem-vindo, {{name}}!',
      invalidCredentials: 'Credenciais inválidas',
      accountLocked:      'Conta bloqueada temporariamente. Tente novamente em {{minutes}} minutos.',
    },

    // ── Dashboard ──────────────────────────────────────────────
    dashboard: {
      title:            'Dashboard',
      todayRevenue:     'Faturamento Hoje',
      monthRevenue:     'Faturamento do Mês',
      todaySales:       'Vendas Hoje',
      avgTicket:        'Ticket Médio',
      lowStock:         'Estoque Crítico',
      topProducts:      'Produtos Mais Vendidos',
      salesChart:       'Vendas por Período',
      paymentMethods:   'Por Forma de Pagamento',
    },

    // ── Produtos ───────────────────────────────────────────────
    products: {
      title:         'Produtos',
      add:           'Novo Produto',
      edit:          'Editar Produto',
      name:          'Nome',
      sku:           'SKU',
      price:         'Preço',
      cost:          'Custo',
      stock:         'Estoque',
      minStock:      'Estoque Mínimo',
      category:      'Categoria',
      barcode:       'Código de Barras',
      active:        'Ativo',
      inactive:      'Inativo',
      noImage:       'Sem imagem',
      deleteConfirm: 'Tem certeza que deseja desativar este produto?',
    },

    // ── Vendas ─────────────────────────────────────────────────
    sales: {
      title:         'Vendas',
      newSale:       'Nova Venda',
      number:        'Nº',
      customer:      'Cliente',
      total:         'Total',
      status:        'Status',
      payment:       'Pagamento',
      date:          'Data',
      items:         'Itens',
      discount:      'Desconto',
      finalize:      'Finalizar Venda',
      cancel:        'Cancelar Venda',
      statuses: {
        ABERTA:      'Aberta',
        FINALIZADA:  'Finalizada',
        CANCELADA:   'Cancelada',
      },
      paymentMethods: {
        DINHEIRO:       'Dinheiro',
        CARTAO_CREDITO: 'Cartão de Crédito',
        CARTAO_DEBITO:  'Cartão de Débito',
        PIX:            'PIX',
        FIADO:          'Fiado',
      },
    },

    // ── Clientes ───────────────────────────────────────────────
    customers: {
      title:   'Clientes',
      add:     'Novo Cliente',
      edit:    'Editar Cliente',
      name:    'Nome',
      cpf:     'CPF',
      email:   'E-mail',
      phone:   'Telefone',
      address: 'Endereço',
    },

    // ── Estoque ────────────────────────────────────────────────
    stock: {
      title:     'Movimentação de Estoque',
      add:       'Registrar Entrada',
      movements: 'Histórico',
      type:      'Tipo',
      quantity:  'Quantidade',
      before:    'Anterior',
      after:     'Novo',
      reason:    'Motivo',
      types: {
        ENTRADA:       'Entrada',
        SAIDA:         'Saída',
        AJUSTE:        'Ajuste',
        VENDA:         'Venda',
        DEVOLUCAO:     'Devolução',
        BAIXA_PERDA:   'Baixa por Perda',
        BAIXA_AVARIA:  'Baixa por Avaria',
        TRANSFERENCIA: 'Transferência',
      },
    },

    // ── Relatórios ─────────────────────────────────────────────
    reports: {
      title:       'Relatórios',
      financial:   'Financeiro',
      inventory:   'Estoque',
      export:      'Exportar',
      pdf:         'PDF',
      excel:       'Excel',
      csv:         'CSV',
      startDate:   'Data Início',
      endDate:     'Data Fim',
      generate:    'Gerar Relatório',
    },

    // ── Geral ──────────────────────────────────────────────────
    common: {
      search:     'Buscar...',
      save:       'Salvar',
      cancel:     'Cancelar',
      delete:     'Excluir',
      edit:       'Editar',
      view:       'Visualizar',
      back:       'Voltar',
      loading:    'Carregando...',
      noResults:  'Nenhum resultado encontrado',
      yes:        'Sim',
      no:         'Não',
      active:     'Ativo',
      inactive:   'Inativo',
      total:      'Total',
      page:       'Página',
      of:         'de',
      actions:    'Ações',
      success:    'Sucesso',
      error:      'Erro',
      confirm:    'Confirmar',
      filters:    'Filtros',
      clear:      'Limpar',
      close:      'Fechar',
      required:   '* Campo obrigatório',
      optional:   '(opcional)',
    },

    // ── Notificações ───────────────────────────────────────────
    notifications: {
      title:       'Notificações',
      markRead:    'Marcar como lida',
      markAllRead: 'Marcar todas como lidas',
      noNew:       'Nenhuma notificação',
      delete:      'Remover',
    },

    // ── Configurações ──────────────────────────────────────────
    settings: {
      title:     'Configurações',
      company:   'Empresa',
      system:    'Sistema',
      theme:     'Tema',
      language:  'Idioma',
      currency:  'Moeda',
      save:      'Salvar configurações',
    },

    // ── Caixa ──────────────────────────────────────────────────
    caixa: {
      title:       'Caixa',
      open:        'Abrir Caixa',
      close:       'Fechar Caixa',
      sangria:     'Sangria',
      suprimento:  'Suprimento',
      balance:     'Saldo',
      initial:     'Saldo Inicial',
      final:       'Saldo Final',
      status: {
        ABERTO:  'Aberto',
        FECHADO: 'Fechado',
      },
    },
  },
} as const;

export default pt;
