import { pool } from '../config/database.js';
import { env } from '../config/env.js';

export type TipoMensagemWhatsApp =
  | 'VENDA_CREDIARIO'
  | 'LEMBRETE_PAGAMENTO'
  | 'RECIBO_PAGAMENTO'
  | 'ENCOMENDA_CHEGOU'
  | 'BOAS_VINDAS'
  | 'PEDIDO_PRONTO_PIX'
  | 'AVULSO';

export class WhatsAppService {
  /**
   * Sanitiza e formata um telefone para o formato padrão do WhatsApp Brasil (55DD9XXXXXXXX)
   */
  public static sanitizePhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.startsWith('55') && (cleaned.length === 12 || cleaned.length === 13)) {
      return cleaned;
    }

    if (cleaned.length === 10 || cleaned.length === 11) {
      return `55${cleaned}`;
    }

    return cleaned;
  }

  /**
   * Envia uma mensagem de texto via Evolution API v2
   */
  public static async sendTextMessage(params: {
    phone: string;
    message: string;
    pedidoId?: string;
    clienteId?: string;
    vendaId?: string;
    fichaId?: string;
    tipoMensagem: TipoMensagemWhatsApp;
  }): Promise<{ success: boolean; data?: unknown; error?: string }> {
    const formattedPhone = this.sanitizePhone(params.phone);
    const url = `${env.EVOLUTION_SERVER_URL}/message/sendText/${env.EVOLUTION_INSTANCE_NAME}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: env.EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: params.message,
          delay: 1200,
        }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          `Evolution API retornou status ${response.status}: ${JSON.stringify(responseData)}`
        );
      }

      // Registra log de sucesso no PostgreSQL
      await pool.query(
        `INSERT INTO logs_mensagens (
          cliente_id, venda_id, ficha_id, telefone_destino, tipo_mensagem, status_envio, payload_enviado
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          params.clienteId || null,
          params.vendaId || null,
          params.fichaId || null,
          formattedPhone,
          params.tipoMensagem,
          'ENVIADO',
          params.message,
        ]
      );

      return { success: true, data: responseData };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ [WhatsAppService] Falha ao enviar para ${formattedPhone}:`, errorMsg);

      // Registra log de erro no PostgreSQL
      await pool.query(
        `INSERT INTO logs_mensagens (
          cliente_id, venda_id, ficha_id, telefone_destino, tipo_mensagem, status_envio, detalhes_erro, payload_enviado
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          params.clienteId || null,
          params.vendaId || null,
          params.fichaId || null,
          formattedPhone,
          params.tipoMensagem,
          'ERRO',
          errorMsg,
          params.message,
        ]
      );

      return { success: false, error: errorMsg };
    }
  }

  /**
   * Consulta o status de conexão da instância na Evolution API
   */
  public static async getInstanceStatus(): Promise<{
    connected: boolean;
    state?: string;
    details?: unknown;
  }> {
    try {
      const url = `${env.EVOLUTION_SERVER_URL}/instance/connectionState/${env.EVOLUTION_INSTANCE_NAME}`;
      const response = await fetch(url, {
        headers: { apikey: env.EVOLUTION_API_KEY },
      });

      if (!response.ok) {
        return { connected: false, state: 'DISCONNECTED' };
      }

      const data = (await response.json()) as { instance?: { state?: string } };
      const state = data?.instance?.state || 'UNKNOWN';

      return {
        connected: state === 'open',
        state,
        details: data,
      };
    } catch (error) {
      console.warn('⚠️ Não foi possível verificar o status da Evolution API:', error);
      return { connected: false, state: 'OFFLINE' };
    }
  }
}
