import { pool } from '../config/database.js';
import { AppError } from '../middlewares/error.middleware.js';

export interface ConfiguracaoDTO {
  id: string;
  chave_pix: string;
  nome_titular_pix: string;
  nome_atelie: string;
  template_boas_vindas: string;
  template_cobranca_pix: string;
}

export class ConfiguracaoService {
  public static async get(): Promise<ConfiguracaoDTO> {
    const result = await pool.query<ConfiguracaoDTO>(
      'SELECT id, chave_pix, nome_titular_pix, nome_atelie, template_boas_vindas, template_cobranca_pix FROM configuracoes LIMIT 1'
    );

    if (result.rows.length === 0) {
      throw new AppError('Configurações do ateliê não encontradas.', 404, 'CONFIG_NOT_FOUND');
    }

    return result.rows[0];
  }

  public static async update(data: Partial<Omit<ConfiguracaoDTO, 'id'>>): Promise<ConfiguracaoDTO> {
    const current = await this.get();

    const result = await pool.query<ConfiguracaoDTO>(
      `UPDATE configuracoes 
       SET chave_pix = $1, 
           nome_titular_pix = $2, 
           nome_atelie = $3, 
           template_boas_vindas = $4, 
           template_cobranca_pix = $5,
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, chave_pix, nome_titular_pix, nome_atelie, template_boas_vindas, template_cobranca_pix`,
      [
        data.chave_pix ?? current.chave_pix,
        data.nome_titular_pix ?? current.nome_titular_pix,
        data.nome_atelie ?? current.nome_atelie,
        data.template_boas_vindas ?? current.template_boas_vindas,
        data.template_cobranca_pix ?? current.template_cobranca_pix,
        current.id,
      ]
    );

    return result.rows[0];
  }
}
