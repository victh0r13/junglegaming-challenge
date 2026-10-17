import { connectWallet, goToCheckout, openReview } from './support/checkout'
import { expect, test } from './support/fixtures'

test.describe('Pagamento', () => {
  test('compra completa com cupom até o recibo confirmado', async ({ app, page }) => {
    await goToCheckout(app, { quantity: 2, coupon: 'KURIO10' })
    await expect(page.getByRole('textbox', { name: /Nome de exibição/ })).toHaveValue('Ana Souza')
    await expect(page.getByRole('textbox', { name: /Endereço da carteira/ })).toHaveValue('0x8ba1f109551bD432803012645Ac136ddd64DBA72')

    await connectWallet(app)
    const dialog = await openReview(app)
    await expect(dialog.getByText('Golden Signal #160 (1/50) × 2')).toBeVisible()
    await expect(dialog.getByText('0.718 ETH')).toBeVisible()
    await dialog.getByRole('button', { name: 'Confirmar pagamento' }).click()

    await expect(page).toHaveURL(/\/pedidos\/ped_/)
    await expect(page.getByRole('heading', { name: 'Aguardando confirmação' })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Compra confirmada!' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText('Seus NFTs agora estão na sua carteira')).toBeVisible()
    await expect(page.getByText('Desconto (KURIO10)')).toBeVisible()
    await expect(page.getByRole('link', { name: /Ver no Etherscan/ })).toHaveAttribute('href', /etherscan\.io\/tx\/simulada-ped_/)

    await app.open('/carrinho')
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
  })

  test('valida o formulário e exige carteira conectada antes da revisão', async ({ app, page }) => {
    await goToCheckout(app)
    const ens = page.getByRole('textbox', { name: /Nome ENS/ })
    await ens.fill('sem-sufixo')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(page.getByText('Use o formato nome.eth (3 a 32 letras, números ou hífen).')).toBeVisible()
    await expect(ens).toHaveAttribute('aria-invalid', 'true')

    await ens.fill('anasouza.eth')
    await page.getByRole('button', { name: 'Confirmar compra' }).click()
    await expect(app.toast('Conecte a carteira selecionada antes de revisar o pedido.')).toBeVisible()
    await expect(page.getByRole('dialog', { name: 'Revise seu pedido' })).toBeHidden()
  })

  test('rascunho do formulário sobrevive ao refresh', async ({ app, page }) => {
    await goToCheckout(app)
    await page.getByRole('textbox', { name: 'Observação do colecionador (opcional)' }).fill('Entregar na carteira principal')
    await app.reload()
    await expect(page.getByRole('textbox', { name: 'Observação do colecionador (opcional)' })).toHaveValue('Entregar na carteira principal')
  })

  test('clique repetido em confirmar gera um único pedido', async ({ app, page }) => {
    await goToCheckout(app)
    await connectWallet(app)
    const dialog = await openReview(app)
    const confirm = dialog.getByRole('button', { name: 'Confirmar pagamento' })
    await confirm.evaluate((button: HTMLButtonElement) => {
      button.click()
      button.click()
      button.click()
    })
    await expect(page).toHaveURL(/\/pedidos\/ped_/)
    expect(await app.orders()).toHaveLength(1)
  })

  test.describe('carteira recusa a conexão', () => {
    test.use({ scenario: 'carteira-recusada' })

    test('mostra o erro e mantém a carteira desconectada', async ({ app, page }) => {
      await goToCheckout(app)
      await page.getByRole('button', { name: 'Conectar carteira' }).click()
      await expect(app.toast('Conexão recusada')).toBeVisible()
      await expect(page.getByRole('button', { name: 'Conectar carteira' })).toBeEnabled()
    })
  })

  test.describe('pagamento recusado', () => {
    test.use({ scenario: 'pagamento-recusado' })

    test('exibe a recusa e preserva o carrinho', async ({ app, page }) => {
      await goToCheckout(app)
      await connectWallet(app)
      const dialog = await openReview(app)
      await dialog.getByRole('button', { name: 'Confirmar pagamento' }).click()
      await expect(page.getByRole('heading', { name: 'Pagamento recusado' })).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText('A carteira recusou a assinatura da transação.')).toBeVisible()

      await page.getByRole('link', { name: 'Voltar ao carrinho' }).click()
      await expect(app.cartLine('Golden Signal #160')).toBeVisible()
    })
  })

  test.describe('timeout após criar o pedido', () => {
    test.use({ scenario: 'timeout-pedido' })

    test('reenvia com a mesma chave de idempotência e recupera o mesmo pedido', async ({ app, page }) => {
      test.slow()
      await goToCheckout(app)
      await connectWallet(app)
      const dialog = await openReview(app)
      await dialog.getByRole('button', { name: 'Confirmar pagamento' }).click()
      await expect(dialog.getByRole('button', { name: 'Enviando pedido…' })).toBeDisabled()

      await expect(page).toHaveURL(/\/pedidos\/ped_/, { timeout: 20_000 })
      const orders = await app.orders()
      expect(orders).toHaveLength(1)
      expect(page.url()).toContain(orders[0].id)
    })

    test('refresh durante o envio retoma o pedido em andamento', async ({ app, page }) => {
      test.slow()
      await goToCheckout(app)
      await connectWallet(app)
      const dialog = await openReview(app)
      await dialog.getByRole('button', { name: 'Confirmar pagamento' }).click()
      await expect.poll(() => app.orders()).toHaveLength(1)

      await app.reload()
      await expect(page).toHaveURL(/\/pedidos\/ped_/, { timeout: 15_000 })
      await expect(app.toast('Recuperamos seu pedido em andamento')).toBeVisible()
      expect(await app.orders()).toHaveLength(1)
    })
  })

  test.describe('preço alterado na confirmação', () => {
    test.use({ scenario: 'preco-alterado' })

    test('pede nova revisão e conclui com os valores atualizados', async ({ app, page }) => {
      await goToCheckout(app)
      await connectWallet(app)
      const dialog = await openReview(app)
      await dialog.getByRole('button', { name: 'Confirmar pagamento' }).click()

      await expect(dialog.getByText(/Preços, disponibilidade ou taxas mudaram/)).toBeVisible()
      await dialog.getByRole('button', { name: 'Usar novos valores' }).click()
      await expect(dialog.getByText('0.556 ETH')).toBeVisible()
      await dialog.getByRole('button', { name: 'Confirmar pagamento' }).click()
      await expect(page).toHaveURL(/\/pedidos\/ped_/)
      expect(await app.orders()).toHaveLength(1)
    })
  })

  test.describe('edição esgota na confirmação', () => {
    test.use({ scenario: 'edicao-esgotada' })

    test('fecha a revisão e orienta a revisar o carrinho', async ({ app, page }) => {
      await goToCheckout(app)
      await connectWallet(app)
      const dialog = await openReview(app)
      await dialog.getByRole('button', { name: 'Confirmar pagamento' }).click()

      await expect(app.toast('Disponibilidade alterada')).toBeVisible()
      await expect(dialog).toBeHidden()
      await expect(page.getByRole('link', { name: 'Revisar carrinho' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()
      expect(await app.orders()).toHaveLength(0)
    })
  })
})
