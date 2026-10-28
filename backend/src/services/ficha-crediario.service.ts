import { pool } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';
import { WhatsAppService } from './whatsapp.service.js';

export interface AlertaFichaDTO {
  codigo: 'SEM_WHATSAPP' | 'SEM_ENDERECO' | 'TELEFONE_COMPARTILHADO' | 'REVISAR_DADOS';
  titulo: string;
  detalhe: string;
  severidade: 'alta' | 'media' | 'baixa';
  campo: 'whatsapp' | 'endereco' | 'valor_parcela' | 'saldo_devedor' | 'observacoes';
}

export interface FichaCrediarioDTO {
  id: string;
  cliente_id: string;
  cliente_nome?: string;
  cliente_whatsapp?: string;
  cliente_cpf?: string | null;
  cliente_endereco?: string | null;
  cliente_ponto_referencia?: string | null;
  cliente_limite_credito?: number;
  saldo_devedor_total: number;
  valor_parcela_padrao: number;
  dia_vencimento_padrao: number;
  tipo_ciclo: 'MENSAL_PAGAMENTO' | 'QUINZENAL_VALE';
  dia_vale_secundario?: number | null;
  status_ficha: 'ATIVO' | 'BLOQUEADO' | 'QUITADO';
  observacoes?: string | null;
  arquivos_origem?: string[];
  codigo_ficha?: string | null;
  tem_pendencia?: boolean;
  alertas?: AlertaFichaDTO[];
  created_at: string;
  updated_at: string;
}

export interface ParcelaDTO {
  id: string;
  ficha_id: string;
  numero_parcela: number;
  valor_parcela: number;
  data_vencimento: string;
  data_pagamento?: string | null;
  valor_pago: number;
  status: 'PENDENTE' | 'PAGO_TOTAL' | 'PAGO_PARCIAL' | 'ATRASADO' | 'CANCELADO';
}

export interface MovimentacaoFichaDTO {
  id: string;
  ficha_id: string;
  cliente_id?: string | null;
  venda_id?: string | null;
  tipo_movimentacao: 'DEBITO_COMPRA' | 'CREDITO_PAGAMENTO' | 'AJUSTE_PARCELA' | 'ESTORNO';
  valor: number;
  saldo_anterior: number;
  saldo_posterior: number;
  descricao: string;
  data_movimentacao?: string | null;
  forma_pagamento?: string | null;
  numero_parcela_ref?: string | null;
  observacoes?: string | null;
  created_at: string;
}

export class FichaCrediarioService {
  /**
   * Obtém a ficha do cliente ou cria uma nova caso não exista.
   */
  public static async getOrCreateByClienteId(
    clienteId: string,
    options?: {
      valorParcelaPadrao?: number;
      diaVencimentoPadrao?: number;
      tipoCiclo?: 'MENSAL_PAGAMENTO' | 'QUINZENAL_VALE';
      diaValeSecundario?: number;
      client?: any;
    }
  ): Promise<FichaCrediarioDTO> {
    const db = options?.client || pool;
    const existing = await db.query(
      `SELECT f.*, c.nome as cliente_nome, c.whatsapp as cliente_whatsapp
       FROM fichas_crediario f
       JOIN clientes c ON c.id = f.cliente_id
       WHERE f.cliente_id = $1`,
      [clienteId]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    const valorParcela = options?.valorParcelaPadrao ?? 100.0;
    const diaVencimento = options?.diaVencimentoPadrao ?? 5;
    const tipoCiclo = options?.tipoCiclo ?? 'MENSAL_PAGAMENTO';
    const diaVale = options?.diaValeSecundario ?? null;

    const inserted = await db.query(
      `INSERT INTO fichas_crediario (
        cliente_id, saldo_devedor_total, valor_parcela_padrao, 
        dia_vencimento_padrao, tipo_ciclo, dia_vale_secundario, status_ficha
      )
      VALUES ($1, 0.00, $2, $3, $4, $5, 'ATIVO')
      RETURNING *`,
      [clienteId, valorParcela, diaVencimento, tipoCiclo, diaVale]
    );

    return inserted.rows[0];
  }

  /**
   * Adiciona um débito de nova compra ao dividendo acumulado da ficha.
   * Mantém o valor da parcela acordada, recalculando o cronograma de parcelas futuras.
   */
  public static async adicionarCompraAoDividendo(params: {
    fichaId: string;
    vendaId: string;
    valorFinanciado: number;
    novoValorParcela?: number;
    novoDiaVencimento?: number;
    descricao?: string;
    client?: any;
  }): Promise<{ ficha: FichaCrediarioDTO; parcelasGeradas: number }> {
    const isExternalClient = Boolean(params.client);
    const client = params.client || (await pool.connect());

    try {
      if (!isExternalClient) {
        await client.query('BEGIN');
      }

      const fichaRes = await client.query(
        'SELECT * FROM fichas_crediario WHERE id = $1 FOR UPDATE',
        [params.fichaId]
      );

      if (fichaRes.rows.length === 0) {
        throw new AppError('Ficha de crediário não encontrada.', 404, 'FICHA_NOT_FOUND');
      }

      const fichaAtual = fichaRes.rows[0];
      const saldoAnterior = Number(fichaAtual.saldo_devedor_total);
      const novoSaldo = saldoAnterior + Number(params.valorFinanciado);
      const valorParcela = params.novoValorParcela ?? Number(fichaAtual.valor_parcela_padrao);
      const diaVencimento =
        params.novoDiaVencimento && params.novoDiaVencimento >= 1 && params.novoDiaVencimento <= 31
          ? Math.trunc(params.novoDiaVencimento)
          : Number(fichaAtual.dia_vencimento_padrao) || 5;

      // 1. Atualiza o saldo total, o valor da parcela e o dia de vencimento se renegociado
      const updatedFichaRes = await client.query(
        `UPDATE fichas_crediario
         SET saldo_devedor_total = $1,
             valor_parcela_padrao = $2,
             dia_vencimento_padrao = $3,
             status_ficha = 'ATIVO',
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [novoSaldo, valorParcela, diaVencimento, params.fichaId]
      );

      // 2. Registra a movimentação no extrato
      await client.query(
        `INSERT INTO movimentacoes_ficha (
          ficha_id, cliente_id, venda_id, tipo_movimentacao, valor,
          saldo_anterior, saldo_posterior, descricao, data_movimentacao,
          forma_pagamento, numero_parcela_ref, observacoes
        )
        VALUES ($1, $2, $3, 'DEBITO_COMPRA', $4, $5, $6, $7, CURRENT_DATE, 'CREDIARIO', NULL, $8)`,
        [
          params.fichaId,
          fichaAtual.cliente_id,
          params.vendaId || null,
          params.valorFinanciado,
          saldoAnterior,
          novoSaldo,
          params.descricao || 'Nova compra lançada no crediário',
          null,
        ]
      );

      // 3. Recalcula e sincroniza as parcelas pendentes com base no saldo e dia de vencimento escolhido
      const parcelasGeradas = await this.sincronizarParcelas(
        client,
        params.fichaId,
        novoSaldo,
        valorParcela,
        diaVencimento
      );

      if (!isExternalClient) {
        await client.query('COMMIT');
      }

      return { ficha: updatedFichaRes.rows[0], parcelasGeradas };
    } catch (error) {
      if (!isExternalClient) {
        await client.query('ROLLBACK');
      }
      throw error;
    } finally {
      if (!isExternalClient) {
        client.release();
      }
    }
  }

  /**
   * Registra o pagamento / amortização de valor na ficha do cliente.
   */
  public static async registrarPagamento(params: {
    fichaId: string;
    valorPago: number;
    dataPagamento?: string;
    descricao?: string;
    formaPagamento?: string;
    vendaId?: string;
    numeroParcelaRef?: string;
    observacoes?: string;
  }): Promise<{ ficha: FichaCrediarioDTO; saldoRestante: number; recibo: string }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const fichaRes = await client.query<FichaCrediarioDTO>(
        `SELECT f.*, c.nome as cliente_nome, c.whatsapp as cliente_whatsapp
         FROM fichas_crediario f
         JOIN clientes c ON c.id = f.cliente_id
         WHERE f.id = $1 FOR UPDATE`,
        [params.fichaId]
      );

      if (fichaRes.rows.length === 0) {
        throw new AppError('Ficha de crediário não encontrada.', 404, 'FICHA_NOT_FOUND');
      }

      const ficha = fichaRes.rows[0];
      const saldoAnterior = Number(ficha.saldo_devedor_total);
      const valorAbatido = Math.min(Number(params.valorPago), saldoAnterior);
      const saldoPosterior = Math.max(0, saldoAnterior - valorAbatido);
      const novoStatus = saldoPosterior === 0 ? 'QUITADO' : 'ATIVO';

      const dataPagamentoISO = params.dataPagamento
        ? new Date(params.dataPagamento.includes('T') ? params.dataPagamento : `${params.dataPagamento}T12:00:00Z`).toISOString()
        : null;
      const dataMovimentacaoStr = dataPagamentoISO ? dataPagamentoISO.split('T')[0] : null;

      // 1. Atualiza ficha
      const updatedFicha = await client.query<FichaCrediarioDTO>(
        `UPDATE fichas_crediario
         SET saldo_devedor_total = $1,
             status_ficha = $2,
             updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [saldoPosterior, novoStatus, params.fichaId]
      );

      // 2. Registra movimentação de crédito com data e venda se fornecidas
      const descricaoFinal = params.descricao || (params.formaPagamento ? `Pagamento recebido via ${params.formaPagamento}` : 'Pagamento / Amortização recebida');

      await client.query(
        `INSERT INTO movimentacoes_ficha (
          ficha_id, cliente_id, venda_id, tipo_movimentacao, valor,
          saldo_anterior, saldo_posterior, descricao, data_movimentacao,
          forma_pagamento, numero_parcela_ref, observacoes, created_at
        )
        VALUES ($1, $2, $3, 'CREDITO_PAGAMENTO', $4, $5, $6, $7, COALESCE($8::date, CURRENT_DATE), $9, $10, $11, COALESCE($12::timestamptz, NOW()))`,
        [
          params.fichaId,
          ficha.cliente_id,
          params.vendaId || null,
          valorAbatido,
          saldoAnterior,
          saldoPosterior,
          descricaoFinal,
          dataMovimentacaoStr,
          params.formaPagamento || 'OUTRO',
          params.numeroParcelaRef || null,
          params.observacoes || null,
          dataPagamentoISO,
        ]
      );

      // Se informou vendaId específico, atualiza valor_entrada da venda
      if (params.vendaId) {
        await client.query(
          `UPDATE vendas 
           SET valor_entrada = COALESCE(valor_entrada, 0) + $1,
               status_venda = CASE WHEN (COALESCE(valor_entrada, 0) + $1) >= valor_total THEN 'CONCLUIDA' ELSE status_venda END
           WHERE id = $2`,
          [valorAbatido, params.vendaId]
        ).catch(() => {});
      }

      // 3. Dá baixa sequencial nas parcelas em aberto
      let valorRestanteParaAbater = valorAbatido;
      const parcelasAbertas = await client.query<ParcelaDTO>(
        `SELECT * FROM parcelas_crediario
         WHERE ficha_id = $1 AND status IN ('PENDENTE', 'PAGO_PARCIAL', 'ATRASADO')
         ORDER BY data_vencimento ASC`,
        [params.fichaId]
      );

      for (const parcela of parcelasAbertas.rows) {
        if (valorRestanteParaAbater <= 0) break;

        const valorDevidoParcela = Number(parcela.valor_parcela) - Number(parcela.valor_pago);

        if (valorRestanteParaAbater >= valorDevidoParcela) {
          // Quita totalmente esta parcela
          await client.query(
            `UPDATE parcelas_crediario
             SET valor_pago = valor_parcela,
                 data_pagamento = COALESCE($1::date, CURRENT_DATE),
                 status = 'PAGO_TOTAL',
                 updated_at = NOW()
             WHERE id = $2`,
            [dataPagamentoISO, parcela.id]
          );
          valorRestanteParaAbater -= valorDevidoParcela;
        } else {
          // Quita parcialmente
          const novoValorPago = Number(parcela.valor_pago) + valorRestanteParaAbater;
          await client.query(
            `UPDATE parcelas_crediario
             SET valor_pago = $1,
                 data_pagamento = COALESCE($2::date, CURRENT_DATE),
                 status = 'PAGO_PARCIAL',
                 updated_at = NOW()
             WHERE id = $3`,
            [novoValorPago, dataPagamentoISO, parcela.id]
          );
          valorRestanteParaAbater = 0;
        }
      }

      await client.query('COMMIT');

      const recibo = `Recibo confirmado para ${ficha.cliente_nome}. Valor recebido: R$ ${valorAbatido.toFixed(2)}. Saldo restante na ficha: R$ ${saldoPosterior.toFixed(2)}.`;

      return {
        ficha: updatedFicha.rows[0],
        saldoRestante: saldoPosterior,
        recibo,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Ajusta manualmente o saldo devedor da ficha (correção contábil/renegociação manual).
   */
  public static async ajustarSaldoManual(params: {
    fichaId: string;
    novoSaldo: number;
    motivo: string;
    novoValorParcela?: number;
    novoDiaVencimento?: number;
  }): Promise<{ ficha: FichaCrediarioDTO; parcelasGeradas: number }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const fichaRes = await client.query<FichaCrediarioDTO>(
        'SELECT * FROM fichas_crediario WHERE id = $1 FOR UPDATE',
        [params.fichaId]
      );

      if (fichaRes.rows.length === 0) {
        throw new AppError('Ficha de crediário não encontrada.', 404, 'FICHA_NOT_FOUND');
      }

      const fichaAtual = fichaRes.rows[0];
      const saldoAnterior = Number(fichaAtual.saldo_devedor_total);
      const novoSaldo = Math.max(0, Number(params.novoSaldo));
      const valorParcela = params.novoValorParcela ?? Number(fichaAtual.valor_parcela_padrao);
      const diaVencimento = params.novoDiaVencimento ?? Number(fichaAtual.dia_vencimento_padrao);
      const statusFicha = novoSaldo === 0 ? 'QUITADO' : 'ATIVO';

      // 1. Atualiza ficha
      const updatedFichaRes = await client.query<FichaCrediarioDTO>(
        `UPDATE fichas_crediario
         SET saldo_devedor_total = $1,
             valor_parcela_padrao = $2,
             dia_vencimento_padrao = $3,
             status_ficha = $4,
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [novoSaldo, valorParcela, diaVencimento, statusFicha, params.fichaId]
      );

      // 2. Registra a movimentação no extrato para auditoria
      const diferenca = novoSaldo - saldoAnterior;
      const tipoMovimentacao = diferenca >= 0 ? 'AJUSTE_PARCELA' : 'ESTORNO';
      const descricaoAuditoria = `Ajuste manual de saldo: de R$ ${saldoAnterior.toFixed(2)} para R$ ${novoSaldo.toFixed(2)}. Motivo: ${params.motivo || 'Ajuste manual pelo operador'}`;

      await client.query(
        `INSERT INTO movimentacoes_ficha (
          ficha_id, tipo_movimentacao, valor,
          saldo_anterior, saldo_posterior, descricao
        )
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          params.fichaId,
          tipoMovimentacao,
          Math.abs(diferenca),
          saldoAnterior,
          novoSaldo,
          descricaoAuditoria,
        ]
      );

      // 3. Recalcula o cronograma de parcelas
      const parcelasGeradas = await this.sincronizarParcelas(
        client,
        params.fichaId,
        novoSaldo,
        valorParcela,
        diaVencimento
      );

      await client.query('COMMIT');
      return { ficha: updatedFichaRes.rows[0], parcelasGeradas };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Analisa os dados de uma ficha e da cliente para identificar informações
   * incompletas ou inconsistentes (ex: sem WhatsApp, sem endereço, telefone compartilhado
   * ou observações de renegociação/divergência) e extrair as fotos de origem.
   */
  public static diagnosticarAlertasFicha(
    ficha: Partial<FichaCrediarioDTO> & {
      cliente_endereco?: string | null;
      cliente_ponto_referencia?: string | null;
      telefone_compartilhado_com?: string[];
    }
  ): {
    tem_pendencia: boolean;
    alertas: AlertaFichaDTO[];
    arquivos_origem: string[];
    codigo_ficha: string | null;
  } {
    const alertas: AlertaFichaDTO[] = [];
    const obs = String(ficha.observacoes || '');

    // Extrai fotos de origem IMG_XXXX.jpg se estiverem nas observações ou no próprio objeto
    const fotosSet = new Set<string>(Array.isArray(ficha.arquivos_origem) ? ficha.arquivos_origem : []);
    const matchesImg = obs.match(/IMG_\d+(?:\(\d+\))?\.jpg/gi);
    if (matchesImg) {
      matchesImg.forEach((m) => fotosSet.add(m));
    }

    // Extrai código da ficha física (ex: "503 LU", "670 C")
    let codigoFicha: string | null = ficha.codigo_ficha || null;
    if (!codigoFicha) {
      const matchCod = obs.match(/Ficha(?:\s*F[íi]sica)?:\s*([^|]+)/i) || obs.match(/C[óo]digo(?:\s*ficha)?:\s*([^.|]+)/i);
      if (matchCod && matchCod[1]) {
        codigoFicha = matchCod[1].trim();
      }
    }

    // 1. Verifica WhatsApp
    const rawZap = String(ficha.cliente_whatsapp || '').replace(/\D/g, '');
    if (!rawZap || rawZap.length < 10 || rawZap.startsWith('0000')) {
      alertas.push({
        codigo: 'SEM_WHATSAPP',
        titulo: 'Falta WhatsApp',
        detalhe: 'O telefone/WhatsApp estava em branco na ficha de papel. Clique para preencher.',
        severidade: 'alta',
        campo: 'whatsapp',
      });
    }

    // 2. Verifica Endereço
    const rawEnd = String(ficha.cliente_endereco || '').trim();
    if (!rawEnd || rawEnd.length < 4) {
      alertas.push({
        codigo: 'SEM_ENDERECO',
        titulo: 'Sem Endereço',
        detalhe: 'Rua/Bairro não informados na ficha física. Preencha para facilitar entregas e cobranças.',
        severidade: 'media',
        campo: 'endereco',
      });
    }

    // 3. Verifica Telefone Compartilhado / Múltiplas Fichas
    if (ficha.telefone_compartilhado_com && ficha.telefone_compartilhado_com.length > 0) {
      alertas.push({
        codigo: 'TELEFONE_COMPARTILHADO',
        titulo: 'Fone em +1 Ficha',
        detalhe: `Mesmo WhatsApp vinculado a: ${ficha.telefone_compartilhado_com.join(', ')}. Confira se é familiar ou segunda ficha da mesma cliente.`,
        severidade: 'baixa',
        campo: 'whatsapp',
      });
    }

    // 4. Verifica inconsistências de parcela, datas futuras (2027) ou renegociação pendente
    const saldo = Number(ficha.saldo_devedor_total) || 0;
    const parcela = Number(ficha.valor_parcela_padrao) || 0;
    if ((saldo > 0 && parcela <= 0) || /2027|diverg|revisar|ilee?g[íi]vel/i.test(obs)) {
      alertas.push({
        codigo: 'REVISAR_DADOS',
        titulo: 'Revisar Dados',
        detalhe: 'A ficha contém anotação ou data manuscrita que merece conferência visual.',
        severidade: 'media',
        campo: 'observacoes',
      });
    }

    return {
      tem_pendencia: alertas.length > 0,
      alertas,
      arquivos_origem: Array.from(fotosSet),
      codigo_ficha: codigoFicha,
    };
  }

  /**
   * Atualiza rapidamente os dados cadastrais da cliente e os parâmetros da ficha
   * (ideal para completar informações pendentes da digitalização em 1 clique).
   */
  public static async atualizarCadastroRapidoFicha(params: {
    fichaId: string;
    nome?: string;
    whatsapp?: string;
    cpf?: string;
    endereco?: string;
    ponto_referencia?: string;
    limite_credito?: number;
    dia_vencimento_padrao?: number;
    valor_parcela_padrao?: number;
    saldo_devedor_total?: number;
    observacoes?: string;
  }): Promise<FichaCrediarioDTO> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const fichaRes = await client.query<any>(
        `SELECT f.*, c.nome as cliente_nome, c.whatsapp as cliente_whatsapp,
                c.cpf as cliente_cpf, c.endereco as cliente_endereco,
                c.ponto_referencia as cliente_ponto_referencia,
                c.limite_credito as cliente_limite_credito,
                c.observacoes as cliente_observacoes
         FROM fichas_crediario f
         JOIN clientes c ON c.id = f.cliente_id
         WHERE f.id = $1 OR f.cliente_id = $1
         LIMIT 1`,
        [params.fichaId]
      );

      if (fichaRes.rows.length === 0) {
        throw new AppError('Ficha de crediário não encontrada.', 404, 'FICHA_NOT_FOUND');
      }

      const atual = fichaRes.rows[0];

      const novoNome = params.nome !== undefined && params.nome.trim() ? params.nome.trim() : atual.cliente_nome;
      let novoWhatsapp = atual.cliente_whatsapp || '';
      if (params.whatsapp !== undefined) {
        const limpo = params.whatsapp.replace(/\D/g, '');
        if (!limpo) {
          novoWhatsapp = '';
        } else if (limpo.length >= 10 && limpo.length <= 11 && !limpo.startsWith('55')) {
          novoWhatsapp = `55${limpo}`;
        } else {
          novoWhatsapp = limpo;
        }
      }

      const novoCpf = params.cpf !== undefined ? (params.cpf.trim() || null) : (atual.cliente_cpf || null);
      const novoEndereco = params.endereco !== undefined ? (params.endereco.trim() || null) : (atual.cliente_endereco || null);
      const novoPontoRef = params.ponto_referencia !== undefined ? (params.ponto_referencia.trim() || null) : (atual.cliente_ponto_referencia || null);
      const novoLimite = params.limite_credito !== undefined ? Number(params.limite_credito) : Number(atual.cliente_limite_credito || 1000);
      const novasObs = params.observacoes !== undefined ? (params.observacoes.trim() || null) : (atual.observacoes || atual.cliente_observacoes || null);

      await client.query(
        `UPDATE clientes
         SET nome = $1,
             whatsapp = $2,
             cpf = $3,
             endereco = $4,
             ponto_referencia = $5,
             limite_credito = $6,
             observacoes = $7,
             updated_at = NOW()
         WHERE id = $8`,
        [
          novoNome,
          novoWhatsapp,
          novoCpf,
          novoEndereco,
          novoPontoRef,
          novoLimite,
          novasObs,
          atual.cliente_id,
        ]
      );

      const novoDiaVenc = params.dia_vencimento_padrao !== undefined
        ? Math.max(1, Math.min(31, Number(params.dia_vencimento_padrao)))
        : Number(atual.dia_vencimento_padrao || 5);
      const novaParcela = params.valor_parcela_padrao !== undefined
        ? Math.max(1, Number(params.valor_parcela_padrao))
        : Number(atual.valor_parcela_padrao || 100);
      const novoSaldo = params.saldo_devedor_total !== undefined
        ? Math.max(0, Number(params.saldo_devedor_total))
        : Number(atual.saldo_devedor_total || 0);
      const novoStatus = novoSaldo === 0 ? 'QUITADO' : 'ATIVO';

      await client.query(
        `UPDATE fichas_crediario
         SET saldo_devedor_total = $1,
             valor_parcela_padrao = $2,
             dia_vencimento_padrao = $3,
             status_ficha = $4,
             observacoes = $5,
             updated_at = NOW()
         WHERE id = $6`,
        [novoSaldo, novaParcela, novoDiaVenc, novoStatus, novasObs, atual.id]
      );

      await client.query('COMMIT');

      const diag = FichaCrediarioService.diagnosticarAlertasFicha({
        ...atual,
        cliente_nome: novoNome,
        cliente_whatsapp: novoWhatsapp,
        cliente_cpf: novoCpf,
        cliente_endereco: novoEndereco,
        cliente_ponto_referencia: novoPontoRef,
        cliente_limite_credito: novoLimite,
        saldo_devedor_total: novoSaldo,
        valor_parcela_padrao: novaParcela,
        dia_vencimento_padrao: novoDiaVenc,
        status_ficha: novoStatus,
        observacoes: novasObs,
      });

      return {
        ...atual,
        cliente_nome: novoNome,
        cliente_whatsapp: novoWhatsapp,
        cliente_cpf: novoCpf,
        cliente_endereco: novoEndereco,
        cliente_ponto_referencia: novoPontoRef,
        cliente_limite_credito: novoLimite,
        saldo_devedor_total: novoSaldo,
        valor_parcela_padrao: novaParcela,
        dia_vencimento_padrao: novoDiaVenc,
        status_ficha: novoStatus,
        observacoes: novasObs,
        tem_pendencia: diag.tem_pendencia,
        alertas: diag.alertas,
        arquivos_origem: diag.arquivos_origem,
        codigo_ficha: diag.codigo_ficha,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Lista fichas de clientes filtrando por vencimento (dia do pagamento ou dia do vale).
   */
  public static async listFichas(filters?: {
    diaVencimento?: number;
    statusFicha?: string;
    search?: string;
    apenasPendencias?: boolean;
  }): Promise<FichaCrediarioDTO[]> {
    let query = `
      SELECT f.*, c.nome as cliente_nome, c.whatsapp as cliente_whatsapp,
             c.cpf as cliente_cpf, c.endereco as cliente_endereco,
             c.ponto_referencia as cliente_ponto_referencia,
             c.limite_credito as cliente_limite_credito,
             c.observacoes as cliente_observacoes
      FROM fichas_crediario f
      JOIN clientes c ON c.id = f.cliente_id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (filters?.diaVencimento) {
      params.push(filters.diaVencimento);
      query += ` AND (f.dia_vencimento_padrao = $${params.length} OR f.dia_vale_secundario = $${params.length})`;
    }

    if (filters?.statusFicha) {
      params.push(filters.statusFicha);
      query += ` AND f.status_ficha = $${params.length}`;
    }

    if (filters?.search && filters.search.trim().length > 0) {
      params.push(`%${filters.search.trim()}%`);
      query += ` AND (c.nome ILIKE $${params.length} OR c.whatsapp ILIKE $${params.length})`;
    }

    query += ' ORDER BY f.saldo_devedor_total DESC, c.nome ASC';

    const result = await pool.query<any>(query, params);
    const rows = result.rows || [];

    // Mapa de telefones para detectar compartilhamento entre fichas
    const phoneMap = new Map<string, string[]>();
    for (const r of rows) {
      const zap = String(r.cliente_whatsapp || '').replace(/\D/g, '');
      if (zap.length >= 10 && !zap.startsWith('0000')) {
        const list = phoneMap.get(zap) || [];
        list.push(r.cliente_nome || 'Cliente');
        phoneMap.set(zap, list);
      }
    }

    const enriched: FichaCrediarioDTO[] = rows.map((r) => {
      const zap = String(r.cliente_whatsapp || '').replace(/\D/g, '');
      const samePhoneNames = (zap.length >= 10 ? phoneMap.get(zap) || [] : []).filter(
        (n) => n !== (r.cliente_nome || 'Cliente')
      );
      const obsUnificada = r.observacoes || r.cliente_observacoes || null;
      const diag = FichaCrediarioService.diagnosticarAlertasFicha({
        ...r,
        observacoes: obsUnificada,
        telefone_compartilhado_com: samePhoneNames.length > 0 ? samePhoneNames : undefined,
      });

      return {
        ...r,
        observacoes: obsUnificada,
        tem_pendencia: diag.tem_pendencia,
        alertas: diag.alertas,
        arquivos_origem: diag.arquivos_origem,
        codigo_ficha: diag.codigo_ficha,
      };
    });

    if (filters?.apenasPendencias) {
      return enriched.filter((f) => f.tem_pendencia);
    }

    return enriched;
  }

  /**
   * Obtém detalhes completos da ficha: dados, parcelas, extrato e itens comprados.
   */
  public static async getFichaDetalhada(id: string): Promise<{
    ficha: FichaCrediarioDTO;
    parcelas: ParcelaDTO[];
    movimentacoes: MovimentacaoFichaDTO[];
    itens: Array<{
      id: string;
      descricao_item: string;
      quantidade: number;
      preco_unitario: number;
      subtotal: number;
      tipo_item: string;
      data_venda: string;
      status_quitacao: 'QUITADO' | 'PAGO_PARCIAL' | 'PENDENTE';
      valor_pago: number;
      saldo_restante: number;
    }>;
  }> {
    const fichaRes = await pool.query<any>(
      `SELECT f.*, c.nome as cliente_nome, c.whatsapp as cliente_whatsapp,
              c.cpf as cliente_cpf, c.endereco as cliente_endereco,
              c.ponto_referencia as cliente_ponto_referencia,
              c.limite_credito as cliente_limite_credito,
              c.observacoes as cliente_observacoes
       FROM fichas_crediario f
       JOIN clientes c ON c.id = f.cliente_id
       WHERE f.id = $1 OR f.cliente_id = $1
       LIMIT 1`,
      [id]
    );

    if (fichaRes.rows.length === 0) {
      throw new AppError('Ficha de crediário não encontrada.', 404, 'FICHA_NOT_FOUND');
    }

    const rawFicha = fichaRes.rows[0];
    const obsUnificada = rawFicha.observacoes || rawFicha.cliente_observacoes || null;
    const diag = FichaCrediarioService.diagnosticarAlertasFicha({
      ...rawFicha,
      observacoes: obsUnificada,
    });
    const ficha: FichaCrediarioDTO = {
      ...rawFicha,
      observacoes: obsUnificada,
      tem_pendencia: diag.tem_pendencia,
      alertas: diag.alertas,
      arquivos_origem: diag.arquivos_origem,
      codigo_ficha: diag.codigo_ficha,
    };

    const parcelasRes = await pool.query<ParcelaDTO>(
      `SELECT * FROM parcelas_crediario
       WHERE ficha_id = $1
       ORDER BY data_vencimento ASC`,
      [ficha.id]
    );

    const movRes = await pool.query<MovimentacaoFichaDTO>(
      `SELECT * FROM movimentacoes_ficha
       WHERE ficha_id = $1
       ORDER BY COALESCE(data_movimentacao, created_at::date) DESC, created_at DESC`,
      [ficha.id]
    );

    // Busca itens vendidos associados às vendas da cliente
    const itensRes = await pool.query(
      `SELECT iv.id, iv.descricao_item, iv.quantidade, iv.preco_unitario, iv.subtotal, 
              iv.tipo_item, v.created_at as data_venda
       FROM itens_venda iv
       JOIN vendas v ON v.id = iv.venda_id
       WHERE v.cliente_id = $1
       ORDER BY v.created_at ASC`,
      [ficha.cliente_id]
    );

    // Calcula quitação em cascata dos itens para exibição intuitiva
    const saldoTotalAtual = Number(ficha.saldo_devedor_total);
    const totalItens = itensRes.rows.reduce((acc, row) => acc + Number(row.subtotal), 0);
    let totalJaAmortizado = Math.max(0, totalItens - saldoTotalAtual);

    const itensCalculados = itensRes.rows.map((row) => {
      const subtotal = Number(row.subtotal);
      let valorPago = 0;
      let saldoRestante = subtotal;
      let statusQuitacao: 'QUITADO' | 'PAGO_PARCIAL' | 'PENDENTE' = 'PENDENTE';

      if (totalJaAmortizado >= subtotal) {
        valorPago = subtotal;
        saldoRestante = 0;
        statusQuitacao = 'QUITADO';
        totalJaAmortizado -= subtotal;
      } else if (totalJaAmortizado > 0) {
        valorPago = totalJaAmortizado;
        saldoRestante = Number((subtotal - totalJaAmortizado).toFixed(2));
        statusQuitacao = 'PAGO_PARCIAL';
        totalJaAmortizado = 0;
      }

      return {
        id: row.id,
        descricao_item: row.descricao_item,
        quantidade: Number(row.quantidade),
        preco_unitario: Number(row.preco_unitario),
        subtotal,
        tipo_item: row.tipo_item,
        data_venda: row.data_venda,
        status_quitacao: statusQuitacao,
        valor_pago: valorPago,
        saldo_restante: saldoRestante,
      };
    });

    return {
      ficha,
      parcelas: parcelasRes.rows,
      movimentacoes: movRes.rows,
      itens: itensCalculados.reverse(), // Mostra mais recentes primeiro na UI
    };
  }

  /**
   * Permite que a Lucélia adicione manualmente um item de histórico à ficha/carnê
   * (ideal para migração de clientes antigos ou lançamento de produtos anteriores).
   */
  public static async adicionarItemHistoricoManual(params: {
    fichaId: string;
    descricao: string;
    valorTotal: number;
    valorJaPago?: number;
    dataCompra?: string;
    dataPagamento?: string;
    observacoes?: string;
    pagamentosAnteriores?: Array<{
      data?: string;
      valor: number;
      formaPagamento?: string;
      parcelaRef?: string;
    }>;
  }): Promise<{
    vendaId: string;
    itemId: string;
    saldoDevedorAtualizado: number;
    statusQuitacaoItem: string;
  }> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const fichaRes = await client.query(
        `SELECT f.*, c.nome as cliente_nome
         FROM fichas_crediario f
         JOIN clientes c ON c.id = f.cliente_id
         WHERE f.id = $1 OR f.cliente_id = $1
         FOR UPDATE`,
        [params.fichaId]
      );

      if (fichaRes.rows.length === 0) {
        throw new AppError('Ficha de crediário não encontrada.', 404, 'FICHA_NOT_FOUND');
      }

      const ficha = fichaRes.rows[0];
      const valorTotal = Number(params.valorTotal);
      const listaPagtos = (params.pagamentosAnteriores || []).filter((p) => Number(p.valor) > 0);
      const somaListaPagtos = listaPagtos.reduce((acc, p) => acc + Number(p.valor), 0);
      const valorJaPagoBruto = listaPagtos.length > 0 ? somaListaPagtos : (params.valorJaPago ?? 0);
      const valorJaPago = Number(Math.min(valorTotal, valorJaPagoBruto));
      const saldoRestante = Number(Math.max(0, valorTotal - valorJaPago).toFixed(2));
      const statusQuitacao = saldoRestante === 0 ? 'QUITADO' : valorJaPago > 0 ? 'PAGO_PARCIAL' : 'PENDENTE';

      const dataCompraISO = params.dataCompra
        ? new Date(params.dataCompra.includes('T') ? params.dataCompra : `${params.dataCompra}T12:00:00Z`).toISOString()
        : null;
      const dataCompraDateStr = dataCompraISO ? dataCompraISO.split('T')[0] : null;

      const dataPagamentoISO = params.dataPagamento
        ? new Date(params.dataPagamento.includes('T') ? params.dataPagamento : `${params.dataPagamento}T12:00:00Z`).toISOString()
        : dataCompraISO;
      const dataPagtoDateStr = dataPagamentoISO ? dataPagamentoISO.split('T')[0] : null;

      // 1. Cria a venda associada ao histórico
      const vendaRes = await client.query(
        `INSERT INTO vendas (
          cliente_id, tipo_venda, forma_pagamento, valor_total,
          valor_entrada, valor_financiado_ficha, status_venda, observacoes, created_at
        )
        VALUES ($1, 'PRONTA_ENTREGA', 'CREDIARIO', $2, $3, $4, 'CONCLUIDA', $5, COALESCE($6::timestamptz, NOW()))
        RETURNING id`,
        [
          ficha.cliente_id,
          valorTotal,
          valorJaPago,
          saldoRestante,
          params.observacoes || 'Histórico anterior do carnê/ficha física',
          dataCompraISO,
        ]
      );

      const vendaId = vendaRes.rows[0].id;

      // 2. Cria o item da venda
      const itemRes = await client.query(
        `INSERT INTO itens_venda (
          venda_id, descricao_item, quantidade, preco_unitario, tipo_item, created_at
        )
        VALUES ($1, $2, 1, $3, 'ESTOQUE_LOCAL', COALESCE($4::timestamptz, NOW()))
        RETURNING id`,
        [
          vendaId,
          params.descricao,
          valorTotal,
          dataCompraISO,
        ]
      );

      const itemId = itemRes.rows[0].id;

      const saldoInicialFicha = Number(ficha.saldo_devedor_total);
      let saldoCorrenteExtrato = Number((saldoInicialFicha + valorTotal).toFixed(2));

      // Registra a compra original no extrato com o valor total do objeto da ficha
      await client.query(
        `INSERT INTO movimentacoes_ficha (
          ficha_id, cliente_id, venda_id, tipo_movimentacao, valor,
          saldo_anterior, saldo_posterior, descricao, data_movimentacao,
          forma_pagamento, numero_parcela_ref, observacoes, created_at
        )
        VALUES ($1, $2, $3, 'DEBITO_COMPRA', $4, $5, $6, $7, COALESCE($8::date, CURRENT_DATE), 'CREDIARIO', NULL, $9, COALESCE($10::timestamptz, NOW()))`,
        [
          ficha.id,
          ficha.cliente_id,
          vendaId,
          valorTotal,
          saldoInicialFicha,
          saldoCorrenteExtrato,
          `Compra na ficha física: ${params.descricao}`,
          dataCompraDateStr,
          params.observacoes || null,
          dataCompraISO,
        ]
      );

      // Se a usuária informou pagamentos detalhados linha a linha (DATA | PAGO), registra cada um individualmente
      if (listaPagtos.length > 0) {
        for (let idx = 0; idx < listaPagtos.length; idx++) {
          const pag = listaPagtos[idx];
          const valPag = Math.min(Number(pag.valor), saldoCorrenteExtrato);
          if (valPag <= 0) continue;

          const saldoAntPag = saldoCorrenteExtrato;
          saldoCorrenteExtrato = Number(Math.max(0, saldoCorrenteExtrato - valPag).toFixed(2));
          const dtPagISO = pag.data
            ? new Date(pag.data.includes('T') ? pag.data : `${pag.data}T12:00:00Z`).toISOString()
            : dataPagamentoISO;
          const dtPagDate = dtPagISO ? dtPagISO.split('T')[0] : null;
          const refParcela = pag.parcelaRef || `Parcela ${String(idx + 1).padStart(2, '0')}`;

          await client.query(
            `INSERT INTO movimentacoes_ficha (
              ficha_id, cliente_id, venda_id, tipo_movimentacao, valor,
              saldo_anterior, saldo_posterior, descricao, data_movimentacao,
              forma_pagamento, numero_parcela_ref, observacoes, created_at
            )
            VALUES ($1, $2, $3, 'CREDITO_PAGAMENTO', $4, $5, $6, $7, COALESCE($8::date, CURRENT_DATE), $9, $10, $11, COALESCE($12::timestamptz, NOW()))`,
            [
              ficha.id,
              ficha.cliente_id,
              vendaId,
              valPag,
              saldoAntPag,
              saldoCorrenteExtrato,
              `Pagamento anotado na ficha: ${params.descricao}`,
              dtPagDate,
              pag.formaPagamento || 'DINHEIRO',
              refParcela,
              params.observacoes || null,
              dtPagISO,
            ]
          );
        }
      } else if (valorJaPago > 0) {
        // Caso tenha informado apenas o valor total já pago de uma vez
        const saldoAntPag = saldoCorrenteExtrato;
        saldoCorrenteExtrato = Number(Math.max(0, saldoCorrenteExtrato - valorJaPago).toFixed(2));

        await client.query(
          `INSERT INTO movimentacoes_ficha (
            ficha_id, cliente_id, venda_id, tipo_movimentacao, valor,
            saldo_anterior, saldo_posterior, descricao, data_movimentacao,
            forma_pagamento, numero_parcela_ref, observacoes, created_at
          )
          VALUES ($1, $2, $3, 'CREDITO_PAGAMENTO', $4, $5, $6, $7, COALESCE($8::date, CURRENT_DATE), 'DINHEIRO', 'Abatimento Ficha Física', $9, COALESCE($10::timestamptz, NOW()))`,
          [
            ficha.id,
            ficha.cliente_id,
            vendaId,
            valorJaPago,
            saldoAntPag,
            saldoCorrenteExtrato,
            `Pagamento prévio registrado no caderno: ${params.descricao} (Valor: R$ ${valorJaPago.toFixed(2)})`,
            dataPagtoDateStr,
            params.observacoes || null,
            dataPagamentoISO,
          ]
        );
      }

      const novoSaldoDevedor = Number((saldoInicialFicha + saldoRestante).toFixed(2));

      // 3. Se ainda restar saldo a pagar, incrementa o saldo devedor da ficha
      if (saldoRestante > 0) {
        await client.query(
          `UPDATE fichas_crediario
           SET saldo_devedor_total = $1, status_ficha = 'ATIVO', updated_at = NOW()
           WHERE id = $2`,
          [novoSaldoDevedor, ficha.id]
        );

        // Sincroniza cronograma de parcelas futuras
        await FichaCrediarioService.sincronizarParcelas(
          client,
          ficha.id,
          novoSaldoDevedor,
          Number(ficha.valor_parcela_padrao),
          Number(ficha.dia_vencimento_padrao)
        );
      }

      await client.query('COMMIT');

      return {
        vendaId,
        itemId,
        saldoDevedorAtualizado: novoSaldoDevedor,
        statusQuitacaoItem: statusQuitacao,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Calcula a data de vencimento mensal no formato YYYY-MM-DD para qualquer dia escolhido (1 a 31),
   * ajustando automaticamente para o último dia do mês em meses com 28, 29 ou 30 dias.
   */
  public static calcularDataVencimentoMensal(
    ano: number,
    mesZeroBased: number,
    diaEscolhido: number
  ): string {
    const diaLimpo = Math.max(1, Math.min(31, Math.trunc(diaEscolhido || 5)));
    const dataBaseMes = new Date(Date.UTC(ano, mesZeroBased, 1));
    const anoReal = dataBaseMes.getUTCFullYear();
    const mesReal = dataBaseMes.getUTCMonth();
    const ultimoDiaMes = new Date(Date.UTC(anoReal, mesReal + 1, 0)).getUTCDate();
    const diaReal = Math.min(diaLimpo, ultimoDiaMes);
    return `${anoReal}-${String(mesReal + 1).padStart(2, '0')}-${String(diaReal).padStart(2, '0')}`;
  }

  /**
   * Helper interno para gerar ou ajustar o cronograma de parcelas com base no saldo devedor.
   */
  private static async sincronizarParcelas(
    client: any,
    fichaId: string,
    saldoDevedorTotal: number,
    valorParcelaPadrao: number,
    diaVencimentoPadrao: number
  ): Promise<number> {
    // Remove parcelas pendentes futuras não pagas para reconstruir o cronograma limpo
    await client.query(
      `DELETE FROM parcelas_crediario
       WHERE ficha_id = $1 AND status = 'PENDENTE' AND valor_pago = 0`,
      [fichaId]
    );

    if (saldoDevedorTotal <= 0) {
      return 0;
    }

    const qtdParcelas = Math.ceil(saldoDevedorTotal / valorParcelaPadrao);
    const hoje = new Date();
    let parcelasCriadas = 0;

    for (let i = 1; i <= qtdParcelas; i++) {
      const dataVencStr = this.calcularDataVencimentoMensal(
        hoje.getFullYear(),
        hoje.getMonth() + i,
        diaVencimentoPadrao
      );
      const valorDestaParcela =
        i === qtdParcelas
          ? saldoDevedorTotal - (qtdParcelas - 1) * valorParcelaPadrao
          : valorParcelaPadrao;

      await client.query(
        `INSERT INTO parcelas_crediario (
          ficha_id, numero_parcela, valor_parcela, data_vencimento, status
        )
        VALUES ($1, $2, $3, $4, 'PENDENTE')`,
        [fichaId, i, valorDestaParcela, dataVencStr]
      );
      parcelasCriadas++;
    }

    return parcelasCriadas;
  }
}
