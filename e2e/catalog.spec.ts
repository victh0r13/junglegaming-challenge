import { expect, test, type KurioApp } from './support/fixtures'

function catalog(app: KurioApp) {
  return app.page.getByRole('region', { name: 'Catálogo de NFTs' })
}

function cards(app: KurioApp) {
  return catalog(app).getByRole('article')
}

function resultStatus(app: KurioApp) {
  return catalog(app).getByRole('status')
}

async function openFilters(app: KurioApp) {
  if (!app.isMobile) return app.page.getByRole('complementary', { name: 'Filtros do catálogo' })
  const sheet = app.page.getByRole('dialog', { name: 'Filtros' })
  if (!(await sheet.isVisible())) await catalog(app).getByRole('button', { name: /^Filtros/ }).click()
  await expect(sheet).toBeVisible()
  return sheet
}

async function expectAllNames(app: KurioApp, predicate: (name: string) => boolean) {
  await expect
    .poll(async () => {
      const names = await cards(app).getByRole('heading', { level: 3 }).allTextContents()
      return names.length > 0 && names.every(predicate)
    })
    .toBe(true)
}

test.describe('Catálogo', () => {
  test('busca com debounce reflete na URL e mostra estado vazio com ação de limpar', async ({ app, page }) => {
    await app.open('/')
    await expect(resultStatus(app)).toHaveText('45 NFTs encontrados. Página 1 de 5.')

    await catalog(app).getByRole('searchbox', { name: 'Buscar NFTs' }).fill('golden')
    await expect(page).toHaveURL(/busca=golden/)
    await expectAllNames(app, (name) => name.toLowerCase().includes('golden'))

    await catalog(app).getByRole('searchbox', { name: 'Buscar NFTs' }).fill('inexistente-xyz')
    await expect(catalog(app).getByText('Nenhum NFT encontrado')).toBeVisible()
    await catalog(app).getByRole('button', { name: 'Limpar busca' }).click()
    await expect(page).not.toHaveURL(/busca=/)
    await expect(resultStatus(app)).toContainText('45 NFTs encontrados')
  })

  test('filtros de coleção e rede combinam e o contador de resultados acompanha', async ({ app, page }) => {
    await app.open('/')
    let filters = await openFilters(app)
    await filters.getByText('Música', { exact: true }).click()
    await expect(page).toHaveURL(/colecoes=musica/)
    await expect(resultStatus(app)).toContainText('5 NFTs encontrados')

    filters = await openFilters(app)
    await filters.getByText('Ethereum', { exact: true }).click()
    await expect(page).toHaveURL(/colecoes=musica.*redes=ethereum|redes=ethereum.*colecoes=musica/)
    await expect(filters.getByRole('checkbox', { name: /^Música/ })).toBeChecked()
    await expect
      .poll(async () => Number((await resultStatus(app).textContent())?.match(/(\d+) NFTs/)?.[1]))
      .toBeLessThanOrEqual(5)

    filters = await openFilters(app)
    await filters.getByRole('button', { name: 'Limpar filtros' }).click()
    await expect(resultStatus(app)).toContainText('45 NFTs encontrados')
  })

  test('ordenação por menor preço e por nome', async ({ app, page }) => {
    await app.open('/')
    const sort = catalog(app).getByRole('combobox', { name: 'Ordenar por:' })

    await sort.selectOption({ label: 'Menor preço' })
    await expect(page).toHaveURL(/ordem=preco-asc/)
    await expect(cards(app).first()).toContainText('0.09 ETH')

    await sort.selectOption({ label: 'Nome (A–Z)' })
    await expect(page).toHaveURL(/ordem=nome/)
    await expect
      .poll(async () => {
        const names = await cards(app).getByRole('heading', { level: 3 }).allTextContents()
        return names.join('|') === [...names].sort((a, b) => a.localeCompare(b, 'pt-BR')).join('|')
      })
      .toBe(true)
  })

  test('paginação, abas e histórico do navegador preservam o estado na URL', async ({ app, page }) => {
    await app.open('/')
    const firstPage = await cards(app).first().getByRole('heading').textContent()

    await catalog(app).getByRole('button', { name: 'Próxima página' }).click()
    await expect(page).toHaveURL(/pagina=2/)
    await expect(resultStatus(app)).toContainText('Página 2 de 5')
    await expect(cards(app).first().getByRole('heading')).not.toHaveText(firstPage!)

    await catalog(app).getByRole('button', { name: 'Página 5' }).click()
    await expect(resultStatus(app)).toContainText('Página 5 de 5')
    await expect(catalog(app).getByRole('button', { name: 'Próxima página' })).toBeDisabled()

    await page.goBack()
    await expect(resultStatus(app)).toContainText('Página 2 de 5')
    await page.goBack()
    await expect(resultStatus(app)).toContainText('Página 1 de 5')
    await page.goForward()
    await expect(resultStatus(app)).toContainText('Página 2 de 5')

    await catalog(app).getByRole('button', { name: 'Em alta' }).click()
    await expect(page).toHaveURL(/aba=alta/)
    await expect(page).not.toHaveURL(/pagina=/)
    await expect(catalog(app).getByRole('button', { name: 'Em alta' })).toHaveAttribute('aria-pressed', 'true')

    await app.reload()
    await expect(catalog(app).getByRole('button', { name: 'Em alta' })).toHaveAttribute('aria-pressed', 'true')
  })

  test('página fora do intervalo é corrigida para a última página', async ({ app, page }) => {
    await app.open('/?pagina=99')
    await expect(page).toHaveURL(/pagina=5/)
    await expect(resultStatus(app)).toContainText('Página 5 de 5')
  })

  test('respostas fora de ordem não sobrescrevem a busca mais recente', async ({ app, page }) => {
    test.info().annotations.push({ type: 'cenário', description: 'fora-de-ordem' })
    await app.open('/')
    await app.setScenario('fora-de-ordem')
    const search = catalog(app).getByRole('searchbox', { name: 'Buscar NFTs' })
    await search.fill('emerald')
    await search.press('Enter')
    await search.fill('golden')
    await search.press('Enter')
    await expect(page).toHaveURL(/busca=golden/)
    await page.waitForTimeout(2_000)
    await expectAllNames(app, (name) => name.toLowerCase().includes('golden'))
  })
})

test.describe('Carregamento e falhas', () => {
  test.describe('rede lenta', () => {
    test.use({ scenario: 'lento' })

    test('exibe skeletons enquanto o catálogo carrega', async ({ app }) => {
      await app.open('/')
      await expect(catalog(app).getByRole('status')).toHaveText('Carregando NFTs')
      await expect(catalog(app).locator('[aria-busy="true"] [data-slot="skeleton"]').first()).toBeVisible()
      await expect(cards(app).first()).toBeVisible({ timeout: 10_000 })
    })
  })

  test.describe('erro 503 seguido de sucesso', () => {
    test.use({ scenario: 'erro-servidor' })

    test('mostra a falha com retry e recupera quando o servidor volta', async ({ app }) => {
      await app.open('/')
      const alert = catalog(app).getByRole('alert')
      await expect(alert).toContainText('Não foi possível carregar o catálogo', { timeout: 15_000 })
      await alert.getByRole('button', { name: 'Tentar novamente' }).click()
      await expect(cards(app).first()).toBeVisible({ timeout: 10_000 })
    })
  })

  test.describe('catálogo vazio', () => {
    test.use({ scenario: 'catalogo-vazio' })

    test('mostra estado vazio sem ação de limpar', async ({ app }) => {
      await app.open('/')
      await expect(catalog(app).getByText('Nenhum NFT encontrado')).toBeVisible()
      await expect(catalog(app).getByText('Ainda não há NFTs listados nesta seção.')).toBeVisible()
    })
  })

  test.describe('sem conexão', () => {
    test.use({ scenario: 'offline' })

    test('informa a falha de rede no catálogo', async ({ app }) => {
      await app.open('/')
      await expect(catalog(app).getByRole('alert')).toContainText('Sem conexão com o servidor', { timeout: 15_000 })
    })
  })
})

test.describe('Detalhe do NFT', () => {
  test('mostra edições, limita quantidade e bloqueia edição esgotada', async ({ app, page }) => {
    await app.openNft('emerald-ape-042')
    await expect(page).toHaveTitle('Emerald Ape #042 — Kurio')
    await expect(page.getByRole('radio', { name: '1/10 (esgotada)' })).toBeDisabled()
    await expect(page.getByRole('radio', { name: '1/50' })).toBeChecked()
    await expect(page.getByText('5 de 50 disponíveis · máximo de 5 por pedido')).toBeVisible()

    const increase = app.visible(page.getByRole('button', { name: 'Aumentar quantidade' }))
    for (let index = 0; index < 6; index += 1) {
      if (await increase.isEnabled()) await increase.click()
    }
    await expect(increase).toBeDisabled()
    await expect(app.visible(page.getByRole('group', { name: 'Quantidade' }).getByRole('status'))).toHaveText('5')
  })

  test('navega do card para o detalhe e volta preservando o filtro', async ({ app, page }) => {
    test.skip(app.isMobile, 'O cartão móvel usa o mesmo link; o fluxo é coberto no desktop.')
    await app.open('/?ordem=preco-asc')
    await cards(app).first().getByRole('heading').getByRole('link').click()
    await expect(page).toHaveURL(/\/nft\//)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await page.goBack()
    await expect(page).toHaveURL(/ordem=preco-asc/)
    await expect(cards(app).first()).toContainText('0.09 ETH')
  })

  test('NFT inexistente e rota desconhecida exibem 404', async ({ app, page }) => {
    await app.open('/nft/nao-existe-999')
    await expect(page.getByRole('heading', { name: 'NFT não encontrado' })).toBeVisible()
    await expect(page.getByText('ERRO 404')).toBeVisible()

    await app.open('/rota/que/nao/existe')
    await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()
    await page.getByRole('link', { name: 'Voltar ao início' }).click()
    await expect(page).toHaveURL(/\/$/)
  })
})
