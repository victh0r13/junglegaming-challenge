import type { Cart, CartItem, Network, NftSummary, Quote, QuoteIssue } from '@/api/contracts'
import { addEth, compareEth, multiplyEth, percentOfEth, subtractEth, toWei } from '@/lib/eth'
import { db, type DbCart, type DbOrder, type DbQuote } from './db'
import type { SeedNft } from './fixtures/nfts'
import { fail, nowIso } from './http'
import { emitNftUpdated, emitOrderUpdated } from './realtime'
import { scenario } from './scenarios'

export function findNft(id: string) {
  return db.data.nfts.find((nft) => nft.id === id)
}

export function toSummary(nft: SeedNft): NftSummary {
  const { id, name, tokenId, collection, network, image, priceEth, previousPriceEth, available, badge, version, createdAt } = nft
  return { id, name, tokenId, collection, network, image, priceEth, previousPriceEth, available, badge, version, createdAt }
}

export function toDetail(nft: SeedNft) {
  const { trending: _trending, ...detail } = nft
  return detail
}

export function commitNftChange(nft: SeedNft) {
  const defaultEdition = nft.editions.find((edition) => edition.id === '1-50') ?? nft.editions[0]
  if (compareEth(defaultEdition.priceEth, nft.priceEth) !== 0) {
    nft.previousPriceEth = nft.priceEth
    nft.priceEth = defaultEdition.priceEth
  }
  nft.available = nft.editions.reduce((sum, edition) => sum + edition.available, 0)
  nft.version += 1
  db.persist()
  return emitNftUpdated(nft)
}

export function updateEdition(nftId: string, editionId: string, change: { priceEth?: string; available?: number }) {
  const nft = findNft(nftId) ?? fail('NOT_FOUND', 'NFT não encontrado.')
  const edition = nft.editions.find((e) => e.id === editionId) ?? fail('NOT_FOUND', 'Edição não encontrada.')
  if (change.priceEth !== undefined) edition.priceEth = change.priceEth
  if (change.available !== undefined) edition.available = Math.max(0, change.available)
  return commitNftChange(nft)
}

export const COUPONS: Record<string, { percentOff: number; expiresAt: string }> = {
  KURIO10: { percentOff: 10, expiresAt: '2099-12-31T23:59:59Z' },
  GENESIS25: { percentOff: 25, expiresAt: '2099-12-31T23:59:59Z' },
  VERAO24: { percentOff: 15, expiresAt: '2024-03-20T23:59:59Z' },
}

export function validateCoupon(rawCode: string) {
  const code = rawCode.trim().toUpperCase()
  const coupon = COUPONS[code]
  if (!coupon) fail('COUPON_INVALID', 'Cupom inválido.', { code: 'Cupom não encontrado.' })
  if (Date.parse(coupon.expiresAt) < Date.now()) fail('COUPON_EXPIRED', 'Este cupom expirou.', { code: 'Cupom expirado.' })
  return { code, percentOff: coupon.percentOff }
}

export function emptyCart(): Cart {
  return { id: null, items: [], coupon: null, version: 0, updatedAt: nowIso() }
}

export function resolveCart(userId: string | null, guestCartId: string | null): DbCart | null {
  if (userId) return Object.values(db.data.carts).find((cart) => cart.ownerId === userId) ?? null
  if (!guestCartId) return null
  const cart = db.data.carts[guestCartId]
  return cart && cart.ownerId === null ? cart : null
}

export function ensureCart(userId: string | null, guestCartId: string | null): DbCart {
  const existing = resolveCart(userId, guestCartId)
  if (existing) return existing
  const cart: DbCart = { id: db.nextId('cart'), ownerId: userId, items: [], coupon: null, version: 0, updatedAt: nowIso() }
  db.data.carts[cart.id] = cart
  return cart
}

export function touchCart(cart: DbCart) {
  cart.version += 1
  cart.updatedAt = nowIso()
  db.persist()
}

export function itemLimit(nftId: string, editionId: string) {
  const nft = findNft(nftId) ?? fail('NOT_FOUND', 'NFT não encontrado.')
  const edition = nft.editions.find((e) => e.id === editionId) ?? fail('NOT_FOUND', 'Edição não encontrada.')
  return { nft, edition, max: Math.min(edition.available, edition.maxPerOrder) }
}

export function toCartView(cart: DbCart | null): Cart {
  if (!cart) return emptyCart()
  const items: CartItem[] = cart.items.flatMap((item) => {
    const nft = findNft(item.nftId)
    const edition = nft?.editions.find((e) => e.id === item.editionId)
    if (!nft || !edition) return []
    const status: CartItem['status'] =
      edition.available === 0
        ? 'sold_out'
        : item.quantity > edition.available
          ? 'insufficient'
          : compareEth(edition.priceEth, item.acknowledgedPriceEth) !== 0
            ? 'price_changed'
            : 'ok'
    return [
      {
        id: item.id,
        nftId: nft.id,
        editionId: edition.id,
        editionLabel: edition.label,
        name: nft.name,
        tokenId: nft.tokenId,
        image: nft.image,
        quantity: item.quantity,
        unitPriceEth: edition.priceEth,
        acknowledgedPriceEth: item.acknowledgedPriceEth,
        available: edition.available,
        maxQuantity: Math.min(edition.available, edition.maxPerOrder),
        status,
        nftVersion: nft.version,
      },
    ]
  })
  const coupon = cart.coupon ? { code: cart.coupon, percentOff: COUPONS[cart.coupon]?.percentOff ?? 0 } : null
  return { id: cart.id, items, coupon, version: cart.version, updatedAt: cart.updatedAt }
}

export const NETWORK_FEES: Record<Network, string> = {
  ethereum: '0.016',
  polygon: '0.002',
  solana: '0.001',
}

const QUOTE_TTL_MS = 10 * 60 * 1000

export function buildQuote(cart: DbCart | null, network: Network): DbQuote {
  const view = toCartView(cart)
  const issues: QuoteIssue[] = []
  const lines: Quote['items'] = []

  for (const item of view.items) {
    if (item.status === 'sold_out') {
      issues.push({ itemId: item.id, code: 'SOLD_OUT', message: `${item.name} (${item.editionLabel}) esgotou.` })
      continue
    }
    if (item.status === 'insufficient') {
      issues.push({
        itemId: item.id,
        code: 'INSUFFICIENT',
        message: `Restam apenas ${item.available} unidade(s) de ${item.name} (${item.editionLabel}).`,
      })
      continue
    }
    if (item.status === 'price_changed') {
      issues.push({ itemId: item.id, code: 'PRICE_CHANGED', message: `O preço de ${item.name} mudou para ${item.unitPriceEth} ETH.` })
    }
    lines.push({
      itemId: item.id,
      nftId: item.nftId,
      editionId: item.editionId,
      quantity: item.quantity,
      unitPriceEth: item.unitPriceEth,
      lineTotalEth: multiplyEth(item.unitPriceEth, item.quantity),
    })
  }

  const subtotalEth = addEth('0', ...lines.map((line) => line.lineTotalEth))
  const discountEth = view.coupon ? percentOfEth(subtotalEth, view.coupon.percentOff * 100) : '0'
  const networkFeeEth = lines.length > 0 ? NETWORK_FEES[network] : '0'
  const createdAt = Date.now()

  return {
    id: db.nextId('qt'),
    cartId: cart?.id ?? null,
    cartVersion: view.version,
    network,
    items: lines,
    coupon: view.coupon?.code ?? null,
    subtotalEth,
    discountEth,
    networkFeeEth,
    totalEth: addEth(subtractEth(subtotalEth, discountEth), networkFeeEth),
    issues,
    createdAt: new Date(createdAt).toISOString(),
    expiresAt: new Date(createdAt + QUOTE_TTL_MS).toISOString(),
  }
}

export function sameQuote(a: Quote, b: Quote) {
  const lines = (quote: Quote) =>
    quote.items.map((line) => `${line.itemId}:${line.quantity}:${toWei(line.unitPriceEth)}`).sort().join('|')
  return (
    lines(a) === lines(b) &&
    a.coupon === b.coupon &&
    a.network === b.network &&
    compareEth(a.totalEth, b.totalEth) === 0 &&
    compareEth(a.networkFeeEth, b.networkFeeEth) === 0
  )
}

const timers = new Map<string, number>()

export function settleDelayMs() {
  return scenario.is('confirmacao-lenta') ? 20_000 : 4_000
}

export function settleIfDue(order: DbOrder) {
  if (order.status !== 'pending' || order.settlesAt > Date.now()) return
  timers.delete(order.id)

  let outcome = order.outcome
  let failureReason: string | null = outcome === 'declined' ? 'A carteira recusou a assinatura da transação.' : null

  if (outcome === 'confirmed') {
    const shortage = order.items.find((line) => {
      const edition = findNft(line.nftId)?.editions.find((e) => e.id === line.editionId)
      return !edition || edition.available < line.quantity
    })
    if (shortage) {
      outcome = 'declined'
      failureReason = `${shortage.name} (${shortage.editionLabel}) esgotou antes da confirmação.`
    }
  }

  order.status = outcome
  order.failureReason = failureReason
  order.version += 1
  order.updatedAt = nowIso()

  if (outcome === 'confirmed') {
    order.transaction = {
      hash: `0x${Array.from(`${order.id}${order.createdAt}`, (char) => char.charCodeAt(0).toString(16)).join('').padEnd(64, '0').slice(0, 64)}`,
      explorerUrl: `https://etherscan.io/tx/simulada-${order.id}`,
    }
    const touched = new Set<SeedNft>()
    for (const line of order.items) {
      const nft = findNft(line.nftId)
      const edition = nft?.editions.find((e) => e.id === line.editionId)
      if (nft && edition) {
        edition.available -= line.quantity
        touched.add(nft)
      }
    }
    removePurchasedFromCart(order)
    touched.forEach((nft) => commitNftChange(nft))
  }

  db.persist()
  emitOrderUpdated(order.id)
}

function removePurchasedFromCart(order: DbOrder) {
  const cart = resolveCart(order.userId, null)
  if (!cart) return
  for (const line of order.items) {
    const item = cart.items.find((i) => i.nftId === line.nftId && i.editionId === line.editionId)
    if (!item) continue
    item.quantity -= line.quantity
  }
  cart.items = cart.items.filter((item) => item.quantity > 0)
  if (cart.items.length === 0) cart.coupon = null
  touchCart(cart)
}

export function scheduleSettlement(order: DbOrder) {
  if (order.status !== 'pending' || timers.has(order.id)) return
  const timer = window.setTimeout(() => settleIfDue(order), Math.max(0, order.settlesAt - Date.now()) + 50)
  timers.set(order.id, timer)
}

export function resumePendingOrders() {
  Object.values(db.data.orders).forEach((order) => {
    settleIfDue(order)
    scheduleSettlement(order)
  })
}

export function settleNow(orderId: string) {
  const order = db.data.orders[orderId]
  if (!order) return
  order.settlesAt = Date.now()
  settleIfDue(order)
}
