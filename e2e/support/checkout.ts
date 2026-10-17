import { USERS, expect, type KurioApp } from './fixtures'

export async function goToCheckout(app: KurioApp, options: { nftId?: string; quantity?: number; coupon?: string } = {}) {
  await app.login(USERS.ana)
  await app.addToCart(options.nftId ?? 'golden-signal-160', { quantity: options.quantity })
  if (options.coupon) {
    await app.page.getByRole('textbox', { name: 'Código promocional' }).fill(options.coupon)
    await app.page.getByRole('complementary', { name: 'Resumo da carteira' }).getByRole('button', { name: 'Aplicar' }).click()
    await expect(app.page.getByText(`Desconto (${options.coupon})`)).toBeVisible()
  }
  await app.page.getByRole('button', { name: 'Conectar e finalizar' }).click()
  await expect(app.page).toHaveURL(/\/pagamento$/)
  await expect(app.page.getByRole('heading', { name: 'Perfil do colecionador' })).toBeVisible()
}

export async function connectWallet(app: KurioApp) {
  await app.page.getByRole('button', { name: 'Conectar carteira' }).click()
  await expect(app.page.getByRole('group', { name: 'Carteira e rede' }).getByText('Conectada')).toBeVisible()
}

export async function openReview(app: KurioApp) {
  await app.page.getByRole('button', { name: 'Confirmar compra' }).click()
  const dialog = app.page.getByRole('dialog', { name: 'Revise seu pedido' })
  await expect(dialog).toBeVisible()
  return dialog
}
