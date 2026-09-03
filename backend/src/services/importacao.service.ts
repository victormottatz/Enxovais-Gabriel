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
}

