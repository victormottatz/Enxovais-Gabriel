export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Enxovais Gabriel - API de Gestão & Crediário',
    version: '1.0.0',
    description: 'Painel Interativo de Inspeção e Testes das Rotas REST do Ateliê Enxovais Gabriel.',
  },
  servers: [
    {
      url: '/api/v1',
      description: 'API v1',
    },
    {
      url: '/',
      description: 'Raiz do Servidor',
    },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'Health Check da Aplicação',
        description: 'Retorna o status do servidor, diretório do frontend e horário.',
        responses: {
          '200': {
            description: 'Servidor operacional',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    app: { type: 'string' },
                    frontend_path: { type: 'string' },
                    time: { type: 'string' },
                    request_id: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/clientes': {
      get: {
        summary: 'Listar Clientes',
        description: 'Retorna a lista de clientes cadastrados.',
        responses: {
          '200': {
            description: 'Lista de clientes',
          },
        },
      },
      post: {
        summary: 'Cadastrar Cliente',
        description: 'Cria um novo cliente no sistema.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['nome', 'telefone'],
                properties: {
                  nome: { type: 'string', example: 'Maria Silva' },
                  telefone: { type: 'string', example: '18999998888' },
                  endereco: { type: 'string', example: 'Rua das Flores, 123' },
                  cidade: { type: 'string', example: 'Presidente Prudente' },
                  bairro: { type: 'string', example: 'Centro' },
                  limite_credito: { type: 'number', example: 1000 },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Cliente criado com sucesso',
          },
        },
      },
    },
    '/produtos': {
      get: {
        summary: 'Listar Produtos',
        description: 'Retorna o catálogo de produtos e utilidades.',
        responses: {
          '200': {
            description: 'Lista de produtos',
          },
        },
      },
    },
    '/fichas': {
      get: {
        summary: 'Listar Fichas de Crediário',
        description: 'Retorna as fichas de crediário ativas e liquidadas.',
        responses: {
          '200': {
            description: 'Lista de fichas',
          },
        },
      },
    },
    '/pedidos': {
      get: {
        summary: 'Listar Pedidos / Encomendas',
        description: 'Retorna a lista de pedidos de enxoval.',
        responses: {
          '200': {
            description: 'Lista de pedidos',
          },
        },
      },
    },
    '/whatsapp/status': {
      get: {
        summary: 'Status da Conexão WhatsApp',
        description: 'Verifica a conectividade da Evolution API.',
        responses: {
          '200': {
            description: 'Status do WhatsApp',
          },
        },
      },
    },
  },
};
