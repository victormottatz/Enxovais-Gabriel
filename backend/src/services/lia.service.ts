import { pool } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';

export interface LiaConsultaResponse {
  pergunta: string;
  resposta: string;
  tipo_consulta: 'INADIMPLENTES' | 'A_RECEBER' | 'HISTORICO_CLIENTE' | 'AVALIACAO_CREDITO' | 'ESTOQUE_BAIXO' | 'RESUMO_GERAL' | 'OUTROS';
  dados_apoio?: unknown;
  sugestoes_acao?: string[];
}

export class LiaService {
  /**
   * Processa consultas em linguagem natural feitas pela proprietária (Lucélia)
   * consultando a base factual do PostgreSQL sem alucinações.
   */
  public static async responderConsulta(pergunta: string): Promise<LiaConsultaResponse> {
    const texto = pergunta.toLowerCase().trim();

    // 1. Consulta: Quem está atrasado / inadimplentes / cobrança
    if (
      texto.includes('atrasad') ||
      texto.includes('inadimplente') ||
      texto.includes('cobrar') ||
      texto.includes('devendo') ||
      texto.includes('vencid')
    ) {
      return await this.consultarInadimplentes(pergunta);
    }

    // 2. Consulta: Quanto temos para receber / a receber / faturamento
    if (
      texto.includes('a receber') ||
      texto.includes('recebimento') ||
      texto.includes('saldo total') ||
      texto.includes('quanto temos')
    ) {
      return await this.consultarAReceber(pergunta);
    }

    // 3. Consulta: Estoque baixo / produtos acabando
    if (
      texto.includes('estoque') ||
      texto.includes('acabando') ||
      texto.includes('reposição') ||
      texto.includes('falta')
    ) {
      return await this.consultarEstoque(pergunta);
    }

    // 4. Consulta: Histórico ou Avaliação de um Cliente específico
    const matchCliente = texto.match(/(?:cliente|da|do|para)\s+([a-zA-Zá-úÁ-Ú]+)/i);
    if (matchCliente && matchCliente[1] && matchCliente[1].length >= 3) {
      const nomeBuscado = matchCliente[1];
      const clienteEncontrado = await this.buscarClientePorNome(nomeBuscado);
      if (clienteEncontrado) {
        return await this.avaliarCliente(clienteEncontrado.id, pergunta);
      }
    }

    // 5. Resumo Geral Diário da Loja
    return await this.consultarResumoGeral(pergunta);
  }

  /**
   * Consulta clientes com parcelas em atraso ou saldo pendente
   */
  private static async consultarInadimplentes(pergunta: string): Promise<LiaConsultaResponse> {
    const res = await pool.query(`
      SELECT 
        c.id, c.nome, c.whatsapp, 
        f.saldo_devedor_total, f.valor_parcela_padrao, f.dia_vencimento_padrao,
        COUNT(p.id) FILTER (WHERE p.status = 'ATRASADO' OR (p.status = 'PENDENTE' AND p.data_vencimento < CURRENT_DATE)) as parcelas_atrasadas,
        MIN(p.data_vencimento) FILTER (WHERE p.status = 'ATRASADO' OR (p.status = 'PENDENTE' AND p.data_vencimento < CURRENT_DATE)) as vencimento_mais_antigo
      FROM clientes c
      JOIN fichas_crediario f ON f.cliente_id = c.id
      LEFT JOIN parcelas_crediario p ON p.ficha_id = f.id
      WHERE f.saldo_devedor_total > 0
      GROUP BY c.id, c.nome, c.whatsapp, f.saldo_devedor_total, f.valor_parcela_padrao, f.dia_vencimento_padrao
      ORDER BY parcelas_atrasadas DESC, f.saldo_devedor_total DESC
      LIMIT 10
    `);

    const totalAtrasados = res.rows.filter((r) => Number(r.parcelas_atrasadas) > 0);

    if (totalAtrasados.length === 0) {
      return {
        pergunta,
        resposta: 'Excelente notícia, Lucélia! 🎉 No momento não há nenhum cliente com parcelas em atraso na base do crediário.',
        tipo_consulta: 'INADIMPLENTES',
        dados_apoio: [],
        sugestoes_acao: ['Consultar previsão de recebimentos da semana', 'Ver oportunidades de recompra'],
      };
    }

    const nomesLista = totalAtrasados
      .slice(0, 5)
      .map((c) => `• *${c.nome}*: Saldo de R$ ${Number(c.saldo_devedor_total).toFixed(2)} (${c.parcelas_atrasadas} parcela(s) vencida(s))`)
      .join('\n');

    return {
      pergunta,
      resposta: `Identifiquei **${totalAtrasados.length} cliente(s)** com parcelas em atraso que merecem sua atenção hoje:\n\n${nomesLista}\n\n💡 *Dica da Lia*: Você pode enviar uma mensagem amigável de lembrete pelo WhatsApp com 1 clique.`,
      tipo_consulta: 'INADIMPLENTES',
      dados_apoio: totalAtrasados,
      sugestoes_acao: ['Abrir Fila de Cobrança no WhatsApp', 'Ver detalhes da ficha do primeiro cliente'],
    };
  }

  /**
   * Consulta valores a receber e previsão financeira
   */
  private static async consultarAReceber(pergunta: string): Promise<LiaConsultaResponse> {
    const resTotal = await pool.query(`
      SELECT 
        COALESCE(SUM(saldo_devedor_total), 0) as total_crediario_ativo,
        COUNT(id) as total_fichas_abertas
      FROM fichas_crediario
      WHERE saldo_devedor_total > 0
    `);

    const totalCrediario = Number(resTotal.rows[0]?.total_crediario_ativo || 0);
    const totalFichas = Number(resTotal.rows[0]?.total_fichas_abertas || 0);

    return {
      pergunta,
      resposta: `Atualmente temos um saldo total de **R$ ${totalCrediario.toFixed(2)}** a receber distribuído em **${totalFichas} fichas de crediário ativas** na Enxovais Gabriel.`,
      tipo_consulta: 'A_RECEBER',
      dados_apoio: { totalCrediario, totalFichas },
      sugestoes_acao: ['Listar parcelas que vencem esta semana', 'Ver clientes com parcelas em dia'],
    };
  }

  /**
   * Consulta produtos com estoque baixo ou zerado
   */
  private static async consultarEstoque(pergunta: string): Promise<LiaConsultaResponse> {
    const res = await pool.query(`
      SELECT id, nome, categoria, estoque_atual, estoque_minimo, preco_venda_vista
      FROM produtos
      WHERE ativo = true AND estoque_atual <= estoque_minimo
      ORDER BY estoque_atual ASC, nome ASC
      LIMIT 10
    `);

    if (res.rows.length === 0) {
      return {
        pergunta,
        resposta: 'O estoque está sob controle! Todos os produtos ativos estão acima do nível mínimo de segurança.',
        tipo_consulta: 'ESTOQUE_BAIXO',
        dados_apoio: [],
        sugestoes_acao: ['Ver catálogo completo de produtos', 'Cadastrar novo produto'],
      };
    }

    const lista = res.rows
      .map((p) => `• *${p.nome}*: Restam **${p.estoque_atual}** un. (Mínimo: ${p.estoque_minimo})`)
      .join('\n');

    return {
      pergunta,
      resposta: `Atenção ao estoque! Encontrei **${res.rows.length} produto(s)** no nível mínimo ou esgotados:\n\n${lista}`,
      tipo_consulta: 'ESTOQUE_BAIXO',
      dados_apoio: res.rows,
      sugestoes_acao: ['Fazer pedido de encomenda para distribuidores', 'Ajustar estoque manual'],
    };
  }

  /**
   * Avalia um cliente para verificar histórico e concessão de crédito
   */
  public static async avaliarCliente(clienteId: string, pergunta?: string): Promise<LiaConsultaResponse> {
    const clienteRes = await pool.query('SELECT * FROM clientes WHERE id = $1', [clienteId]);
    if (clienteRes.rows.length === 0) {
      throw new AppError('Cliente não encontrado.', 404, 'CLIENTE_NOT_FOUND');
    }

    const cliente = clienteRes.rows[0];
    const fichaRes = await pool.query('SELECT * FROM fichas_crediario WHERE cliente_id = $1', [clienteId]);
    const ficha = fichaRes.rows[0] || null;

    const vendasRes = await pool.query(
      'SELECT id, valor_total, created_at, forma_pagamento FROM vendas WHERE cliente_id = $1 ORDER BY created_at DESC LIMIT 5',
      [clienteId]
    );

    const saldoDevedor = Number(ficha?.saldo_devedor_total || 0);
    const limiteCredito = Number(cliente.limite_credito || 1000);
    const parcelasAtrasadas = ficha ? await this.contarParcelasAtrasadas(ficha.id) : 0;

    let recomendacao = '';
    let statusRisco: 'BAIXO' | 'MEDIO' | 'ALTO' = 'BAIXO';

    if (parcelasAtrasadas > 0) {
      statusRisco = 'ALTO';
      recomendacao = `⚠️ **Atenção**: O cliente possui ${parcelasAtrasadas} parcela(s) em atraso e saldo de R$ ${saldoDevedor.toFixed(2)}. A política recomenda regularizar a pendência antes de conceder novo crediário.`;
    } else if (saldoDevedor > limiteCredito * 0.8) {
      statusRisco = 'MEDIO';
      recomendacao = `ℹ️ **Aviso**: O cliente está próximo do limite de crédito configurado (Saldo: R$ ${saldoDevedor.toFixed(2)} / Limite: R$ ${limiteCredito.toFixed(2)}). Avalie a capacidade de pagamento.`;
    } else {
      statusRisco = 'BAIXO';
      recomendacao = `✅ **Cliente com Bom Histórico**: Pagamentos em dia. Saldo devedor atual de R$ ${saldoDevedor.toFixed(2)} dentro do limite seguro. Venda a prazo recomendada!`;
    }

    const resposta = `**Prontuário de ${cliente.nome}**:\n\n${recomendacao}\n\n• **Total de Compras Anteriores**: ${vendasRes.rows.length} compra(s)\n• **WhatsApp**: ${cliente.whatsapp}\n• **Endereço Principal**: ${cliente.endereco || 'Não cadastrado'}`;

    return {
      pergunta: pergunta || `Avaliação de crédito para ${cliente.nome}`,
      resposta,
      tipo_consulta: 'AVALIACAO_CREDITO',
      dados_apoio: {
        cliente,
        ficha,
        statusRisco,
        saldoDevedor,
        parcelasAtrasadas,
        totalCompras: vendasRes.rows.length,
      },
      sugestoes_acao: [
        'Iniciar Nova Venda para este cliente',
        'Ver histórico completo de parcelas',
        'Conversar no WhatsApp',
      ],
    };
  }

  /**
   * Resumo diário geral da loja
   */
  private static async consultarResumoGeral(pergunta: string): Promise<LiaConsultaResponse> {
    const clientesCount = await pool.query('SELECT COUNT(*) FROM clientes WHERE ativo = true');
    const produtosCount = await pool.query('SELECT COUNT(*) FROM produtos WHERE ativo = true');
    const fichasTotal = await pool.query('SELECT COALESCE(SUM(saldo_devedor_total), 0) as total FROM fichas_crediario');

    const totalClientes = clientesCount.rows[0].count;
    const totalProdutos = produtosCount.rows[0].count;
    const saldoTotal = Number(fichasTotal.rows[0].total).toFixed(2);

    return {
      pergunta,
      resposta: `Olá, Lucélia! Sou a **Lia**, sua assistente na Enxovais Gabriel. 🌸\n\n**Panorama da Loja Hoje**:\n• 👥 **${totalClientes}** clientes cadastrados no sistema\n• 📦 **${totalProdutos}** produtos no catálogo\n• 💳 **R$ ${saldoTotal}** em saldo ativo no crediário\n\nComo posso te ajudar agora? Você pode perguntar sobre clientes atrasados, estoque, ou consultar um cliente específico!`,
      tipo_consulta: 'RESUMO_GERAL',
      dados_apoio: { totalClientes, totalProdutos, saldoTotal },
      sugestoes_acao: [
        'Quem está atrasado hoje?',
        'Quanto temos para receber este mês?',
        'Quais produtos estão com estoque baixo?',
      ],
    };
  }

  private static async buscarClientePorNome(nome: string): Promise<{ id: string; nome: string } | null> {
    const res = await pool.query(
      'SELECT id, nome FROM clientes WHERE ativo = true AND nome ILIKE $1 ORDER BY nome ASC LIMIT 1',
      [`%${nome}%`]
    );
    return res.rows[0] || null;
  }

  private static async contarParcelasAtrasadas(fichaId: string): Promise<number> {
    const res = await pool.query(
      `SELECT COUNT(*) FROM parcelas_crediario 
       WHERE ficha_id = $1 AND (status = 'ATRASADO' OR (status = 'PENDENTE' AND data_vencimento < CURRENT_DATE))`,
      [fichaId]
    );
    return Number(res.rows[0]?.count || 0);
  }
}
