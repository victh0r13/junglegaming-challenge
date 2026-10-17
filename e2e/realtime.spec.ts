import { connectWallet, goToCheckout, openReview } from './support/checkout'
import { USERS, expect, test, type KurioApp } from './support/fixtures'

const NFT = 'golden-signal-160'

function detailPrice(app: KurioApp, price: string) {
  return app.visible(app.page.getByRole('main').getByText(`${price} ETH`, { exact: true }))
}

test.describe('Tempo real (Socket.IO)', () => {
  test('preço e disponibilidade chegam ao detalhe e ao catálogo sem recarregar', async ({ app, page }) => {
    await app.openNft(NFT)
    await app.waitForRealtime()
    await expect(detailPrice(app, '0.39')).toBeVisible()

    await app.updateEdition(NFT, '1-50', { priceEth: '0.42', available: 3 })
    await expect(detailPrice(app, '0.42')).toBeVisible()
    await expect(page.getByText('3 de 50 disponíveis · máximo de 5 por pedido')).toBeVisible()

    await app.updateEdition(NFT, '1-50', { available: 0 })
    await expect(page.getByRole('radio', { name: '1/50 (esgotada)' })).toBeDisabled()
    await expect(page.getByRole('radio', { name: '1/50 (esgotada)' })).not.toBeChecked()
    await expect(page.getByRole('group', { name: 'Edição:' }).getByRole('radio', { checked: true })).toHaveCount(1)
  })

  test('eventos duplicados e com versão antiga são ignorados', async ({ app, page }) => {
    await app.openNft(NFT)
    await app.waitForRealtime()

    const older = await app.updateEdition(NFT, '1-50', { priceEth: '0.50' })
    await expect(detailPrice(app, '0.50')).toBeVisible()
    const latest = await app.updateEdition(NFT, '1-50', { priceEth: '0.60' })
    await expect(detailPrice(app, '0.60')).toBeVisible()

    const tampered = (priceEth: string) => ({
      ...latest,
      data: { ...latest.data, priceEth, editions: latest.data.editions.map((edition) => (edition.id === '1-50' ? { ...edition, priceEth } : edition)) },
    })

    await page.evaluate((event) => window.__kurioMocks!.replayNftEvent(event), tampered('9.99'))
    await page.evaluate(
      (event) => window.__kurioMocks!.replayNftEvent(event),
      { ...older, eventId: `${older.eventId}-reenviado`, data: { ...older.data, priceEth: '7.77' } },
    )
    await page.waitForTimeout(500)
    await expect(detailPrice(app, '0.60')).toBeVisible()
    await expect(page.getByText('9.99 ETH')).toHaveCount(0)
    await expect(page.getByText('7.77 ETH')).toHaveCount(0)

    await page.evaluate(
      (event) => window.__kurioMocks!.replayNftEvent(event),
      { ...tampered('0.65'), eventId: `${latest.eventId}-novo`, version: latest.version + 1 },
    )
    await expect(detailPrice(app, '0.65')).toBeVisible()
  })

  test('desconexão mostra aviso e a reconexão reconcilia eventos perdidos via REST', async ({ app, page }) => {
    await app.openNft(NFT)
    await app.waitForRealtime()

    await page.evaluate(() => window.__kurioMocks!.realtimeOutage(2_500))
    await expect(page.getByText('Atualizações em tempo real indisponíveis. Reconectando…')).toBeVisible()
    await app.updateEdition(NFT, '1-50', { priceEth: '0.77' })
    await expect(detailPrice(app, '0.39')).toBeVisible()

    await expect(page.getByText('Atualizações em tempo real indisponíveis. Reconectando…')).toBeHidden({ timeout: 10_000 })
    await expect(detailPrice(app, '0.77')).toBeVisible()
  })

  test('mudança de preço durante a revisão do pagamento exige confirmar novos valores', async ({ app, page }) => {
    await goToCheckout(app)
    await app.waitForRealtime()
    await connectWallet(app)
    const dialog = await openReview(app)
    await expect(dialog.getByText('0.406 ETH')).toBeVisible()

    await app.updateEdition(NFT, '1-50', { priceEth: '0.45' })
    await expect(dialog.getByText('Os preços, a disponibilidade ou as taxas mudaram desde a sua revisão.', { exact: false })).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Confirmar pagamento' })).toHaveCount(0)

    await dialog.getByRole('button', { name: 'Usar novos valores' }).click()
    await expect(dialog.getByText('0.466 ETH')).toBeVisible()
    await dialog.getByRole('button', { name: 'Confirmar pagamento' }).click()
    await expect(page).toHaveURL(/\/pedidos\/ped_/)
  })

  test('edição esgotada durante o pagamento bloqueia a compra', async ({ app, page }) => {
    await goToCheckout(app)
    await app.waitForRealtime()
    await app.updateEdition(NFT, '1-50', { available: 0 })
    await expect(app.toast('Golden Signal #160 (1/50) esgotou')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Revisar carrinho' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Confirmar compra' })).toBeDisabled()
  })

  test.describe('pedido pendente', () => {
    test.use({ scenario: 'confirmacao-lenta' })

    test('sobrevive ao refresh e é confirmado pelo evento order.updated', async ({ app, page }) => {
      await goToCheckout(app)
      await connectWallet(app)
      const dialog = await openReview(app)
      await dialog.getByRole('button', { name: 'Confirmar pagamento' }).click()
      await expect(page.getByRole('heading', { name: 'Aguardando confirmação' })).toBeVisible()
      const orderUrl = page.url()

      await app.reload()
      expect(page.url()).toBe(orderUrl)
      await expect(page.getByRole('heading', { name: 'Aguardando confirmação' })).toBeVisible()
      await app.waitForRealtime()

      const [orderId] = await page.evaluate(() => window.__kurioMocks!.pendingOrders())
      expect(orderUrl).toContain(orderId)
      await page.evaluate((id) => window.__kurioMocks!.settleOrder(id), orderId)
      await expect(app.toast('Pagamento confirmado na rede')).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Compra confirmada!' })).toBeVisible()
    })

    test('voltar ao pagamento com pedido pendente leva ao mesmo pedido', async ({ app, page }) => {
      await goToCheckout(app)
      await connectWallet(app)
      const dialog = await openReview(app)
      await dialog.getByRole('button', { name: 'Confirmar pagamento' }).click()
      await expect(page.getByRole('heading', { name: 'Aguardando confirmação' })).toBeVisible()
      const orderUrl = page.url()

      await app.open('/pagamento')
      await expect(page).toHaveURL(orderUrl)
      expect(await app.orders()).toHaveLength(1)
    })

    test('confirmação ocorrida durante a desconexão aparece após reconectar', async ({ app, page }) => {
      await app.login(USERS.ana)
      await app.addToCart(NFT)
      await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
      await connectWallet(app)
      const dialog = await openReview(app)
      await dialog.getByRole('button', { name: 'Confirmar pagamento' }).click()
      await expect(page.getByRole('heading', { name: 'Aguardando confirmação' })).toBeVisible()
      await app.waitForRealtime()

      await page.evaluate(() => window.__kurioMocks!.realtimeOutage(2_000))
      await expect(page.getByText('Atualizações em tempo real indisponíveis. Reconectando…')).toBeVisible()
      const [orderId] = await page.evaluate(() => window.__kurioMocks!.pendingOrders())
      await page.evaluate((id) => window.__kurioMocks!.settleOrder(id), orderId)

      await expect(page.getByRole('heading', { name: 'Compra confirmada!' })).toBeVisible({ timeout: 10_000 })
    })
  })
})
