import { test, expect } from '@playwright/test';

test.describe('Enxovais Gabriel - Testes de Inspeção e Fluxos Principais', () => {
  test.beforeEach(async ({ page }) => {
    // Acessa a raiz da aplicação
    await page.goto('/');
  });

  test('deve carregar a aplicação com o título e cabeçalho corretos', async ({ page }) => {
    // Valida o título da página
    await expect(page).toHaveTitle(/Enxovais Gabriel/i);

    // Valida a presença do título da página
    const pageTitle = page.locator('#page-current-title');
    await expect(pageTitle).toBeVisible();
    await expect(pageTitle).toContainText('Cobranças do Dia');
  });

  test('deve permitir navegar entre as abas principais da aplicação', async ({ page, isMobile }) => {
    if (isMobile) {
      // No Mobile, clica no botão hambúrguer para abrir o menu lateral
      const menuBtn = page.locator('.mobile-menu-btn');
      if (await menuBtn.isVisible()) {
        await menuBtn.click();
      }
    }

    // Clica na aba Fichas & Crediário
    const btnFichas = page.locator('.sidebar-nav button:has-text("Fichas & Crediário")').first();
    await btnFichas.click();
    await expect(page.locator('#tab-fichas')).toBeVisible();

    if (isMobile) {
      const menuBtn = page.locator('.mobile-menu-btn');
      if (await menuBtn.isVisible()) {
        await menuBtn.click();
      }
    }

    // Clica na aba Catálogo & Estoque
    const btnCatalogo = page.locator('.sidebar-nav button:has-text("Catálogo & Estoque")').first();
    await btnCatalogo.click();
    await expect(page.locator('#tab-catalogo')).toBeVisible();
  });

  test('deve responder com sucesso ao healthcheck da API', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.status).toBe('ok');
    expect(data.app).toContain('Enxovais Gabriel');
  });

  test('deve carregar a interface interativa do Swagger UI em /api-docs', async ({ page }) => {
    await page.goto('/api-docs/');
    await expect(page).toHaveTitle(/Swagger UI/i);
    await expect(page.locator('#swagger-ui, .swagger-ui').first()).toBeVisible();
  });

  test('deve cadastrar um novo cliente e exibi-lo na tabela de clientes', async ({ page, isMobile }) => {
    // Navega até a aba Clientes
    if (isMobile) {
      const menuBtn = page.locator('.mobile-menu-btn');
      if (await menuBtn.isVisible()) await menuBtn.click();
    }
    const btnClientes = page.locator('button:has-text("Clientes")').first();
    await btnClientes.click();
    await expect(page.locator('#tab-clientes')).toBeVisible();

    // Clica em + Cadastrar Cliente
    const btnCadastrar = page.locator('button:has-text("+ Cadastrar Cliente")').first();
    await btnCadastrar.click();
    await expect(page.locator('#modal-novo-cliente')).toBeVisible();

    // Preenche o formulário
    const nomeTeste = `Cliente Teste ${Date.now()}`;
    await page.fill('#cli-nome', nomeTeste);
    await page.fill('#cli-telefone', '18991234567');
    await page.fill('#cli-endereco', 'Rua dos Testes, 100');

    // Submete o formulário
    await page.click('#modal-novo-cliente button[type="submit"]');

    // O modal deve fechar
    await expect(page.locator('#modal-novo-cliente')).not.toBeVisible();

    // O cliente deve estar visível na tabela (Desktop) ou nos cards (Mobile)
    if (isMobile) {
      await expect(page.locator(`#clientes-cards-mobile >> text=${nomeTeste}`).first()).toBeVisible();
    } else {
      await expect(page.locator(`#clientes-table-body >> text=${nomeTeste}`).first()).toBeVisible();
    }
  });
});
