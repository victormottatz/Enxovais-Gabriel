import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../app.js';
import http from 'http';
import { AddressInfo } from 'net';

describe('Validação Completa de Todas as Rotas da API (Enxovais Gabriel)', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    // Inicializa servidor em porta dinâmica livre
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address() as AddressInfo;
        baseUrl = `http://localhost:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  // 1. Healthcheck e Documentação Swagger
  it('GET /health - deve responder 200 OK com status e request_id', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe('ok');
    expect(data.app).toContain('Enxovais Gabriel');
    expect(data.request_id).toBeDefined();
  });

  it('GET /api-docs/ - deve responder 200 na documentação Swagger', async () => {
    const res = await fetch(`${baseUrl}/api-docs/`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('Swagger UI');
  });

  // 2. Rotas de Clientes (/api/v1/clientes)
  it('Rotas de Clientes: POST, GET lista, GET por ID', async () => {
    // POST /api/v1/clientes
    const createRes = await fetch(`${baseUrl}/api/v1/clientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Maria da Silva Teste',
        whatsapp: '18999990001',
        cpf: '123.456.789-00',
        endereco: 'Rua das Flores, 123',
        limite_credito: 1000,
        dia_vencimento: 10,
        valor_parcela_padrao: 100,
      }),
    });
    expect(createRes.status).toBe(201);
    const cliente = await createRes.json();
    expect(cliente.id).toBeDefined();
    expect(cliente.nome).toBe('Maria da Silva Teste');

    // GET /api/v1/clientes
    const listRes = await fetch(`${baseUrl}/api/v1/clientes?search=Maria`);
    expect(listRes.status).toBe(200);
    const list = await listRes.json();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(1);

    // GET /api/v1/clientes/:id
    const getRes = await fetch(`${baseUrl}/api/v1/clientes/${cliente.id}`);
    expect(getRes.status).toBe(200);
    const clienteDetalhe = await getRes.json();
    expect(clienteDetalhe.id).toBe(cliente.id);
  });

  // 3. Rotas de Produtos (/api/v1/produtos)
  it('Rotas de Produtos: POST, GET lista, GET por ID, PATCH dados, PATCH estoque, POST upload-foto, DELETE', async () => {
    // POST /api/v1/produtos
    const createRes = await fetch(`${baseUrl}/api/v1/produtos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        codigo_sku: 'TEST-PROD-01',
        nome: 'Toalha de Banho Teste',
        categoria: 'CAMA_MESA_BANHO',
        preco_custo: 25.0,
        preco_venda_vista: 50.0,
        preco_venda_crediario: 55.0,
        estoque_atual: 10,
        estoque_minimo: 2,
      }),
    });
    expect(createRes.status).toBe(201);
    const prod = await createRes.json();
    expect(prod.id).toBeDefined();

    // GET /api/v1/produtos
    const listRes = await fetch(`${baseUrl}/api/v1/produtos?apenas_em_estoque=true`);
    expect(listRes.status).toBe(200);
    const produtos = await listRes.json();
    expect(Array.isArray(produtos)).toBe(true);

    // GET /api/v1/produtos/:id
    const getRes = await fetch(`${baseUrl}/api/v1/produtos/${prod.id}`);
    expect(getRes.status).toBe(200);
    const prodDetalhe = await getRes.json();
    expect(prodDetalhe.id).toBe(prod.id);

    // PATCH /api/v1/produtos/:id
    const patchRes = await fetch(`${baseUrl}/api/v1/produtos/${prod.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Toalha de Banho Teste Premium',
      }),
    });
    expect(patchRes.status).toBe(200);
    const prodAtualizado = await patchRes.json();
    expect(prodAtualizado.nome).toBe('Toalha de Banho Teste Premium');

    // PATCH /api/v1/produtos/:id/estoque
    const estoqueRes = await fetch(`${baseUrl}/api/v1/produtos/${prod.id}/estoque`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quantidade_delta: -2,
      }),
    });
    expect(estoqueRes.status).toBe(200);
    const estoqueAtualizado = await estoqueRes.json();
    expect(estoqueAtualizado.estoque_atual).toBe(8);

    // POST /api/v1/produtos/upload-foto (Base64 JPEG simples 1x1 pixel)
    const uploadRes = await fetch(`${baseUrl}/api/v1/produtos/upload-foto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imagem_base64: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
      }),
    });
    expect(uploadRes.status).toBe(201);
    const uploadData = await uploadRes.json();
    expect(uploadData.foto_url).toBeDefined();

    // DELETE /api/v1/produtos/:id
    const deleteRes = await fetch(`${baseUrl}/api/v1/produtos/${prod.id}`, {
      method: 'DELETE',
    });
    expect(deleteRes.status).toBe(200);
  });

  // 4. Rotas de Vendas (/api/v1/vendas)
  it('Rotas de Vendas: POST venda, GET lista, GET por ID', async () => {
    // Cria cliente primeiro
    const cliente = await fetch(`${baseUrl}/api/v1/clientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Cliente Venda Teste',
        whatsapp: '18999990002',
      }),
    }).then((r) => r.json());

    // POST /api/v1/vendas
    const vendaRes = await fetch(`${baseUrl}/api/v1/vendas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_id: cliente.id,
        forma_pagamento: 'CREDIARIO',
        valor_total: 200.0,
        valor_entrada: 50.0,
        itens: [
          {
            descricao_item: 'Jogo de Lençol Casal',
            quantidade: 1,
            preco_unitario: 200.0,
            tipo_item: 'ESTOQUE_LOCAL',
          },
        ],
        novo_valor_parcela_negociado: 50.0,
      }),
    });
    expect(vendaRes.status).toBe(201);
    const vendaCriada = await vendaRes.json();
    expect(vendaCriada.venda).toBeDefined();

    // GET /api/v1/vendas
    const listVendasRes = await fetch(`${baseUrl}/api/v1/vendas?cliente_id=${cliente.id}`);
    expect(listVendasRes.status).toBe(200);
    const listaVendas = await listVendasRes.json();
    expect(listaVendas.length).toBeGreaterThanOrEqual(1);

    // GET /api/v1/vendas/:id
    const getVendaRes = await fetch(`${baseUrl}/api/v1/vendas/${vendaCriada.venda.id}`);
    expect(getVendaRes.status).toBe(200);
    const detalheVenda = await getVendaRes.json();
    expect(detalheVenda.id).toBe(vendaCriada.venda.id);
  });

  // 5. Rotas de Fichas de Crediário (/api/v1/fichas)
  it('Rotas de Fichas de Crediário: GET lista, GET por ID, POST pagamento, PATCH ajustar saldo', async () => {
    // Obter lista de fichas
    const listFichasRes = await fetch(`${baseUrl}/api/v1/fichas`);
    expect(listFichasRes.status).toBe(200);
    const fichas = await listFichasRes.json();
    expect(Array.isArray(fichas)).toBe(true);

    if (fichas.length > 0) {
      const fichaId = fichas[0].id;

      // GET /api/v1/fichas/:id
      const fichaRes = await fetch(`${baseUrl}/api/v1/fichas/${fichaId}`);
      expect(fichaRes.status).toBe(200);
      const fichaDetalhe = await fichaRes.json();
      expect(fichaDetalhe.ficha).toBeDefined();
      expect(fichaDetalhe.ficha.id).toBe(fichaId);

      // POST /api/v1/fichas/:id/pagamentos
      const pagtoRes = await fetch(`${baseUrl}/api/v1/fichas/${fichaId}/pagamentos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          valor_pago: 25.0,
          descricao: 'Pagamento de teste',
        }),
      });
      expect(pagtoRes.status).toBe(200);
      const resultadoPagto = await pagtoRes.json();
      expect(resultadoPagto.recibo).toBeDefined();

      // PATCH /api/v1/fichas/:id/ajustar-saldo
      const ajusteRes = await fetch(`${baseUrl}/api/v1/fichas/${fichaId}/ajustar-saldo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          novo_saldo: 100.0,
          motivo: 'Revisão acordada com cliente',
          novo_valor_parcela: 50.0,
        }),
      });
      expect(ajusteRes.status).toBe(200);
    }
  });

  // 6. Rotas de Pedidos sob Encomenda (/api/v1/pedidos)
  it('Rotas de Pedidos: POST, GET lista, PATCH status', async () => {
    // Cria cliente
    const cliente = await fetch(`${baseUrl}/api/v1/clientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: 'Cliente Pedido Encomenda',
        whatsapp: '18999990003',
      }),
    }).then((r) => r.json());

    // POST /api/v1/pedidos
    const createPedidoRes = await fetch(`${baseUrl}/api/v1/pedidos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cliente_id: cliente.id,
        descricao_itens: 'Jogo de Cozinha 3 Peças Sob Medida',
        data_previsao_entrega: '2026-10-15',
        valor_total: 180.0,
        valor_sinal: 50.0,
      }),
    });
    expect(createPedidoRes.status).toBe(201);
    const pedidoBody = await createPedidoRes.json();
    expect(pedidoBody.success).toBe(true);
    const pedidoId = pedidoBody.data.id;

    // GET /api/v1/pedidos
    const listPedidosRes = await fetch(`${baseUrl}/api/v1/pedidos`);
    expect(listPedidosRes.status).toBe(200);
    const pedidosList = await listPedidosRes.json();
    expect(pedidosList.success).toBe(true);

    // PATCH /api/v1/pedidos/:id/status
    const updateStatusRes = await fetch(`${baseUrl}/api/v1/pedidos/${pedidoId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status_producao: 'EM_PRODUCAO',
      }),
    });
    expect(updateStatusRes.status).toBe(200);
    const statusBody = await updateStatusRes.json();
    expect(statusBody.data.status_producao).toBe('EM_PRODUCAO');
  });

  // 7. Rotas de Configurações (/api/v1/configuracoes)
  it('Rotas de Configurações: GET e PATCH', async () => {
    // GET /api/v1/configuracoes
    const getRes = await fetch(`${baseUrl}/api/v1/configuracoes`);
    expect(getRes.status).toBe(200);
    const configData = await getRes.json();
    expect(configData.success).toBe(true);

    // PATCH /api/v1/configuracoes
    const patchRes = await fetch(`${baseUrl}/api/v1/configuracoes`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chave_pix: '18991234567',
        nome_titular_pix: 'Gabriel Enxovais ME',
      }),
    });
    expect(patchRes.status).toBe(200);
    const updated = await patchRes.json();
    expect(updated.data.chave_pix).toBe('18991234567');
  });

  // 8. Rotas de Carnê Digital (/api/v1/carne-digital/:token)
  it('Rotas de Carnê Digital: GET /api/v1/carne-digital/:token', async () => {
    // Usa uma ficha existente ou cliente
    const fichas = await fetch(`${baseUrl}/api/v1/fichas`).then((r) => r.json());
    if (fichas.length > 0) {
      const ficha = fichas[0];
      const token = ficha.id;
      const res = await fetch(`${baseUrl}/api/v1/carne-digital/${token}`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.cliente_nome).toBeDefined();
    }
  });

  // 9. Rotas de IA LIA (/api/v1/lia)
  it('Rotas de LIA: POST /consulta, GET /resumo-diario, GET /avaliar-cliente/:id', async () => {
    // POST /api/v1/lia/consulta
    const consultaRes = await fetch(`${baseUrl}/api/v1/lia/consulta`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pergunta: 'Quem tem vencimento hoje?' }),
    });
    expect(consultaRes.status).toBe(200);
    const resposta = await consultaRes.json();
    expect(resposta.resposta).toBeDefined();

    // GET /api/v1/lia/resumo-diario
    const resumoRes = await fetch(`${baseUrl}/api/v1/lia/resumo-diario`);
    expect(resumoRes.status).toBe(200);
    const resumo = await resumoRes.json();
    expect(resumo.resposta).toBeDefined();

    // GET /api/v1/lia/avaliar-cliente/:id
    const clientes = await fetch(`${baseUrl}/api/v1/clientes`).then((r) => r.json());
    if (clientes.length > 0) {
      const avaliarRes = await fetch(`${baseUrl}/api/v1/lia/avaliar-cliente/${clientes[0].id}`);
      expect(avaliarRes.status).toBe(200);
      const avaliacao = await avaliarRes.json();
      expect(avaliacao.resposta).toBeDefined();
    }
  });

  // 10. Rotas de Backup (/api/v1/backup)
  it('GET /api/v1/backup/download - deve retornar o JSON de backup com cabeçalho de anexo', async () => {
    const res = await fetch(`${baseUrl}/api/v1/backup/download`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(res.headers.get('content-disposition')).toContain('attachment');
    const backup = await res.json();
    expect(backup.versao_schema).toBeDefined();
    expect(backup.dados).toBeDefined();
  });

  // 11. Rotas de Importação (/api/v1/importacao)
  it('Rotas de Importação: POST /validar e POST /executar', async () => {
    const csvSample = `Nome;Telefone;DiaVencimento;Ciclo;SaldoDevedor;ValorParcela\nAna Paula;18991238888;10;MENSAL;300;50`;

    // POST /api/v1/importacao/validar
    const validarRes = await fetch(`${baseUrl}/api/v1/importacao/validar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv_content: csvSample }),
    });
    expect(validarRes.status).toBe(200);
    const valResult = await validarRes.json();
    expect(valResult.total).toBe(1);

    // POST /api/v1/importacao/executar
    const execRes = await fetch(`${baseUrl}/api/v1/importacao/executar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        itens: [
          {
            nome: 'Ana Paula Import',
            whatsapp: '18991238888',
            dia_vencimento: 10,
            tipo_ciclo: 'MENSAL_PAGAMENTO',
            saldo_devedor_atual: 300,
            valor_parcela: 50,
          },
        ],
      }),
    });
    expect(execRes.status).toBe(201);
    const execResult = await execRes.json();
    expect(execResult.importados).toBe(1);
  });

  // 12. Rotas de WhatsApp e Webhook (/api/v1/whatsapp, /api/v1/webhook)
  it('Rotas de WhatsApp e Webhook: GET status, POST send, POST webhook', async () => {
    // GET /api/v1/whatsapp/status
    const statusRes = await fetch(`${baseUrl}/api/v1/whatsapp/status`);
    expect(statusRes.status).toBe(200);
    const statusData = await statusRes.json();
    expect(statusData.request_id).toBeDefined();

    // POST /api/v1/whatsapp/send
    const sendRes = await fetch(`${baseUrl}/api/v1/whatsapp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: '18999991234',
        message: 'Teste de mensagem avulsa',
      }),
    });
    expect(sendRes.status).toBe(200);
    const sendData = await sendRes.json();
    expect(sendData.request_id).toBeDefined();

    // POST /api/v1/webhook/evolution
    const webhookRes = await fetch(`${baseUrl}/api/v1/webhook/evolution`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'CONNECTION_UPDATE',
        data: { state: 'open' },
      }),
    });
    expect(webhookRes.status).toBe(200);
    const webhookData = await webhookRes.json();
    expect(webhookData.received).toBe(true);
  });

  // 13. Tratamento de Erros e Validação Zod
  it('Middleware de Erro e Validação Zod: Deve retornar código semântico e request_id', async () => {
    const res = await fetch(`${baseUrl}/api/v1/clientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome: '', // Nome inválido
        whatsapp: '',
      }),
    });
    expect(res.status).toBe(422);
    const err = await res.json();
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.request_id).toBeDefined();
    expect(err.errors).toBeDefined();
  });
});
