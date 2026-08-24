import { describe, it, expect } from 'vitest';
import { WhatsAppService } from '../services/whatsapp.service.js';

describe('WhatsAppService', () => {
  it('deve sanitizar e formatar telefone adicionando DDI 55 quando necessário', () => {
    expect(WhatsAppService.sanitizePhone('18991234567')).toBe('5518991234567');
    expect(WhatsAppService.sanitizePhone('(18) 99123-4567')).toBe('5518991234567');
    expect(WhatsAppService.sanitizePhone('5518991234567')).toBe('5518991234567');
  });

  it('deve manter métodos estáticos de envio de mensagem e checagem de status', () => {
    expect(typeof WhatsAppService.sendTextMessage).toBe('function');
    expect(typeof WhatsAppService.getInstanceStatus).toBe('function');
  });
});
