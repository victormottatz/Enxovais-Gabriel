import { describe, it, expect, beforeEach } from 'vitest';
import { ProdutoService } from '../services/produto.service.js';
import { memoryStore } from '../config/database.js';

describe('Serviço de Produtos e Estoque com Fotos (ProdutoService)', () => {
  beforeEach(() => {
    memoryStore.produtos = [];
  });

  it('deve cadastrar um produto com foto_url e estoque inicial com sucesso', async () => {
    const novoProduto = await ProdutoService.create({
      codigo_sku: 'EDR-SOFT-01',
      nome: 'Edredom Soft Casal Dupla Face',
      categoria: 'CAMA_MESA_BANHO',
      preco_custo: 90.0,
      preco_venda_vista: 170.0,
      preco_venda_crediario: 180.0,
      estoque_atual: 15,
      foto_url: '/uploads/produtos/edredom-exemplo.jpg',
    });

    expect(novoProduto).toBeDefined();
    expect(novoProduto.id).toBeDefined();
    expect(novoProduto.nome).toBe('Edredom Soft Casal Dupla Face');
    expect(novoProduto.foto_url).toBe('/uploads/produtos/edredom-exemplo.jpg');
    expect(novoProduto.estoque_atual).toBe(15);
  });

  it('deve atualizar os dados e a foto de um produto existente', async () => {
    const prod = await ProdutoService.create({
      nome: 'Jogo de Panelas 5 Peças',
      categoria: 'COZINHA',
      preco_venda_vista: 220.0,
      preco_venda_crediario: 240.0,
      estoque_atual: 8,
    });

    const atualizado = await ProdutoService.update(prod.id, {
      nome: 'Jogo de Panelas Antiaderente Luxo 5 Peças',
      foto_url: '/uploads/produtos/panelas-luxo.webp',
      estoque_atual: 12,
    });

    expect(atualizado.id).toBe(prod.id);
    expect(atualizado.nome).toBe('Jogo de Panelas Antiaderente Luxo 5 Peças');
    expect(atualizado.foto_url).toBe('/uploads/produtos/panelas-luxo.webp');
    expect(atualizado.estoque_atual).toBe(12);
  });

  it('deve atualizar o estoque delta de forma segura e não permitir estoque negativo', async () => {
    const prod = await ProdutoService.create({
      nome: 'Conjunto Toalhas Banho 4 Peças',
      preco_venda_vista: 110.0,
      preco_venda_crediario: 120.0,
      estoque_atual: 5,
    });

    // Subtrair 2 do estoque
    const deltaMenos = await ProdutoService.updateEstoque(prod.id, -2);
    expect(deltaMenos.estoque_atual).toBe(3);

    // Subtrair mais 10 (deve limitar a 0)
    const deltaZero = await ProdutoService.updateEstoque(prod.id, -10);
    expect(deltaZero.estoque_atual).toBe(0);
  });

  it('deve listar apenas produtos ativos', async () => {
    const p1 = await ProdutoService.create({
      nome: 'Cortina Blackout',
      preco_venda_vista: 150.0,
      preco_venda_crediario: 160.0,
    });

    const p2 = await ProdutoService.create({
      nome: 'Manta Microfibra',
      preco_venda_vista: 80.0,
      preco_venda_crediario: 90.0,
    });

    await ProdutoService.delete(p1.id);

    const lista = await ProdutoService.list();
    expect(lista.length).toBe(1);
    expect(lista[0].id).toBe(p2.id);
  });
});
