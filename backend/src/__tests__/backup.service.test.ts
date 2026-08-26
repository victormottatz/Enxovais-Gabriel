import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BackupService } from '../services/backup.service.js';
import { pool } from '../config/database.js';

describe('BackupService (Exportação e Segurança)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve consolidar todas as tabelas no payload de backup', async () => {
    vi.spyOn(pool, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes('FROM clientes')) {
        return { rows: [{ id: '1', nome: 'Cliente Teste' }] } as any;
      }
      if (sql.includes('FROM fichas_crediario')) {
        return { rows: [{ id: 'f1', saldo_devedor_total: 100 }] } as any;
      }
      return { rows: [] } as any;
    });

    const backup = await BackupService.gerarBackupCompleto();

    expect(backup.versao_schema).toBe('1.0.0');
    expect(backup.dados.clientes).toHaveLength(1);
    expect(backup.dados.fichas_crediario).toHaveLength(1);
    expect(backup.estatisticas.total_clientes).toBe(1);
    expect(backup.data_geracao).toBeDefined();
  });
});
