import { WhatsAppService, TipoMensagemWhatsApp } from '../services/whatsapp.service.js';

export interface WhatsAppJob {
  id: string;
  phone: string;
  message: string;
  pedidoId?: string;
  clienteId?: string;
  vendaId?: string;
  fichaId?: string;
  tipoMensagem: TipoMensagemWhatsApp;
  tentativas?: number;
  onSuccess?: () => Promise<void>;
}

export class WhatsAppQueue {
  private static queue: WhatsAppJob[] = [];
  private static isProcessing = false;
  private static readonly MAX_TENTATIVAS = 3;
  private static readonly DELAY_ENTRE_ENVIOS_MS = 2500; // 2.5 segundos de intervalo de segurança anti-ban

  /**
   * Adiciona um job à fila de envio
   */
  public static enqueue(job: Omit<WhatsAppJob, 'tentativas'>): void {
    const jobWithRetry: WhatsAppJob = {
      ...job,
      tentativas: 0,
    };

    this.queue.push(jobWithRetry);
    console.log(
      `📥 [WhatsAppQueue] Mensagem enfileirada (${job.tipoMensagem}) para ${job.phone}. Total na fila: ${this.queue.length}`
    );

    if (!this.isProcessing) {
      this.processNext();
    }
  }

  /**
   * Processa itens da fila sequencialmente com delay anti-ban
   */
  private static async processNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const currentJob = this.queue.shift();

    if (!currentJob) {
      this.isProcessing = false;
      return;
    }

    try {
      console.log(
        `⏳ [WhatsAppQueue] Enviando mensagem (${currentJob.tipoMensagem}) para ${currentJob.phone}...`
      );

      const result = await WhatsAppService.sendTextMessage({
        phone: currentJob.phone,
        message: currentJob.message,
        clienteId: currentJob.clienteId,
        vendaId: currentJob.vendaId,
        fichaId: currentJob.fichaId,
        tipoMensagem: currentJob.tipoMensagem,
      });

      if (result.success) {
        console.log(`✅ [WhatsAppQueue] Mensagem enviada com sucesso para ${currentJob.phone}!`);
        if (currentJob.onSuccess) {
          await currentJob.onSuccess();
        }
      } else {
        throw new Error(result.error || 'Falha no disparo');
      }
    } catch (error) {
      currentJob.tentativas = (currentJob.tentativas || 0) + 1;
      console.error(
        `⚠️ [WhatsAppQueue] Tentativa ${currentJob.tentativas}/${this.MAX_TENTATIVAS} falhou para ${currentJob.phone}:`,
        error
      );

      if (currentJob.tentativas < this.MAX_TENTATIVAS) {
        // Reenfileira no final para tentar novamente mais tarde
        this.queue.push(currentJob);
      } else {
        console.error(
          `❌ [WhatsAppQueue] Mensagem descartada após atingir limite de ${this.MAX_TENTATIVAS} tentativas.`
        );
      }
    }

    // Aguarda delay antes de disparar o próximo item da fila
    setTimeout(() => {
      this.processNext();
    }, this.DELAY_ENTRE_ENVIOS_MS);
  }

  /**
   * Retorna o status atual da fila
   */
  public static getStatus(): { pendingCount: number; isProcessing: boolean } {
    return {
      pendingCount: this.queue.length,
      isProcessing: this.isProcessing,
    };
  }
}
