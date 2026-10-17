import { USERS, expect, test, type KurioApp } from './support/fixtures'

function summary(app: KurioApp) {
  return app.page.getByRole('complementary', { name: 'Resumo da carteira' })
}

function couponInput(app: KurioApp) {
  return app.page.getByRole('textbox', { name: 'Código promocional' })
}

test.describe('Favoritos', () => {
  test('visitante é enviado ao login ao tentar favoritar', async ({ app, page }) => {
    await app.open('/')
    await page.getByRole('button', { name: 'Favoritar Golden Signal #160' }).click()
    await expect(page).toHaveURL(/\/entrar/)
    await expect(app.toast('Entre na sua conta para salvar favoritos.')).toBeVisible()
  })

  test('favoritar é otimista e persiste após recarregar', async ({ app, page }) => {
    await app.login(USERS.bruno)
    await page.getByRole('button', { name: 'Favoritar Golden Signal #160' }).click()
    await expect(page.getByRole('button', { name: 'Remover Golden Signal #160 dos favoritos' })).toBeVisible()
    await expect(app.toast('Adicionado aos favoritos')).toBeVisible()

    await app.open('/perfil')
    await expect(page.getByRole('region', { name: 'Meus favoritos' }).getByRole('article', { name: 'Golden Signal #160' })).toBeVisible()
  })

  test.describe('falha no servidor', () => {
    test.use({ scenario: 'falha-favoritos' })

    test('reverte o estado otimista e informa o erro', async ({ app, page }) => {
      await app.login(USERS.ana)
      await app.openNft('golden-signal-160')
      const toggle = app.visible(page.getByRole('button', { name: 'Favoritar', exact: true }))
      await toggle.click()
      await expect(app.toast('Não foi possível favoritar')).toBeVisible()
      await expect(app.visible(page.getByRole('button', { name: 'Favoritar', exact: true }))).toHaveAttribute('aria-pressed', 'false')

      await app.open('/perfil')
      await expect(page.getByRole('region', { name: 'Meus favoritos' }).getByRole('article')).toHaveCount(2)
    })
  })
})

test.describe('Carrinho', () => {
  test('ajusta quantidade, recalcula totais e remove itens', async ({ app, page }) => {
    await app.addToCart('golden-signal-160')
    const line = app.cartLine('Golden Signal #160')
    await expect(line.getByRole('group', { name: 'Quantidade de Golden Signal #160' }).getByRole('status')).toHaveText('1')
    await expect(summary(app).getByText('0.406 ETH')).toBeVisible()

    await line.getByRole('button', { name: 'Aumentar quantidade' }).click()
    await expect(line.getByRole('status')).toHaveText('2')
    await expect(summary(app).getByText('0.796 ETH')).toBeVisible()

    await line.getByRole('button', { name: 'Diminuir quantidade' }).click()
    await expect(line.getByRole('status')).toHaveText('1')
    await expect(line.getByRole('button', { name: 'Diminuir quantidade' })).toBeDisabled()

    await app.visible(line.getByRole('button', { name: 'Remover Golden Signal #160' })).click()
    await expect(app.toast('Golden Signal #160 removido do carrinho')).toBeVisible()
    await expect(page.getByText('Seu carrinho está vazio')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeDisabled()
  })

  test('cupom inválido, expirado e válido', async ({ app, page }) => {
    await app.addToCart('golden-signal-160', { quantity: 2 })
    const apply = summary(app).getByRole('button', { name: 'Aplicar' })

    await couponInput(app).fill('NAOEXISTE')
    await apply.click()
    await expect(summary(app).getByRole('alert')).toHaveText('Cupom não encontrado.')
    await expect(couponInput(app)).toHaveAttribute('aria-invalid', 'true')

    await couponInput(app).fill('VERAO24')
    await apply.click()
    await expect(summary(app).getByRole('alert')).toHaveText('Cupom expirado.')

    await couponInput(app).fill('kurio10')
    await apply.click()
    await expect(app.toast('Cupom KURIO10 aplicado: 10% de desconto')).toBeVisible()
    await expect(summary(app).getByText('Desconto (KURIO10)')).toBeVisible()
    await expect(summary(app).getByText('0.718 ETH')).toBeVisible()

    await summary(app).getByRole('button', { name: 'Remover cupom KURIO10' }).click()
    await expect(summary(app).getByText('Desconto do lançamento')).toBeVisible()
    await expect(summary(app).getByText('0.796 ETH')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeEnabled()
  })

  test('carrinho do visitante persiste no refresh e é unido à conta no login', async ({ app, page }) => {
    await app.addToCart('golden-signal-160', { quantity: 2 })
    await couponInput(app).fill('GENESIS25')
    await summary(app).getByRole('button', { name: 'Aplicar' }).click()
    await expect(summary(app).getByText('Desconto (GENESIS25)')).toBeVisible()

    await app.reload()
    await expect(app.cartLine('Golden Signal #160').getByRole('status')).toHaveText('2')
    await expect(summary(app).getByText('Desconto (GENESIS25)')).toBeVisible()

    await page.getByRole('button', { name: 'Conectar e finalizar' }).click()
    await expect(page).toHaveURL(/\/entrar\?redirect=(%2F|\/)pagamento/)
    await app.submitLogin(USERS.bruno)
    await expect(page).toHaveURL(/\/pagamento$/)
    await expect(page.getByRole('complementary', { name: 'Seus NFTs' }).getByText('Golden Signal #160')).toBeVisible()

    await app.open('/carrinho')
    await expect(app.cartLine('Golden Signal #160').getByRole('status')).toHaveText('2')
    await app.reload()
    await expect(app.cartLine('Golden Signal #160').getByRole('status')).toHaveText('2')
  })

  test('mudança de preço enquanto o item está no carrinho exige aceite', async ({ app, page }) => {
    await app.addToCart('golden-signal-160')
    await app.waitForRealtime()
    await app.updateEdition('golden-signal-160', '1-50', { priceEth: '0.55' })

    await expect(app.toast('O preço de Golden Signal #160 mudou')).toBeVisible()
    const alert = page.getByRole('region', { name: 'Itens do carrinho' }).getByRole('alert')
    await expect(alert).toContainText('Golden Signal #160 (1/50): de 0.39 ETH para 0.55 ETH')
    await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeDisabled()

    await alert.getByRole('button', { name: 'Aceitar novos preços' }).click()
    await expect(alert).toBeHidden()
    await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeEnabled()
    await expect(summary(app).getByText('0.566 ETH')).toBeVisible()
  })

  test('edição esgotada no carrinho bloqueia a finalização', async ({ app, page }) => {
    await app.addToCart('golden-signal-160')
    await app.waitForRealtime()
    await app.updateEdition('golden-signal-160', '1-50', { available: 0 })

    await expect(app.toast('Golden Signal #160 (1/50) esgotou')).toBeVisible()
    await expect(page.getByRole('region', { name: 'Itens do carrinho' }).getByRole('alert')).toContainText('esgotou. Remova o item para continuar.')
    await expect(app.cartLine('Golden Signal #160').getByText('Esgotado')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Conectar e finalizar' })).toBeDisabled()
  })
})
