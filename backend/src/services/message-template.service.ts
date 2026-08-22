export interface TemplateVariables {
  nome_cliente?: string;
  descricao_itens?: string;
  data_previsao_entrega?: string | Date;
  valor_total?: number | string;
  valor_sinal?: number | string;
  valor_restante?: number | string;
  valor_compra?: number | string;
  saldo_total?: number | string;
  saldo_restante?: number | string;
  valor_parcela?: number | string;
  dia_vencimento?: number | string;
  valor_pago?: number | string;
  proximo_vencimento?: string | Date;
  chave_pix?: string;
  nome_titular_pix?: string;
  nome_loja?: string;
  nome_atelie?: string;
}

export class MessageTemplateService {
  /**
   * Formata número para moeda brasileira (ex: 150.5 -> "150,50")
   */
  public static formatCurrency(value?: number | string): string {
    if (value === undefined || value === null) return '0,00';
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0,00';
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /**
   * Formata data para padrão brasileiro (DD/MM/AAAA)
   */
  public static formatDate(date?: string | Date): string {
    if (!date) return '';
    try {
      const d = typeof date === 'string' ? new Date(date) : date;
      const year = d.getUTCFullYear();
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const day = String(d.getUTCDate()).padStart(2, '0');
      return `${day}/${month}/${year}`;
    } catch {
      return String(date);
    }
  }

  /**
   * Renderiza o template de mensagem substituindo tags pelas variáveis formatadas
   */
  public static render(template: string, vars: TemplateVariables): string {
    let rendered = template;

    if (vars.nome_cliente) {
      rendered = rendered.replace(/{nome_cliente}/gi, vars.nome_cliente.trim());
    }

    if (vars.descricao_itens) {
      rendered = rendered.replace(/{descricao_itens}/gi, vars.descricao_itens.trim());
    }

    if (vars.data_previsao_entrega) {
      rendered = rendered.replace(/{data_previsao_entrega}/gi, this.formatDate(vars.data_previsao_entrega));
    }

    if (vars.proximo_vencimento) {
      rendered = rendered.replace(/{proximo_vencimento}/gi, this.formatDate(vars.proximo_vencimento));
    }

    if (vars.valor_total !== undefined) {
      rendered = rendered.replace(/{valor_total}/gi, this.formatCurrency(vars.valor_total));
    }

    if (vars.valor_compra !== undefined) {
      rendered = rendered.replace(/{valor_compra}/gi, this.formatCurrency(vars.valor_compra));
    }

    if (vars.saldo_total !== undefined) {
      rendered = rendered.replace(/{saldo_total}/gi, this.formatCurrency(vars.saldo_total));
    }

    if (vars.saldo_restante !== undefined) {
      rendered = rendered.replace(/{saldo_restante}/gi, this.formatCurrency(vars.saldo_restante));
    }

    if (vars.valor_parcela !== undefined) {
      rendered = rendered.replace(/{valor_parcela}/gi, this.formatCurrency(vars.valor_parcela));
    }

    if (vars.valor_pago !== undefined) {
      rendered = rendered.replace(/{valor_pago}/gi, this.formatCurrency(vars.valor_pago));
    }

    if (vars.dia_vencimento !== undefined) {
      rendered = rendered.replace(/{dia_vencimento}/gi, String(vars.dia_vencimento));
    }

    if (vars.chave_pix) {
      rendered = rendered.replace(/{chave_pix}/gi, vars.chave_pix.trim());
    }

    if (vars.nome_titular_pix) {
      rendered = rendered.replace(/{nome_titular_pix}/gi, vars.nome_titular_pix.trim());
    }

    if (vars.nome_loja) {
      rendered = rendered.replace(/{nome_loja}/gi, vars.nome_loja.trim());
    }

    if (vars.nome_atelie) {
      rendered = rendered.replace(/{nome_atelie}/gi, vars.nome_atelie.trim());
    }

    return rendered;
  }
}
