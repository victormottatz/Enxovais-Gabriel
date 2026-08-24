import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WhatsAppService } from '../services/whatsapp.service.js';
import { pool } from '../config/database.js';

describe('WhatsAppService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('sanitizePhone (Higienização e Formatação E.164)', () => {
    it('deve adicionar o DDI 55 para números de celular com DDD (11 dígitos)', () => {
      const phone = '(18) 99712-3456';
      expect(WhatsAppService.sanitizePhone(phone)).toBe('5518997123456');
    });

    it('deve adicionar o DDI 55 para números fixos com DDD (10 dígitos)', () => {
      const phone = '(18) 3652-1234';
      expect(WhatsAppService.sanitizePhone(phone)).toBe('551836521234');
    });

    it('deve manter o DDI 55 se já estiver presente no formato correto (13 dígitos)', () => {
      const phone = '+55 18 99712-3456';
      expect(WhatsAppService.sanitizePhone(phone)).toBe('5518997123456');
    });

    it('deve manter o DDI 55 se já estiver presente no formato fixo (12 dígitos)', () => {
      const phone = '551836521234';
      expect(WhatsAppService.sanitizePhone(phone)).toBe('551836521234');
    });

    it('deve remover caracteres especiais, espaços e traços', () => {
      const phone = '  +55 (11) 9.8888-7777  ';
      expect(WhatsAppService.sanitizePhone(phone)).toBe('5511988887777');
    });
  });

  describe('sendTextMessage (Disparo via Evolution API e Auditoria)', () => {
    it('deve enviar mensagem com sucesso e registrar log ENVIADO no banco', async () => {
      // Mock do fetch global
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ key: { id: 'msg-123' }, status: 'PENDING' }),
      });
      global.fetch = mockFetch;

      // Mock do pool.query
      const mockQuery = vi.spyOn(pool, 'query').mockResolvedValue({ rowCount: 1 } as any);

      const result = await WhatsAppService.sendTextMessage({
        phone: '18997123456',
        message: 'Olá Maria, seu pedido está pronto!',
        tipoMensagem: 'BOAS_VINDAS',
        clienteId: 'c1111111-1111-1111-1111-111111111111',
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Validação do payload enviado para Evolution API
      const [calledUrl, calledOptions] = mockFetch.mock.calls[0];
      expect(calledUrl).toContain('/message/sendText/');
      const requestBody = JSON.parse(calledOptions.body);
      expect(requestBody.number).toBe('5518997123456');
      expect(requestBody.text).toBe('Olá Maria, seu pedido está pronto!');

      // Validação do log de auditoria no PostgreSQL
      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryArgs = mockQuery.mock.calls[0]?.[1] as any[];
      expect(queryArgs?.[3]).toBe('5518997123456'); // telefone_destino
      expect(queryArgs?.[4]).toBe('BOAS_VINDAS'); // tipo_mensagem
      expect(queryArgs?.[5]).toBe('ENVIADO'); // status_envio
    });

    it('deve tratar resposta de erro da Evolution API e registrar log ERRO no banco', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Instance not connected' }),
      });
      global.fetch = mockFetch;

      const mockQuery = vi.spyOn(pool, 'query').mockResolvedValue({ rowCount: 1 } as any);

      const result = await WhatsAppService.sendTextMessage({
        phone: '18997123456',
        message: 'Lembrete de parcela',
        tipoMensagem: 'LEMBRETE_PAGAMENTO',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Evolution API retornou status 400');

      // Verifica log de ERRO no banco
      expect(mockQuery).toHaveBeenCalledTimes(1);
      const queryArgs = mockQuery.mock.calls[0]?.[1] as any[];
      expect(queryArgs?.[4]).toBe('LEMBRETE_PAGAMENTO');
      expect(queryArgs?.[5]).toBe('ERRO');
      expect(queryArgs?.[6]).toContain('Evolution API retornou status 400');
    });
  });

  describe('getInstanceStatus (Verificação de Conectividade)', () => {
    it('deve retornar connected = true quando o estado for "open"', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ instance: { state: 'open' } }),
      });

      const status = await WhatsAppService.getInstanceStatus();
      expect(status.connected).toBe(true);
      expect(status.state).toBe('open');
    });

    it('deve retornar connected = false quando o estado for "close" ou desconectado', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ instance: { state: 'close' } }),
      });

      const status = await WhatsAppService.getInstanceStatus();
      expect(status.connected).toBe(false);
      expect(status.state).toBe('close');
    });

    it('deve lidar com falha de conexão retornando OFFLINE', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));

      const status = await WhatsAppService.getInstanceStatus();
      expect(status.connected).toBe(false);
      expect(status.state).toBe('OFFLINE');
    });
  });
});
