import { pool } from '../config/database.js';
import { WhatsAppService } from './whatsapp.service.js';
import { AppError } from '../middlewares/error.middleware.js';

export interface LinhaFichaImportacao {
  nome: string;
  whatsapp: string;
  cpf?: string;
  endereco?: string;
  ponto_referencia?: string;
  limite_credito?: number;
  dia_vencimento: number;
  tipo_ciclo: 'MENSAL_PAGAMENTO' | 'QUINZENAL_VALE';
  dia_vale_secundario?: number;
  saldo_devedor_atual: number;
  valor_parcela: number;
  observacoes?: string;
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
   * Processa o texto CSV (separado por ponto e vírgula ou vírgula) e valida cada linha.
   */
  public static processarCSV(csvText: string): ResultadoValidacao {
    const linhas = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (linhas.length <= 1) {
      throw new AppError('O arquivo CSV está vazio ou contém apenas o cabeçalho', 400);
    }

    const cabecalho = linhas[0].toLowerCase();
    const separador = cabecalho.includes(';') ? ';' : ',';

    const colunas = linhas[0]
      .split(separador)
      .map((c) => c.trim().toLowerCase().replace(/['"]/g, ''));

    const idxNome = colunas.indexOf('nome');
    const idxWhatsapp = colunas.indexOf('whatsapp');
    const idxCpf = colunas.indexOf('cpf');
    const idxEndereco = colunas.indexOf('endereco');
    const idxPontoRef = colunas.indexOf('ponto_referencia');
    const idxLimite = colunas.indexOf('limite_credito');
    const idxVencimento = colunas.indexOf('dia_vencimento');
    const idxCiclo = colunas.indexOf('tipo_ciclo');
    const idxVale = colunas.indexOf('dia_vale_secundario');
    const idxSaldo = colunas.indexOf('saldo_devedor_atual');
    const idxParcela = colunas.indexOf('valor_parcela');
    const idxObs = colunas.indexOf('observacoes');

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
      return parseFloat(limpo.replace(',', '.'));
    };

    const itensValidados: ItemValidado[] = [];

    for (let i = 1; i < linhas.length; i++) {
      const linhaBruta = linhas[i].trim();
      if (!linhaBruta) continue;

      const campos = linhaBruta.split(separador).map((c) => c.trim().replace(/^["']|["']$/g, ''));
      const erros: string[] = [];

      const nome = idxNome !== -1 && campos[idxNome] ? campos[idxNome].trim() : '';
      const rawWhatsapp = idxWhatsapp !== -1 && campos[idxWhatsapp] ? campos[idxWhatsapp].trim() : '';
      const cpf = idxCpf !== -1 && campos[idxCpf] ? campos[idxCpf].trim() : undefined;
      const endereco = idxEndereco !== -1 && campos[idxEndereco] ? campos[idxEndereco].trim() : undefined;
      const ponto_referencia = idxPontoRef !== -1 && campos[idxPontoRef] ? campos[idxPontoRef].trim() : undefined;
      const limite_credito = idxLimite !== -1 && campos[idxLimite] ? parseValor(campos[idxLimite]) : 1000.0;
      const rawVencimento = idxVencimento !== -1 && campos[idxVencimento] ? parseInt(campos[idxVencimento], 10) : 5;
      const rawCiclo = idxCiclo !== -1 && campos[idxCiclo] ? campos[idxCiclo].toUpperCase() : 'MENSAL_PAGAMENTO';
      const rawVale = idxVale !== -1 && campos[idxVale] ? parseInt(campos[idxVale], 10) : undefined;
      const saldo_devedor_atual = idxSaldo !== -1 && campos[idxSaldo] ? parseValor(campos[idxSaldo]) : 0.0;
      const valor_parcela = idxParcela !== -1 && campos[idxParcela] ? parseValor(campos[idxParcela]) : 100.0;
      const observacoes = idxObs !== -1 && campos[idxObs] ? campos[idxObs].trim() : undefined;

      // Validações
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
      const tipoCiclo = rawCiclo === 'QUINZENAL_VALE' ? 'QUINZENAL_VALE' : 'MENSAL_PAGAMENTO';
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
          limite_credito: isNaN(limite_credito) ? 1000.0 : limite_credito,
          dia_vencimento: diaVencimento,
          tipo_ciclo: tipoCiclo,
          dia_vale_secundario: rawVale && !isNaN(rawVale) ? rawVale : undefined,
          saldo_devedor_atual: saldoFinal,
          valor_parcela: valorParcelaFinal,
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

        // 1. Cria ou atualiza cliente pelo WhatsApp
        const cliRes = await client.query(
          `INSERT INTO clientes (nome, whatsapp, cpf, endereco, ponto_referencia, limite_credito, observacoes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (whatsapp) DO UPDATE 
           SET nome = EXCLUDED.nome,
               cpf = COALESCE(EXCLUDED.cpf, clientes.cpf),
               endereco = COALESCE(EXCLUDED.endereco, clientes.endereco),
               ponto_referencia = COALESCE(EXCLUDED.ponto_referencia, clientes.ponto_referencia),
               observacoes = COALESCE(EXCLUDED.observacoes, clientes.observacoes),
               updated_at = NOW()
           RETURNING id, nome`,
          [
            item.nome.trim(),
            whatsappLimpo,
            item.cpf?.trim() || null,
            item.endereco?.trim() || null,
            item.ponto_referencia?.trim() || null,
            item.limite_credito ?? 1000.0,
            item.observacoes?.trim() || null,
          ]
        );

        const clienteId = cliRes.rows[0].id;
        const clienteNome = cliRes.rows[0].nome;

        // 2. Cria ou atualiza Ficha de Crediário
        const fichaRes = await client.query(
          `INSERT INTO fichas_crediario (
             cliente_id, saldo_devedor_total, valor_parcela_padrao, 
             dia_vencimento_padrao, tipo_ciclo, dia_vale_secundario, status_ficha
           )
           VALUES ($1, $2, $3, $4, $5, $6, 'ATIVO')
           ON CONFLICT (cliente_id) DO UPDATE 
           SET saldo_devedor_total = EXCLUDED.saldo_devedor_total,
               valor_parcela_padrao = EXCLUDED.valor_parcela_padrao,
               dia_vencimento_padrao = EXCLUDED.dia_vencimento_padrao,
               tipo_ciclo = EXCLUDED.tipo_ciclo,
               dia_vale_secundario = EXCLUDED.dia_vale_secundario,
               updated_at = NOW()
           RETURNING id`,
          [
            clienteId,
            item.saldo_devedor_atual,
            item.valor_parcela,
            item.dia_vencimento,
            item.tipo_ciclo,
            item.dia_vale_secundario || null,
          ]
        );

        const fichaId = fichaRes.rows[0].id;

        // 3. Se houver saldo devedor inicial, cria a movimentação de histórico
        if (item.saldo_devedor_atual > 0) {
          await client.query(
            `INSERT INTO movimentacoes_ficha (
               ficha_id, tipo_movimentacao, valor, saldo_anterior, saldo_posterior, descricao
             )
             VALUES ($1, 'DEBITO_COMPRA', $2, 0.00, $2, 'Saldo Inicial de Migração - Ficha Física')`,
            [fichaId, item.saldo_devedor_atual]
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
