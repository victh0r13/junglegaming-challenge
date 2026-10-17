import { USERS, expect, test } from './support/fixtures'

test.describe('Navegação', () => {
  test('Mercado rola até o catálogo, inclusive quando a URL já aponta para ele', async ({ app, page }) => {
    test.skip(app.isMobile, 'No celular o atalho é o botão central da tab bar, coberto abaixo.')
    await app.open('/')
    const catalog = page.getByRole('region', { name: 'Catálogo de NFTs' })
    const market = page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Mercado' })

    await market.click()
    await expect(page).toHaveURL(/#catalogo$/)
    await expect(catalog.getByRole('searchbox', { name: 'Buscar NFTs' })).toBeInViewport()

    const search = catalog.getByRole('searchbox', { name: 'Buscar NFTs' })
    await expect
      .poll(async () => {
        await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
        return search.evaluate((element) => element.getBoundingClientRect().bottom < 0)
      })
      .toBe(true)
    await market.click()
    await expect(catalog.getByRole('searchbox', { name: 'Buscar NFTs' })).toBeInViewport()
  })

  test('menu destaca Mercado no catálogo e nenhum item nas páginas da conta', async ({ app, page }) => {
    test.skip(app.isMobile, 'Menu principal existe a partir do tablet.')
    await app.login(USERS.ana)
    const nav = page.getByRole('navigation', { name: 'Principal' })
    await expect(nav.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page')

    await nav.getByRole('link', { name: 'Mercado' }).click()
    await expect(nav.getByRole('link', { name: 'Mercado' })).toHaveAttribute('aria-current', 'page')
    await expect(nav.getByRole('link', { name: 'Início' })).not.toHaveAttribute('aria-current', 'page')

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    await expect(nav.getByRole('link', { name: 'Início' })).toHaveAttribute('aria-current', 'page')

    await app.open('/perfil')
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(0)
  })

  test('atalho do celular rola até o catálogo', async ({ app, page }) => {
    test.skip(!app.isMobile, 'Atalho exclusivo da tab bar do celular.')
    await app.open('/')
    await page.getByRole('link', { name: 'Explorar coleções' }).click()
    await expect(page).toHaveURL(/\/#catalogo$/)
    await expect(page.getByRole('region', { name: 'Catálogo de NFTs' }).getByRole('searchbox', { name: 'Buscar NFTs' })).toBeInViewport()
  })

  test('voltar ao topo aparece depois de rolar e leva ao início da página', async ({ app, page }) => {
    test.skip(app.isMobile, 'O botão é exibido a partir do tablet.')
    await app.open('/')
    const backToTop = page.getByRole('button', { name: 'Voltar ao topo' })
    await expect(backToTop).toBeHidden()

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await expect(backToTop).toBeVisible()
    await backToTop.click()
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0)
    await expect(page.locator('#conteudo')).toBeFocused()
  })

  test('seções fora do escopo avisam que estão indisponíveis', async ({ app, page }) => {
    test.skip(app.isMobile, 'Menu e rodapé completos existem a partir do tablet.')
    await app.open('/')
    const creators = page.getByRole('navigation', { name: 'Principal' }).getByRole('button', { name: /Criadores/ })
    await expect(creators).toHaveAttribute('aria-disabled', 'true')
    await creators.click({ force: true })
    await expect(app.toast('Criadores estará disponível em breve')).toBeVisible()

    await page.getByRole('navigation', { name: 'Central de ajuda' }).getByRole('button', { name: /Como comprar NFTs/ }).click({ force: true })
    await expect(app.toast('Como comprar NFTs estará disponível em breve')).toBeVisible()
    await expect(page).toHaveURL(/localhost:\d+\/$/)
  })
})
