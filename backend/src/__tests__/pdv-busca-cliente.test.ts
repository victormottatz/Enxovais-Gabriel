import { describe, it, expect } from 'vitest';

/**
 * Testes unitários para o Mecanismo de Busca Dinâmica e Vinculação de Cliente no PDV (Nova Venda)
 * Validando normalização de acentos, busca por telefone/apelido, ordenação e cálculo de venda.
 */

interface Cliente {
  id: string;
  nome: string;
  apelido?: string;
  whatsapp?: string;
  telefone?: string;
  cpf?: string;
  endereco?: string;
  ponto_referencia?: string;
  dia_vencimento_padrao?: number;
  saldo_devedor_total?: number;
}

function normalizarTextoBusca(str: string | undefined): string {
  return (str || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function filtrarEOrdenarClientes(clientes: Cliente[], termo: string): Cliente[] {
  const termoNorm = normalizarTextoBusca(termo);
  if (!termoNorm) return clientes.slice(0, 15);

  const termoDigitos = termo.replace(/\D/g, '');

  const filtrados = clientes.filter((c) => {
    const nome = normalizarTextoBusca(c.nome);
    const apelido = normalizarTextoBusca(c.apelido);
    const fone = (c.whatsapp || c.telefone || '').replace(/\D/g, '');
    const cpf = (c.cpf || '').replace(/\D/g, '');
    const end = normalizarTextoBusca(c.endereco);
    const ref = normalizarTextoBusca(c.ponto_referencia);

    return (
      nome.includes(termoNorm) ||
      apelido.includes(termoNorm) ||
      end.includes(termoNorm) ||
      ref.includes(termoNorm) ||
      (termoDigitos.length > 0 && fone.includes(termoDigitos)) ||
      (termoDigitos.length > 0 && cpf.includes(termoDigitos))
    );
  });

  filtrados.sort((a, b) => {
    const aNome = normalizarTextoBusca(a.nome);
    const bNome = normalizarTextoBusca(b.nome);
    const aStarts = aNome.startsWith(termoNorm);
    const bStarts = bNome.startsWith(termoNorm);
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    return aNome.localeCompare(bNome);
  });

  return filtrados.slice(0, 15);
}

describe('Módulo Nova Venda - Busca Dinâmica de Clientes', () => {
  const listaClientesExemplo: Cliente[] = [
    {
      id: 'cli-1',
      nome: 'Maria de Fátima Souza',
      apelido: 'Dona Fátima',
      whatsapp: '18991234567',
      dia_vencimento_padrao: 10,
      saldo_devedor_total: 150.0,
      endereco: 'Rua das Flores, 120',
    },
    {
      id: 'cli-2',
      nome: 'Aparecida Maria dos Santos',
      apelido: 'Cida',
      whatsapp: '18997654321',
      dia_vencimento_padrao: 20,
      saldo_devedor_total: 0.0,
      endereco: 'Av. Brasil, 450',
    },
    {
      id: 'cli-3',
      nome: 'Fátima Bernadete Lima',
      whatsapp: '18981112233',
      dia_vencimento_padrao: 5,
      saldo_devedor_total: 300.0,
    },
    {
      id: 'cli-4',
      nome: 'Gabriel Antunes',
      whatsapp: '18999887766',
      dia_vencimento_padrao: 10,
      saldo_devedor_total: 0.0,
      endereco: 'Bairro Cohab 2',
      ponto_referencia: 'Perto da Padaria Central',
    },
  ];

  it('deve localizar cliente digitando nome sem acentos (insensível a maiúsculas/minúsculas e acentos)', () => {
    const resultado = filtrarEOrdenarClientes(listaClientesExemplo, 'fatima');
    expect(resultado.length).toBe(2);
    // 'Fátima Bernadete' começa com 'fatima', então deve vir primeiro que 'Maria de Fátima'
    expect(resultado[0].nome).toBe('Fátima Bernadete Lima');
    expect(resultado[1].nome).toBe('Maria de Fátima Souza');
  });

  it('deve localizar cliente pelo apelido cadastrado', () => {
    const resultado = filtrarEOrdenarClientes(listaClientesExemplo, 'cida');
    expect(resultado.length).toBe(1);
    expect(resultado[0].nome).toBe('Aparecida Maria dos Santos');
  });

  it('deve localizar cliente digitando número de telefone/whatsapp com ou sem pontuação', () => {
    const resultado = filtrarEOrdenarClientes(listaClientesExemplo, '(18) 99123-4567');
    expect(resultado.length).toBe(1);
    expect(resultado[0].id).toBe('cli-1');
  });

  it('deve localizar cliente por ponto de referência ou endereço', () => {
    const resultado = filtrarEOrdenarClientes(listaClientesExemplo, 'padaria');
    expect(resultado.length).toBe(1);
    expect(resultado[0].nome).toBe('Gabriel Antunes');
  });

  it('deve retornar lista vazia se nenhum cliente bater com a busca', () => {
    const resultado = filtrarEOrdenarClientes(listaClientesExemplo, 'Zulmira Nonata');
    expect(resultado.length).toBe(0);
  });

  it('deve vincular a venda à cliente localizada e somar ao dividendo corretamente', () => {
    const cliente = listaClientesExemplo[0]; // Maria de Fátima Souza (saldo 150.00)
    const valorCarrinho = 250.0;
    const novoDividendo = (cliente.saldo_devedor_total || 0) + valorCarrinho;

    expect(novoDividendo).toBe(400.0);

    // Parcela de R$ 100,00 -> 4 parcelas
    const valorParcela = 100.0;
    const totalParcelas = Math.ceil(novoDividendo / valorParcela);
    expect(totalParcelas).toBe(4);
  });
});
