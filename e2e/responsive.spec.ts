import { USERS, expect, test } from './support/fixtures'

const WIDTHS = [390, 768, 1440]
const PAGES = ['/', '/nft/emerald-ape-042', '/carrinho', '/pagamento', '/perfil', '/carteiras', '/rota-inexistente']

test.describe('Responsividade', () => {
  test('nenhuma tela tem overflow horizontal em 390, 768 e 1440 px', async ({ app, page }) => {
    test.skip(app.isMobile, 'O teste define a própria largura de tela.')
    test.slow()
    await app.login(USERS.ana)
    await app.addToCart('golden-signal-160')

    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 })
      for (const path of PAGES) {
        await app.open(path)
        await expect(page.getByRole('heading', { level: 1 }).first()).toBeAttached()
        await page.waitForLoadState('networkidle')
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        expect(overflow, `${path} em ${width}px`).toBeLessThanOrEqual(0)
      }
    }
  })
})
