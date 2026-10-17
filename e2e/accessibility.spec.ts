import type { Locator, Page } from '@playwright/test'
import { connectWallet, goToCheckout } from './support/checkout'
import { expect, test } from './support/fixtures'

async function focusStaysInside(page: Page, container: Locator, presses = 12) {
  for (let index = 0; index < presses; index += 1) {
    await page.keyboard.press('Tab')
    expect(await container.evaluate((element) => element.contains(document.activeElement))).toBe(true)
  }
}

test.describe('Teclado e foco', () => {
  test('link de pular conteúdo é o primeiro foco e leva ao conteúdo principal', async ({ app, page }) => {
    await app.open('/')
    await page.keyboard.press('Tab')
    const skip = page.getByRole('link', { name: 'Pular para o conteúdo' })
    await expect(skip).toBeFocused()
    await expect(skip).toBeVisible()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/#conteudo$/)
  })

  test('diálogo de login prende o foco, valida pelo teclado e fecha com Escape', async ({ app, page }) => {
    await app.open('/entrar')
    const dialog = app.authDialog()
    await expect(dialog).toBeVisible()
    expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true)

    await focusStaysInside(page, dialog)

    await dialog.getByRole('textbox', { name: 'E-mail', exact: true }).focus()
    await page.keyboard.type('ana@kurio.dev')
    await page.keyboard.press('Enter')
    const passwordError = dialog.getByText('Informe sua senha.')
    await expect(passwordError).toBeVisible()
    await expect(dialog.getByRole('textbox', { name: 'Senha', exact: true })).toBeFocused()
    await expect(dialog.getByRole('textbox', { name: 'Senha', exact: true })).toHaveAttribute('aria-invalid', 'true')

    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(page).toHaveURL(/localhost:\d+\/$/)
  })

  test('login completo somente com teclado', async ({ app, page }) => {
    await app.open('/entrar')
    const dialog = app.authDialog()
    await dialog.getByRole('textbox', { name: 'E-mail', exact: true }).focus()
    await page.keyboard.type('bruno@kurio.dev')
    await page.keyboard.press('Tab')
    await page.keyboard.type('Kurio@2026')
    await page.keyboard.press('Enter')
    await expect(dialog).toBeHidden()
    await expect(app.toast('Bem-vindo de volta!')).toBeVisible()
  })

  test('zoom da imagem do NFT devolve o foco ao botão de origem', async ({ app, page }) => {
    test.skip(app.isMobile, 'O zoom da galeria está disponível apenas no desktop.')
    await app.openNft('emerald-ape-042')
    const trigger = page.getByRole('button', { name: 'Ampliar imagem' })
    await trigger.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Emerald Ape #042' })
    await expect(dialog).toBeVisible()
    await focusStaysInside(page, dialog, 4)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(trigger).toBeFocused()
  })

  test('edição e quantidade do NFT funcionam pelo teclado', async ({ app, page }) => {
    test.skip(app.isMobile, 'No celular a quantidade fica na barra fixa, coberta pelos testes de carrinho.')
    await app.openNft('golden-signal-160')
    const selected = page.getByRole('radio', { name: '1/50' })
    await selected.focus()
    await page.keyboard.press('ArrowRight')
    await expect(page.getByRole('radio', { name: 'ABERTA' })).toBeChecked()
    await expect(page.getByRole('radio', { name: 'ABERTA' })).toBeFocused()

    await page.getByRole('button', { name: 'Aumentar quantidade' }).focus()
    await page.keyboard.press('Enter')
    await page.keyboard.press('Space')
    await expect(page.getByRole('group', { name: 'Quantidade' }).getByRole('status')).toHaveText('3')
  })

  test('filtros do catálogo respondem a Espaço e o painel móvel fecha com Escape', async ({ app, page }) => {
    await app.open('/')
    if (app.isMobile) {
      const trigger = page.getByRole('button', { name: 'Filtros', exact: true })
      await trigger.focus()
      await page.keyboard.press('Enter')
      const sheet = page.getByRole('dialog', { name: 'Filtros' })
      await expect(sheet).toBeVisible()
      await sheet.getByRole('checkbox', { name: /^Fotografia/ }).focus()
      await page.keyboard.press('Space')
      await expect(page).toHaveURL(/colecoes=fotografia/)
      await focusStaysInside(page, sheet, 6)
      await page.keyboard.press('Escape')
      await expect(sheet).toBeHidden()
      await expect(page.getByRole('button', { name: 'Filtros, 1 ativos' })).toBeFocused()
      return
    }
    const filters = page.getByRole('complementary', { name: 'Filtros do catálogo' })
    await filters.getByRole('checkbox', { name: /^Fotografia/ }).focus()
    await page.keyboard.press('Space')
    await expect(page).toHaveURL(/colecoes=fotografia/)
    await expect(filters.getByRole('checkbox', { name: /^Fotografia/ })).toBeChecked()
  })

  test('revisão do pedido prende o foco e Escape devolve ao botão de confirmar', async ({ app, page }) => {
    await goToCheckout(app)
    await connectWallet(app)
    const confirm = page.getByRole('button', { name: 'Confirmar compra' })
    await confirm.focus()
    await page.keyboard.press('Enter')
    const dialog = page.getByRole('dialog', { name: 'Revise seu pedido' })
    await expect(dialog).toBeVisible()
    await focusStaysInside(page, dialog, 5)
    await page.keyboard.press('Escape')
    await expect(dialog).toBeHidden()
    await expect(confirm).toBeFocused()
  })
})
