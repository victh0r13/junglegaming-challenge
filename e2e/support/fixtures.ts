import { test as base, expect, type Locator, type Page } from '@playwright/test'

export type ScenarioId =
  | 'padrao'
  | 'lento'
  | 'latencia-variavel'
  | 'fora-de-ordem'
  | 'offline'
  | 'erro-servidor'
  | 'catalogo-vazio'
  | 'sessao-curta'
  | 'falha-favoritos'
  | 'preco-alterado'
  | 'edicao-esgotada'
  | 'timeout-pedido'
  | 'pagamento-recusado'
  | 'confirmacao-lenta'
  | 'carteira-recusada'

export type NftEvent = {
  eventId: string
  type: 'nft.updated'
  resource: { type: 'nft'; id: string }
  version: number
  occurredAt: string
  data: { priceEth: string; available: number; editions: { id: string; priceEth: string; available: number }[] }
}

type MockControl = {
  setScenario(id: ScenarioId): void
  getScenario(): ScenarioId
  reset(): Promise<void>
  updateEdition(nftId: string, editionId: string, change: { priceEth?: string; available?: number }): NftEvent
  lastNftEvent(nftId: string): NftEvent | null
  replayNftEvent(event: NftEvent): void
  dropRealtime(): void
  realtimeOutage(ms: number): void
  connectedClients(): number
  expireSessions(): void
  settleOrder(orderId: string): void
  pendingOrders(): string[]
}

type StoredOrder = { id: string; status: string; idempotencyKey: string; userId: string; totalEth: string }

declare global {
  interface Window {
    __kurioMocks?: MockControl
  }
}

export const USERS = {
  ana: { email: 'ana@kurio.dev', password: 'Kurio@2026', name: 'Ana Souza' },
  bruno: { email: 'bruno@kurio.dev', password: 'Kurio@2026', name: 'Bruno Lima' },
} as const

export class KurioApp {
  constructor(
    readonly page: Page,
    readonly isMobile: boolean,
  ) {}

  async open(path = '/') {
    await this.page.goto(path)
    await this.ready()
  }

  async ready() {
    await this.page.waitForFunction(() => Boolean(window.__kurioMocks) && Boolean(document.getElementById('conteudo')))
  }

  async reload() {
    await this.page.reload()
    await this.ready()
  }

  setScenario(id: ScenarioId) {
    return this.page.evaluate((scenario) => window.__kurioMocks!.setScenario(scenario), id)
  }

  async waitForRealtime() {
    await expect.poll(() => this.page.evaluate(() => window.__kurioMocks!.connectedClients())).toBeGreaterThan(0)
  }

  updateEdition(nftId: string, editionId: string, change: { priceEth?: string; available?: number }) {
    return this.page.evaluate(([id, edition, values]) => window.__kurioMocks!.updateEdition(id, edition, values), [nftId, editionId, change] as const)
  }

  orders() {
    return this.page.evaluate(() => {
      const raw = window.localStorage.getItem('kurio:mock-db')
      const state = raw ? (JSON.parse(raw) as { orders: Record<string, StoredOrder> }) : { orders: {} }
      return Object.values(state.orders)
    })
  }

  toast(text: string | RegExp) {
    return this.page.locator('[data-sonner-toast]').filter({ hasText: text })
  }

  visible(locator: Locator) {
    return locator.filter({ visible: true }).first()
  }

  authDialog() {
    return this.page.getByRole('dialog')
  }

  async login(user: { email: string; password: string } = USERS.ana, redirect?: string) {
    await this.open(redirect ? `/entrar?redirect=${encodeURIComponent(redirect)}` : '/entrar')
    await this.submitLogin(user)
  }

  async submitLogin(user: { email: string; password: string }) {
    const dialog = this.authDialog()
    await dialog.getByRole('textbox', { name: 'E-mail', exact: true }).fill(user.email)
    await dialog.getByRole('textbox', { name: 'Senha', exact: true }).fill(user.password)
    await dialog.getByRole('button', { name: 'Entrar', exact: true }).click()
    await expect(dialog).toBeHidden()
  }

  async logout() {
    await this.open('/perfil')
    await this.page.getByRole('navigation', { name: 'Conta' }).getByRole('button', { name: 'Sair' }).click()
    await expect(this.page).toHaveURL(/\/$/)
  }

  async openNft(nftId: string) {
    await this.open(`/nft/${nftId}`)
    await expect(this.page.getByRole('heading', { level: 1 })).toBeVisible()
  }

  async addToCart(nftId: string, options: { edition?: string; quantity?: number } = {}) {
    await this.openNft(nftId)
    if (options.edition) await this.page.getByRole('radio', { name: options.edition, exact: true }).check()
    const increase = this.visible(this.page.getByRole('button', { name: 'Aumentar quantidade' }))
    for (let count = 1; count < (options.quantity ?? 1); count += 1) await increase.click()
    await this.visible(this.page.getByRole('button', { name: /^(COMPRAR|Comprar NFT)$/ })).click()
    await expect(this.page).toHaveURL(/\/carrinho$/)
    await expect(this.cartLines().first()).toBeVisible()
  }

  cartLines() {
    return this.page.getByRole('region', { name: 'Itens do carrinho' }).getByRole('listitem')
  }

  cartLine(name: string) {
    return this.cartLines().filter({ has: this.page.getByRole('heading', { name, exact: true }) })
  }

  summaryTotal() {
    return this.page.getByRole('complementary').filter({ hasText: 'Total' }).locator('[aria-live="polite"]').last()
  }
}

type Fixtures = {
  scenario: ScenarioId
  app: KurioApp
}

export const test = base.extend<Fixtures>({
  scenario: ['padrao', { option: true }],
  page: async ({ page, scenario }, use) => {
    await page.addInitScript((initial) => {
      if (window.sessionStorage.getItem('e2e:iniciado')) return
      window.sessionStorage.setItem('e2e:iniciado', '1')
      window.localStorage.clear()
      window.localStorage.setItem('kurio:mock-scenario', JSON.stringify(initial))
    }, scenario)
    await use(page)
  },
  app: async ({ page, isMobile }, use) => {
    await use(new KurioApp(page, isMobile))
  },
})

export { expect }
