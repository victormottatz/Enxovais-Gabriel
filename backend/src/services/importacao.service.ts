import { pool } from '../config/database.js';
import { WhatsAppService } from './whatsapp.service.js';
import { AppError } from '../middlewares/error.middleware.js';

export interface LinhaFichaImportacao {
  nome: string;
  whatsapp: string;
  cpf?: string;
  endereco?: string;
  ponto_referencia?: string;
  valor_total_compra?: string;
  limite_credito?: number;
  dia_vencimento: number;
  tipo_ciclo: 'MENSAL_PAGAMENTO' | 'QUINZENAL_VALE';
  dia_vale_secundario?: number;
  saldo_devedor_atual: number;
  valor_parcela: number;
  observacoes?: string;
  produtos?: string;
  data_venda?: string;
  pagamento_parcelas?: string;
}

export interface ItemValidado {
  linha: number;
  valido: boolean;
  dados: LinhaFichaImportacao;
  erros: string[];
}

export interface ResultadoValidacao {
  total: number;
  validos: number;
  comErros: number;
  itens: ItemValidado[];
}

export interface LinhaHistoricoPagamentoImportacao {
  whatsapp: string;
  nome?: string;
  tipo: 'PAGAMENTO' | 'COMPRA_A_PRAZO' | 'AMORTIZACAO';
  data: string;
  valor: number;
  forma_pagamento?: string;
  parcela_ref?: string;
  descricao?: string;
  observacoes?: string;
}

export interface ItemHistoricoValidado {
  linha: number;
  valido: boolean;
  dados: LinhaHistoricoPagamentoImportacao;
  erros: string[];
}

export interface ResultadoValidacaoHistorico {
  total: number;
  validos: number;
  comErros: number;
  itens: ItemHistoricoValidado[];
}

export class ImportacaoService {
  /**
   * Divide uma linha CSV em colunas respeitando aspas duplas (para evitar quebras em ';' dentro do texto).
   */
  private static parseLinhaCSV(linha: string, separador: string): string[] {
    const resultado: string[] = [];
    let atual = '';
    let dentroDeAspas = false;

    for (let i = 0; i < linha.length; i++) {
      const char = linha[i];

      if (char === '"') {
        if (dentroDeAspas && linha[i + 1] === '"') {
          atual += '"';
          i++; // Pula escape de aspas
        } else {
          dentroDeAspas = !dentroDeAspas;
        }
      } else if (char === separador && !dentroDeAspas) {
        resultado.push(atual.trim());
        atual = '';
      } else {
        atual += char;
      }
    }
    resultado.push(atual.trim());
    return resultado.map((c) => c.replace(/^["']|["']$/g, '').trim());
  }

  /**
   * Normaliza o nome da coluna para identificação flexível.
   */
  private static normalizarNomeColuna(coluna: string): string {
    return coluna
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /**
   * Processa o texto CSV (separado por ponto e vírgula ou vírgula) e valida cada linha.
   */
  public static processarCSV(csvText: string): ResultadoValidacao {
    const linhas = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (linhas.length <= 1) {
      throw new AppError('O arquivo CSV está vazio ou contém apenas o cabeçalho', 400);
    }

    const primeiraLinha = linhas[0];
    const separador = primeiraLinha.includes(';') ? ';' : ',';

    const colunasBrutas = ImportacaoService.parseLinhaCSV(primeiraLinha, separador);
    const colunasNormalizadas = colunasBrutas.map((c) => ImportacaoService.normalizarNomeColuna(c));

    const findCol = (...aliases: string[]): number => {
      for (const alias of aliases) {
        const norm = ImportacaoService.normalizarNomeColuna(alias);
        const idx = colunasNormalizadas.indexOf(norm);
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const idxNome = findCol('nome', 'cliente');
    const idxWhatsapp = findCol('whatsapp', 'telefone', 'celular', 'tel');
    const idxCpf = findCol('cpf');
    const idxEndereco = findCol('endereco', 'endereço');
    const idxPontoRef = findCol('ponto_referencia', 'ponto de referencia', 'pontoreferencia', 'referencia');
    const idxValorTotalCompra = findCol('valor total da compra', 'valor_total_da_compra', 'valortotaldacompra', 'valor_compra', 'total_compra');
    const idxLimite = findCol('limite_credito', 'limite', 'limitecredito');
    const idxVencimento = findCol('dia_vencimento', 'vencimento', 'dia');
    const idxCiclo = findCol('tipo_ciclo', 'ciclo');
    const idxVale = findCol('dia_vale_secundario', 'dia_vale', 'diavale');
    const idxSaldo = findCol('saldo_devedor_atual', 'saldo_devedor', 'saldodevedor', 'saldo');
    const idxParcela = findCol('valor_parcela', 'parcela', 'valorparcela');
    const idxObs = findCol('observacoes', 'observações', 'observacao', 'observação', 'obs');
    const idxProdutos = findCol('produtos', 'produto', 'itens');
    const idxDataVenda = findCol('data da venda', 'data_da_venda', 'datadenda', 'data_venda', 'data');
    const idxPagamentoParcelas = findCol('pagamento de parcelas', 'pagamento_de_parcelas', 'pagamento_parcelas', 'pagamentos', 'pagamento');

    if (idxNome === -1 || idxWhatsapp === -1) {
      throw new AppError(
        'Colunas obrigatórias "nome" e "whatsapp" não foram encontradas no cabeçalho do CSV',
        400
      );
    }

    const parseValor = (val?: string): number => {
      if (!val) return 0;
      const limpo = val.trim().replace('R$', '').replace(/\s/g, '');
      if (limpo.includes(',') && limpo.includes('.')) {
        return parseFloat(limpo.replace(/\./g, '').replace(',', '.'));
      }
      if (limpo.includes('.') && !limpo.includes(',')) {
        // Ex: "2.000" como milhar ou decimal
        const partes = limpo.split('.');
        if (partes.length === 2 && partes[1].length === 3) {
          return parseFloat(partes[0] + partes[1]);
        }
      }
      const num = parseFloat(limpo.replace(',', '.'));
      return isNaN(num) ? 0 : num;
    };

    const itensValidados: ItemValidado[] = [];

    for (let i = 1; i < linhas.length; i++) {
      const linhaBruta = linhas[i].trim();
      if (!linhaBruta) continue;

      const campos = ImportacaoService.parseLinhaCSV(linhaBruta, separador);
      const temConteudo = campos.some((c) => c && c.length > 0);
      if (!temConteudo) continue;

      const erros: string[] = [];

      const nome = idxNome !== -1 && campos[idxNome] ? campos[idxNome].trim() : '';
      const rawWhatsapp = idxWhatsapp !== -1 && campos[idxWhatsapp] ? campos[idxWhatsapp].trim() : '';
      const cpf = idxCpf !== -1 && campos[idxCpf] ? campos[idxCpf].trim() : undefined;
      const endereco = idxEndereco !== -1 && campos[idxEndereco] ? campos[idxEndereco].trim() : undefined;
      const ponto_referencia = idxPontoRef !== -1 && campos[idxPontoRef] ? campos[idxPontoRef].trim() : undefined;
      const valor_total_compra = idxValorTotalCompra !== -1 && campos[idxValorTotalCompra] ? campos[idxValorTotalCompra].trim() : undefined;
      const limite_credito = idxLimite !== -1 && campos[idxLimite] ? parseValor(campos[idxLimite]) : 1000.0;
      
      let rawVencimento = idxVencimento !== -1 && campos[idxVencimento] ? parseInt(campos[idxVencimento], 10) : NaN;
      const rawCiclo = idxCiclo !== -1 && campos[idxCiclo] ? campos[idxCiclo].trim() : '';
      
      // Tolerância: Se dia_vencimento estiver em branco mas tipo_ciclo contiver "dia 10", extrai o dia
      if (isNaN(rawVencimento) && rawCiclo) {
        const matchDia = rawCiclo.match(/dia\s*(\d{1,2})/i);
        if (matchDia && matchDia[1]) {
          rawVencimento = parseInt(matchDia[1], 10);
        }
      }

      const rawVale = idxVale !== -1 && campos[idxVale] ? parseInt(campos[idxVale], 10) : undefined;
      const saldo_devedor_atual = idxSaldo !== -1 && campos[idxSaldo] ? parseValor(campos[idxSaldo]) : 0.0;
      const valor_parcela = idxParcela !== -1 && campos[idxParcela] ? parseValor(campos[idxParcela]) : 100.0;
      const observacoes = idxObs !== -1 && campos[idxObs] ? campos[idxObs].trim() : undefined;
      const produtos = idxProdutos !== -1 && campos[idxProdutos] ? campos[idxProdutos].trim() : undefined;
      const data_venda = idxDataVenda !== -1 && campos[idxDataVenda] ? campos[idxDataVenda].trim() : undefined;
      const pagamento_parcelas = idxPagamentoParcelas !== -1 && campos[idxPagamentoParcelas] ? campos[idxPagamentoParcelas].trim() : undefined;

      // Validações essenciais
      if (!nome || nome.length < 2) {
        erros.push('Nome da cliente é obrigatório e deve ter no mínimo 2 letras');
      }

      let whatsappFormatado = '';
      if (!rawWhatsapp) {
        erros.push('WhatsApp é obrigatório');
      } else {
        try {
          whatsappFormatado = WhatsAppService.sanitizePhone(rawWhatsapp);
          if (whatsappFormatado.length < 12) {
            erros.push('WhatsApp deve conter DDD e número com 9 dígitos');
          }
        } catch {
          erros.push('Formato de WhatsApp inválido');
        }
      }

      const diaVencimento = isNaN(rawVencimento) || rawVencimento < 1 || rawVencimento > 31 ? 5 : rawVencimento;
      const tipoCiclo = rawCiclo.toUpperCase().includes('QUINZENAL') || rawCiclo.toUpperCase().includes('VALE')
        ? 'QUINZENAL_VALE'
        : 'MENSAL_PAGAMENTO';
      const valorParcelaFinal = isNaN(valor_parcela) || valor_parcela <= 0 ? 100.0 : valor_parcela;
      const saldoFinal = isNaN(saldo_devedor_atual) || saldo_devedor_atual < 0 ? 0.0 : saldo_devedor_atual;

      itensValidados.push({
        linha: i + 1,
        valido: erros.length === 0,
        erros,
        dados: {
          nome,
          whatsapp: whatsappFormatado || rawWhatsapp,
          cpf,
          endereco,
          ponto_referencia,
          valor_total_compra,
          limite_credito: isNaN(limite_credito) ? 1000.0 : limite_credito,
          dia_vencimento: diaVencimento,
          tipo_ciclo: tipoCiclo,
          dia_vale_secundario: rawVale && !isNaN(rawVale) ? rawVale : undefined,
          saldo_devedor_atual: saldoFinal,
          valor_parcela: valorParcelaFinal,
          observacoes,
          produtos,
          data_venda,
          pagamento_parcelas,
        },
      });
    }

    const validos = itensValidados.filter((it) => it.valido).length;

    return {
      total: itensValidados.length,
      validos,
      comErros: itensValidados.length - validos,
      itens: itensValidados,
    };
  }

  /**
   * Executa a gravação atômica em lote no banco de dados para os itens válidos.
   */
  public static async executarImportacao(itens: LinhaFichaImportacao[]): Promise<{
    importados: number;
    detalhes: { cliente_id: string; nome: string; saldo: number }[];
  }> {
    if (!itens || itens.length === 0) {
      throw new AppError('Nenhum item válido para importar', 400);
    }

    const client = await pool.connect();
    const resultados: { cliente_id: string; nome: string; saldo: number }[] = [];

    try {
      await client.query('BEGIN');

      for (const item of itens) {
        const whatsappLimpo = WhatsAppService.sanitizePhone(item.whatsapp);

        // Concatena anotações ricas preservando histórico da mãe
        const notasComplementares: string[] = [];
        if (item.observacoes) notasComplementares.push(item.observacoes);
        if (item.produtos) notasComplementares.push(`Produtos: ${item.produtos}`);
        if (item.valor_total_compra) notasComplementares.push(`Total Compra: ${item.valor_total_compra}`);
        if (item.data_venda) notasComplementares.push(`Data Compra: ${item.data_venda}`);
        if (item.pagamento_parcelas) notasComplementares.push(`Histórico Pgto: ${item.pagamento_parcelas}`);

        const observacoesConsolidadas = notasComplementares.join(' | ') || null;

        // 1. Cria ou atualiza cliente pelo WhatsApp de forma resiliente
        let clienteId: string;
        let clienteNome = item.nome.trim();

        const cliExist = await client.query('SELECT id, nome FROM clientes WHERE whatsapp = $1 LIMIT 1', [whatsappLimpo]);
        if (cliExist.rows && cliExist.rows.length > 0) {
          clienteId = cliExist.rows[0].id;
          clienteNome = cliExist.rows[0].nome || item.nome.trim();
          await client.query(
            `UPDATE clientes
             SET nome = $1,
                 cpf = COALESCE($2, cpf),
                 endereco = COALESCE($3, endereco),
                 ponto_referencia = COALESCE($4, ponto_referencia),
                 observacoes = COALESCE($5, observacoes),
                 limite_credito = $6,
                 updated_at = NOW()
             WHERE id = $7`,
            [
              item.nome.trim(),
              item.cpf?.trim() || null,
              item.endereco?.trim() || null,
              item.ponto_referencia?.trim() || null,
              observacoesConsolidadas,
              item.limite_credito ?? 1000.0,
              clienteId,
            ]
          );
        } else {
          const cliInsert = await client.query(
            `INSERT INTO clientes (nome, whatsapp, cpf, endereco, ponto_referencia, limite_credito, observacoes)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, nome`,
            [
              item.nome.trim(),
              whatsappLimpo,
              item.cpf?.trim() || null,
              item.endereco?.trim() || null,
              item.ponto_referencia?.trim() || null,
              item.limite_credito ?? 1000.0,
              observacoesConsolidadas,
            ]
          );
          clienteId = cliInsert.rows[0].id;
          clienteNome = cliInsert.rows[0].nome;
        }

        // 2. Cria ou atualiza Ficha de Crediário de forma resiliente
        let fichaId: string;
        const fichaExist = await client.query('SELECT id FROM fichas_crediario WHERE cliente_id = $1 LIMIT 1', [clienteId]);
        if (fichaExist.rows && fichaExist.rows.length > 0) {
          fichaId = fichaExist.rows[0].id;
          await client.query(
            `UPDATE fichas_crediario
             SET saldo_devedor_total = $1,
                 valor_parcela_padrao = $2,
                 dia_vencimento_padrao = $3,
                 tipo_ciclo = $4,
                 dia_vale_secundario = $5,
                 observacoes = COALESCE($6, observacoes),
                 updated_at = NOW()
             WHERE id = $7`,
            [
              item.saldo_devedor_atual,
              item.valor_parcela,
              item.dia_vencimento,
              item.tipo_ciclo,
              item.dia_vale_secundario || null,
              observacoesConsolidadas,
              fichaId,
            ]
          );
        } else {
          const fichaInsert = await client.query(
            `INSERT INTO fichas_crediario (
               cliente_id, saldo_devedor_total, valor_parcela_padrao, 
               dia_vencimento_padrao, tipo_ciclo, dia_vale_secundario, status_ficha, observacoes
             )
             VALUES ($1, $2, $3, $4, $5, $6, 'ATIVO', $7)
             RETURNING id`,
            [
              clienteId,
              item.saldo_devedor_atual,
              item.valor_parcela,
              item.dia_vencimento,
              item.tipo_ciclo,
              item.dia_vale_secundario || null,
              observacoesConsolidadas,
            ]
          );
          fichaId = fichaInsert.rows[0].id;
        }

        // 3. Se houver saldo devedor inicial, cria a movimentação de histórico detalhada
        if (item.saldo_devedor_atual > 0) {
          const descProdutos = item.produtos ? ` - Itens: ${item.produtos}` : '';
          const descData = item.data_venda ? ` (Venda em ${item.data_venda})` : '';
          const descricaoMovimentacao = `Saldo Inicial de Migração${descProdutos}${descData}`;

          await client.query(
            `INSERT INTO movimentacoes_ficha (
               ficha_id, tipo_movimentacao, valor, saldo_anterior, saldo_posterior, descricao
             )
             VALUES ($1, 'DEBITO_COMPRA', $2, 0.00, $2, $3)`,
            [fichaId, item.saldo_devedor_atual, descricaoMovimentacao]
          );

          // Gera a primeira parcela com base no dia do vencimento
          const hoje = new Date();
          let mesVencimento = hoje.getMonth();
          let anoVencimento = hoje.getFullYear();

          if (hoje.getDate() > item.dia_vencimento) {
            mesVencimento += 1;
            if (mesVencimento > 11) {
              mesVencimento = 0;
              anoVencimento += 1;
            }
          }

          const dataVenc = new Date(anoVencimento, mesVencimento, item.dia_vencimento);
          const dataVencStr = dataVenc.toISOString().split('T')[0];

          await client.query(
            `INSERT INTO parcelas_crediario (
               ficha_id, numero_parcela, valor_parcela, data_vencimento, status
             )
             VALUES ($1, 1, $2, $3, 'PENDENTE')`,
            [fichaId, Math.min(item.valor_parcela, item.saldo_devedor_atual), dataVencStr]
          );
        }

        resultados.push({
          cliente_id: clienteId,
          nome: clienteNome,
          saldo: item.saldo_devedor_atual,
        });
      }

      await client.query('COMMIT');
      return {
        importados: resultados.length,
        detalhes: resultados,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Processa o texto CSV de histórico de pagamentos e amortizações anteriores.
   */
  public static processarCSVHistorico(csvText: string): ResultadoValidacaoHistorico {
    const linhas = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (linhas.length <= 1) {
      throw new AppError('O arquivo CSV está vazio ou contém apenas o cabeçalho', 400);
    }

    const primeiraLinha = linhas[0];
    const separador = primeiraLinha.includes(';') ? ';' : ',';

    const colunasBrutas = ImportacaoService.parseLinhaCSV(primeiraLinha, separador);
    const colunasNormalizadas = colunasBrutas.map((c) => ImportacaoService.normalizarNomeColuna(c));

    const findCol = (...aliases: string[]): number => {
      for (const alias of aliases) {
        const norm = ImportacaoService.normalizarNomeColuna(alias);
        const idx = colunasNormalizadas.indexOf(norm);
        if (idx !== -1) return idx;
      }
      return -1;
    };

    const idxWhatsapp = findCol('whatsapp', 'telefone', 'celular', 'tel', 'fone');
    const idxNome = findCol('nome', 'cliente');
    const idxTipo = findCol('tipo', 'operacao', 'movimentacao', 'natureza');
    const idxData = findCol('data', 'data_pagamento', 'data_compra', 'data_venda', 'dia');
    const idxValor = findCol('valor', 'valor_pago', 'total', 'preco', 'quantia');
    const idxForma = findCol('forma_pagamento', 'forma', 'metodo', 'meio', 'meio_pagamento');
    const idxParcela = findCol('parcela_ref', 'parcela', 'referencia', 'num_parcela', 'numero_parcela');
    const idxDesc = findCol('descricao', 'produto', 'itens', 'historico', 'detalhes');
    const idxObs = findCol('observacoes', 'observações', 'observacao', 'observação', 'obs', 'notas');

    if (idxWhatsapp === -1) {
      throw new AppError('Coluna obrigatória "whatsapp" não foi encontrada no cabeçalho do CSV', 400);
    }

    const parseValor = (val?: string): number => {
      if (!val) return 0;
      const limpo = val.trim().replace('R$', '').replace(/\s/g, '');
      if (limpo.includes(',') && limpo.includes('.')) {
        return parseFloat(limpo.replace(/\./g, '').replace(',', '.'));
      }
      if (limpo.includes('.') && !limpo.includes(',')) {
        const partes = limpo.split('.');
        if (partes.length === 2 && partes[1].length === 3) {
          return parseFloat(partes[0] + partes[1]);
        }
      }
      const num = parseFloat(limpo.replace(',', '.'));
      return isNaN(num) ? 0 : num;
    };

    const normalizarData = (val?: string): string => {
      if (!val) return new Date().toISOString().split('T')[0];
      const limpo = val.trim();
      const matchBR = limpo.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (matchBR) {
        const dia = matchBR[1].padStart(2, '0');
        const mes = matchBR[2].padStart(2, '0');
        let ano = matchBR[3];
        if (ano.length === 2) ano = `20${ano}`;
        return `${ano}-${mes}-${dia}`;
      }
      const matchISO = limpo.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
      if (matchISO) {
        return `${matchISO[1]}-${matchISO[2].padStart(2, '0')}-${matchISO[3].padStart(2, '0')}`;
      }
      return limpo;
    };

    const itensValidados: ItemHistoricoValidado[] = [];

    for (let i = 1; i < linhas.length; i++) {
      const linhaBruta = linhas[i].trim();
      if (!linhaBruta) continue;

      const campos = ImportacaoService.parseLinhaCSV(linhaBruta, separador);
      const temConteudo = campos.some((c) => c && c.length > 0);
      if (!temConteudo) continue;

      const erros: string[] = [];

      const rawWhatsapp = idxWhatsapp !== -1 && campos[idxWhatsapp] ? campos[idxWhatsapp].trim() : '';
      const nome = idxNome !== -1 && campos[idxNome] ? campos[idxNome].trim() : undefined;
      const rawTipo = idxTipo !== -1 && campos[idxTipo] ? campos[idxTipo].trim().toUpperCase() : 'PAGAMENTO';
      const rawData = idxData !== -1 && campos[idxData] ? campos[idxData].trim() : '';
      const rawValor = idxValor !== -1 && campos[idxValor] ? campos[idxValor] : '0';
      const forma_pagamento = idxForma !== -1 && campos[idxForma] ? campos[idxForma].trim().toUpperCase() : 'DINHEIRO';
      const parcela_ref = idxParcela !== -1 && campos[idxParcela] ? campos[idxParcela].trim() : undefined;
      const descricao = idxDesc !== -1 && campos[idxDesc] ? campos[idxDesc].trim() : undefined;
      const observacoes = idxObs !== -1 && campos[idxObs] ? campos[idxObs].trim() : undefined;

      let whatsappFormatado = '';
      if (!rawWhatsapp) {
        erros.push('WhatsApp é obrigatório');
      } else {
        try {
          whatsappFormatado = WhatsAppService.sanitizePhone(rawWhatsapp);
          if (whatsappFormatado.length < 12) {
            erros.push('WhatsApp deve conter DDD e número com 9 dígitos');
          }
        } catch {
          erros.push('Formato de WhatsApp inválido');
        }
      }

      const valorNumerico = parseValor(rawValor);
      if (valorNumerico <= 0) {
        erros.push('O valor da movimentação deve ser maior que zero');
      }

      let tipoFinal: 'PAGAMENTO' | 'COMPRA_A_PRAZO' | 'AMORTIZACAO' = 'PAGAMENTO';
      if (rawTipo.includes('COMPRA') || rawTipo.includes('DEBITO')) {
        tipoFinal = 'COMPRA_A_PRAZO';
      } else if (rawTipo.includes('AMORTIZACAO') || rawTipo.includes('VALE')) {
        tipoFinal = 'AMORTIZACAO';
      }

      const dataFinal = normalizarData(rawData);

      itensValidados.push({
        linha: i + 1,
        valido: erros.length === 0,
        erros,
        dados: {
          whatsapp: whatsappFormatado || rawWhatsapp,
          nome,
          tipo: tipoFinal,
          data: dataFinal,
          valor: valorNumerico,
          forma_pagamento: forma_pagamento || 'DINHEIRO',
          parcela_ref,
          descricao,
          observacoes,
        },
      });
    }

    const validos = itensValidados.filter((it) => it.valido).length;

    return {
      total: itensValidados.length,
      validos,
      comErros: itensValidados.length - validos,
      itens: itensValidados,
    };
  }

  /**
   * Executa a gravação em lote do histórico de pagamentos e compras anteriores.
   */
  public static async executarImportacaoHistorico(itens: LinhaHistoricoPagamentoImportacao[]): Promise<{
    importados: number;
    detalhes: { cliente_id: string; nome: string; valor: number; tipo: string; novo_saldo: number }[];
  }> {
    if (!itens || itens.length === 0) {
      throw new AppError('Nenhum item válido para importar', 400);
    }

    const client = await pool.connect();
    const resultados: { cliente_id: string; nome: string; valor: number; tipo: string; novo_saldo: number }[] = [];

    try {
      await client.query('BEGIN');

      for (const item of itens) {
        const whatsappLimpo = WhatsAppService.sanitizePhone(item.whatsapp);

        // 1. Localiza a cliente pelo WhatsApp (ou cria se não existir)
        let clienteId: string;
        let clienteNome = item.nome || 'Cliente';

        const cliRes = await client.query(
          'SELECT id, nome FROM clientes WHERE whatsapp = $1 OR whatsapp LIKE $2 LIMIT 1',
          [whatsappLimpo, `%${whatsappLimpo.slice(-9)}`]
        );

        if (cliRes.rows && cliRes.rows.length > 0) {
          clienteId = cliRes.rows[0].id;
          clienteNome = cliRes.rows[0].nome || clienteNome;
        } else {
          // Cria cliente básico para acolher o histórico
          const cliInsert = await client.query(
            `INSERT INTO clientes (nome, whatsapp, limite_credito, observacoes)
             VALUES ($1, $2, 1000.00, $3)
             RETURNING id, nome`,
            [clienteNome, whatsappLimpo, item.observacoes ? `Histórico importado: ${item.observacoes}` : 'Cliente importado via Histórico de Pagamentos']
          );
          clienteId = cliInsert.rows[0].id;
          clienteNome = cliInsert.rows[0].nome;
        }

        // 2. Localiza ou cria a Ficha de Crediário da cliente
        let fichaId: string;
        let saldoAtual = 0;
        let valorParcelaPadrao = 100.0;
        let diaVencimentoPadrao = 5;

        const fichaRes = await client.query(
          'SELECT * FROM fichas_crediario WHERE cliente_id = $1 FOR UPDATE',
          [clienteId]
        );

        if (fichaRes.rows && fichaRes.rows.length > 0) {
          const fichaRow = fichaRes.rows[0];
          fichaId = fichaRow.id;
          saldoAtual = Number(fichaRow.saldo_devedor_total);
          valorParcelaPadrao = Number(fichaRow.valor_parcela_padrao) || 100.0;
          diaVencimentoPadrao = Number(fichaRow.dia_vencimento_padrao) || 5;
        } else {
          const novaFicha = await client.query(
            `INSERT INTO fichas_crediario (
               cliente_id, saldo_devedor_total, valor_parcela_padrao,
               dia_vencimento_padrao, tipo_ciclo, status_ficha
             )
             VALUES ($1, 0.00, 100.00, 5, 'MENSAL_PAGAMENTO', 'ATIVO')
             RETURNING id`,
            [clienteId]
          );
          fichaId = novaFicha.rows[0].id;
        }

        let novoSaldo = saldoAtual;

        // 3. Processa a operação (COMPRA_A_PRAZO vs PAGAMENTO/AMORTIZACAO)
        if (item.tipo === 'COMPRA_A_PRAZO') {
          novoSaldo = saldoAtual + item.valor;
          const descricaoFinal = item.descricao || 'Compra a Prazo Histórica';

          // Registra a venda e o item na base para aparecer na aba de Itens Comprados / Carnê
          const vendaRes = await client.query(
            `INSERT INTO vendas (
               cliente_id, tipo_venda, forma_pagamento, valor_total,
               valor_entrada, valor_financiado_ficha, status_venda, observacoes, created_at
             )
             VALUES ($1, 'PRONTA_ENTREGA', 'CREDIARIO', $2, 0.00, $2, 'CONCLUIDA', $3, $4::timestamptz)
             RETURNING id`,
            [
              clienteId,
              item.valor,
              item.observacoes || 'Compra a prazo importada via histórico',
              item.data,
            ]
          );
          const vendaId = vendaRes.rows && vendaRes.rows[0] ? vendaRes.rows[0].id : null;

          if (vendaId) {
            await client.query(
              `INSERT INTO itens_venda (
                 venda_id, descricao_item, quantidade, preco_unitario, tipo_item, created_at
               )
               VALUES ($1, $2, 1, $3, 'ESTOQUE_LOCAL', $4::timestamptz)`,
              [vendaId, descricaoFinal, item.valor, item.data]
            );
          }

          await client.query(
            `INSERT INTO movimentacoes_ficha (
               ficha_id, cliente_id, venda_id, tipo_movimentacao, valor,
               saldo_anterior, saldo_posterior, descricao, data_movimentacao,
               forma_pagamento, numero_parcela_ref, observacoes, created_at
             )
             VALUES ($1, $2, $3, 'DEBITO_COMPRA', $4, $5, $6, $7, $8::date, 'CREDIARIO', $9, $10, $8::timestamptz)`,
            [
              fichaId,
              clienteId,
              vendaId,
              item.valor,
              saldoAtual,
              novoSaldo,
              descricaoFinal,
              item.data,
              item.parcela_ref || null,
              item.observacoes || null,
            ]
          );

          await client.query(
            `UPDATE fichas_crediario
             SET saldo_devedor_total = $1,
                 status_ficha = 'ATIVO',
                 updated_at = NOW()
             WHERE id = $2`,
            [novoSaldo, fichaId]
          );

          // Gera parcelas se necessário
          await client.query(
            `DELETE FROM parcelas_crediario
             WHERE ficha_id = $1 AND status = 'PENDENTE' AND valor_pago = 0`,
            [fichaId]
          );

          const qtdParcelas = Math.ceil(novoSaldo / valorParcelaPadrao);
          const [ano, mes] = item.data.split('-').map(Number);
          for (let p = 1; p <= qtdParcelas; p++) {
            const dataVenc = new Date(ano || new Date().getFullYear(), (mes ? mes - 1 : new Date().getMonth()) + p, diaVencimentoPadrao);
            const valParc = p === qtdParcelas ? novoSaldo - (qtdParcelas - 1) * valorParcelaPadrao : valorParcelaPadrao;
            await client.query(
              `INSERT INTO parcelas_crediario (ficha_id, numero_parcela, valor_parcela, data_vencimento, status)
               VALUES ($1, $2, $3, $4, 'PENDENTE')`,
              [fichaId, p, valParc, dataVenc.toISOString().split('T')[0]]
            );
          }
        } else {
          // PAGAMENTO ou AMORTIZACAO
          novoSaldo = Math.max(0, saldoAtual - item.valor);
          const novoStatus = novoSaldo === 0 ? 'QUITADO' : 'ATIVO';
          const descricaoFinal = item.descricao || (item.forma_pagamento ? `Pagamento recebido via ${item.forma_pagamento}` : 'Amortização / Pagamento Histórico');

          await client.query(
            `INSERT INTO movimentacoes_ficha (
               ficha_id, cliente_id, tipo_movimentacao, valor,
               saldo_anterior, saldo_posterior, descricao, data_movimentacao,
               forma_pagamento, numero_parcela_ref, observacoes, created_at
             )
             VALUES ($1, $2, 'CREDITO_PAGAMENTO', $3, $4, $5, $6, $7::date, $8, $9, $10, $7::timestamptz)`,
            [
              fichaId,
              clienteId,
              item.valor,
              saldoAtual,
              novoSaldo,
              descricaoFinal,
              item.data,
              item.forma_pagamento || 'DINHEIRO',
              item.parcela_ref || null,
              item.observacoes || null,
            ]
          );

          await client.query(
            `UPDATE fichas_crediario
             SET saldo_devedor_total = $1,
                 status_ficha = $2,
                 updated_at = NOW()
             WHERE id = $3`,
            [novoSaldo, novoStatus, fichaId]
          );

          // Baixa sequencial em parcelas pendentes
          let valorRestanteParaAbater = item.valor;
          const parcelasRes = await client.query(
            `SELECT * FROM parcelas_crediario
             WHERE ficha_id = $1 AND status IN ('PENDENTE', 'PAGO_PARCIAL')
             ORDER BY data_vencimento ASC`,
            [fichaId]
          );

          for (const parc of parcelasRes.rows) {
            if (valorRestanteParaAbater <= 0) break;
            const devido = Number(parc.valor_parcela) - Number(parc.valor_pago);
            if (valorRestanteParaAbater >= devido) {
              await client.query(
                `UPDATE parcelas_crediario
                 SET valor_pago = valor_parcela, data_pagamento = $1::date, status = 'PAGO_TOTAL'
                 WHERE id = $2`,
                [item.data, parc.id]
              );
              valorRestanteParaAbater -= devido;
            } else {
              await client.query(
                `UPDATE parcelas_crediario
                 SET valor_pago = valor_pago + $1, data_pagamento = $2::date, status = 'PAGO_PARCIAL'
                 WHERE id = $3`,
                [valorRestanteParaAbater, item.data, parc.id]
              );
              valorRestanteParaAbater = 0;
            }
          }
        }

        resultados.push({
          cliente_id: clienteId,
          nome: clienteNome,
          valor: item.valor,
          tipo: item.tipo,
          novo_saldo: novoSaldo,
        });
      }

      await client.query('COMMIT');
      return {
        importados: resultados.length,
        detalhes: resultados,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

