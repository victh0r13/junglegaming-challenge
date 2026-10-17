import type { Page } from '@playwright/test'
import { connectWallet, goToCheckout } from './support/checkout'
import { expect, test } from './support/fixtures'

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() =>
    Array.from(document.images)
      .filter((image) => {
        const box = image.getBoundingClientRect()
        return box.width > 0 && box.top < window.innerHeight && box.bottom > 0
      })
      .every((image) => image.complete && image.naturalWidth > 0),
  )
  await page.locator('[data-sonner-toast]').evaluateAll((toasts) => toasts.forEach((toast) => toast.remove()))
}

function screenshotOptions(page: Page) {
  return { mask: [page.getByRole('button', { name: 'Cenários' })] }
}

test.describe('Regressão visual', () => {
  test('início', async ({ app, page }) => {
    await app.open('/')
    await expect(page.getByRole('region', { name: 'Catálogo de NFTs' }).getByRole('article')).toHaveCount(9)
    await settle(page)
    await expect(page).toHaveScreenshot('inicio.png', screenshotOptions(page))

    const catalog = page.getByRole('region', { name: 'Catálogo de NFTs' })
    await catalog.scrollIntoViewIfNeeded()
    await settle(page)
    await expect(catalog).toHaveScreenshot('inicio-catalogo.png', screenshotOptions(page))
  })

  test('detalhe do NFT', async ({ app, page }) => {
    await app.openNft('emerald-ape-042')
    await expect(page.getByRole('heading', { name: 'Emerald Ape #042', level: 1 })).toBeVisible()
    await settle(page)
    await expect(page).toHaveScreenshot('detalhe.png', screenshotOptions(page))
  })

  test('carrinho', async ({ app, page }) => {
    await app.addToCart('golden-signal-160', { quantity: 2 })
    await page.getByRole('textbox', { name: 'Código promocional' }).fill('KURIO10')
    await page.getByRole('complementary', { name: 'Resumo da carteira' }).getByRole('button', { name: 'Aplicar' }).click()
    await expect(page.getByText('Desconto (KURIO10)')).toBeVisible()
    await page.mouse.move(0, 0)
    await settle(page)
    await expect(page).toHaveScreenshot('carrinho.png', screenshotOptions(page))
  })

  test('pagamento', async ({ app, page }) => {
    await goToCheckout(app, { quantity: 2 })
    await connectWallet(app)
    await page.mouse.move(0, 0)
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur())
    await page.evaluate(() => window.scrollTo(0, 0))
    await settle(page)
    await expect(page).toHaveScreenshot('pagamento.png', { ...screenshotOptions(page), fullPage: true })
  })
})
