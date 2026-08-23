import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WhatsAppQueue } from '../queues/whatsapp.queue.js';
import { WhatsAppService } from '../services/whatsapp.service.js';

describe('WhatsAppQueue (Fila de Disparo com Anti-Ban e Retry)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    WhatsAppQueue.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    WhatsAppQueue.clear();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('deve processar item da fila e executar o callback onSuccess', async () => {
    const sendSpy = vi.spyOn(WhatsAppService, 'sendTextMessage').mockResolvedValue({
      success: true,
      data: { id: 'msg-001' },
    });

    const onSuccessMock = vi.fn().mockResolvedValue(undefined);

    WhatsAppQueue.enqueue({
      id: 'job-1',
      phone: '18991112222',
      message: 'Mensagem de teste',
      tipoMensagem: 'AVULSO',
      onSuccess: onSuccessMock,
    });

    // Processa a chamada async do WhatsAppService
    await vi.advanceTimersByTimeAsync(100);

    expect(sendSpy).toHaveBeenCalledTimes(1);
    expect(sendSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '18991112222',
        message: 'Mensagem de teste',
        tipoMensagem: 'AVULSO',
      })
    );

    expect(onSuccessMock).toHaveBeenCalledTimes(1);
  });

  it('deve respeitar delay e tentar novamente em caso de falha', async () => {
    // Primeira chamada falha, segunda tem sucesso
    const sendSpy = vi
      .spyOn(WhatsAppService, 'sendTextMessage')
      .mockResolvedValueOnce({
        success: false,
        error: 'Timeout na Evolution API',
      })
      .mockResolvedValueOnce({
        success: true,
      });

    WhatsAppQueue.enqueue({
      id: 'job-retry',
      phone: '18993334444',
      message: 'Cobrança com retry',
      tipoMensagem: 'LEMBRETE_PAGAMENTO',
    });

    // Processa a 1ª tentativa
    await vi.advanceTimersByTimeAsync(100);
    expect(sendSpy).toHaveBeenCalledTimes(1);

    // Avança o timer do delay de segurança anti-ban (2500ms)
    await vi.advanceTimersByTimeAsync(2600);

    // Deve ter tentado a 2ª vez
    expect(sendSpy).toHaveBeenCalledTimes(2);
  });

  it('deve descartar a mensagem após atingir o limite de 3 tentativas', async () => {
    const sendSpy = vi.spyOn(WhatsAppService, 'sendTextMessage').mockResolvedValue({
      success: false,
      error: 'Instância offline',
    });

    WhatsAppQueue.enqueue({
      id: 'job-fail-max',
      phone: '18995556666',
      message: 'Mensagem que vai falhar 3x',
      tipoMensagem: 'AVULSO',
    });

    // 1ª tentativa
    await vi.advanceTimersByTimeAsync(100);
    expect(sendSpy).toHaveBeenCalledTimes(1);

    // 2ª tentativa (após 2.5s)
    await vi.advanceTimersByTimeAsync(2600);
    expect(sendSpy).toHaveBeenCalledTimes(2);

    // 3ª tentativa (após mais 2.5s)
    await vi.advanceTimersByTimeAsync(2600);
    expect(sendSpy).toHaveBeenCalledTimes(3);

    // Próximo ciclo: não deve tentar uma 4ª vez
    await vi.advanceTimersByTimeAsync(2600);
    expect(sendSpy).toHaveBeenCalledTimes(3);
    expect(WhatsAppQueue.getStatus().pendingCount).toBe(0);
  });
});
