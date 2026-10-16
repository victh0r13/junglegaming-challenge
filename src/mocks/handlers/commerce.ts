import { delay, http, HttpResponse } from 'msw'
import { NETWORKS, type AddCartItemBody, type CreateOrderBody, type Network, type UpdateCartItemBody } from '@/api/contracts'
import { REQUEST_TIMEOUT_MS } from '@/api/config'
import { db, type DbOrder } from '../db'
import {
  buildQuote,
  ensureCart,
  findNft,
  itemLimit,
  resolveCart,
  sameQuote,
  scheduleSettlement,
  settleDelayMs,
  settleIfDue,
  toCartView,
  touchCart,
  updateEdition,
  validateCoupon,
} from '../domain'
import { API, fail, nowIso, optionalUser, readJson, requireUser, route, validationError } from '../http'
import { scenario } from '../scenarios'

function cartContext(request: Request) {
  const user = optionalUser(request)
  return { userId: user?.id ?? null, guestCartId: request.headers.get('X-Cart-Id') }
}

function parseQuantity(value: unknown) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    validationError({ quantity: 'A quantidade deve ser um número inteiro maior que zero.' })
  }
  return value
}

function parseNetwork(value: unknown): Network {
  return NETWORKS.includes(value as Network) ? (value as Network) : validationError({ network: 'Selecione uma rede válida.' })
}

function stableHash(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableHash).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${key}:${stableHash((value as Record<string, unknown>)[key])}`)
      .join(',')}}`
  }
  return JSON.stringify(value)
}

export const commerceHandlers = [
  http.get(
    `${API}/favorites`,
    route('read', ({ request }) => {
      const user = requireUser(request)
      return HttpResponse.json({ nftIds: db.data.favorites[user.id] ?? [] })
    }),
  ),

  http.put(
    `${API}/favorites/:nftId`,
    route('write', ({ request, params }) => {
      const user = requireUser(request)
      if (scenario.is('falha-favoritos')) fail('INTERNAL_ERROR', 'Não foi possível salvar o favorito.')
      const nftId = String(params.nftId)
      if (!findNft(nftId)) fail('NOT_FOUND', 'NFT não encontrado.')
      const current = db.data.favorites[user.id] ?? []
      db.data.favorites[user.id] = current.includes(nftId) ? current : [...current, nftId]
      db.persist()
      return HttpResponse.json({ nftIds: db.data.favorites[user.id] })
    }),
  ),

  http.delete(
    `${API}/favorites/:nftId`,
    route('write', ({ request, params }) => {
      const user = requireUser(request)
      if (scenario.is('falha-favoritos')) fail('INTERNAL_ERROR', 'Não foi possível remover o favorito.')
      db.data.favorites[user.id] = (db.data.favorites[user.id] ?? []).filter((id) => id !== params.nftId)
      db.persist()
      return HttpResponse.json({ nftIds: db.data.favorites[user.id] })
    }),
  ),

  http.get(
    `${API}/cart`,
    route('read', ({ request }) => {
      const { userId, guestCartId } = cartContext(request)
      return HttpResponse.json(toCartView(resolveCart(userId, guestCartId)))
    }),
  ),

  http.post(
    `${API}/cart/items`,
    route('write', async ({ request }) => {
      const { userId, guestCartId } = cartContext(request)
      const body = await readJson<AddCartItemBody>(request)
      const quantity = parseQuantity(body.quantity)
      const { nft, edition, max } = itemLimit(String(body.nftId), String(body.editionId))
      if (edition.available === 0) {
        fail('EDITION_UNAVAILABLE', `A edição ${edition.label} de ${nft.name} está esgotada.`)
      }

      const cart = ensureCart(userId, guestCartId)
      const existing = cart.items.find((item) => item.nftId === nft.id && item.editionId === edition.id)
      const nextQuantity = (existing?.quantity ?? 0) + quantity
      if (nextQuantity > max) {
        fail(
          'QUANTITY_LIMIT',
          `Você pode levar no máximo ${max} unidade(s) da edição ${edition.label}${existing ? ' e já tem itens no carrinho' : ''}.`,
          { quantity: `Máximo de ${max}.` },
        )
      }
      if (existing) {
        existing.quantity = nextQuantity
        existing.acknowledgedPriceEth = edition.priceEth
      } else {
        cart.items.push({
          id: db.nextId('item'),
          nftId: nft.id,
          editionId: edition.id,
          quantity,
          acknowledgedPriceEth: edition.priceEth,
        })
      }
      touchCart(cart)
      return HttpResponse.json(toCartView(cart), { status: 201 })
    }),
  ),

  http.patch(
    `${API}/cart/items/:itemId`,
    route('write', async ({ request, params }) => {
      const { userId, guestCartId } = cartContext(request)
      const cart = resolveCart(userId, guestCartId) ?? fail('NOT_FOUND', 'Carrinho não encontrado.')
      const item = cart.items.find((i) => i.id === params.itemId) ?? fail('NOT_FOUND', 'Item não encontrado no carrinho.')
      const quantity = parseQuantity((await readJson<UpdateCartItemBody>(request)).quantity)
      const { edition, max } = itemLimit(item.nftId, item.editionId)
      if (quantity > item.quantity && quantity > max) {
        fail('AVAILABILITY_CONFLICT', `Disponível: ${max} unidade(s) da edição ${edition.label}.`, {
          quantity: `Máximo de ${max}.`,
        })
      }
      item.quantity = quantity
      touchCart(cart)
      return HttpResponse.json(toCartView(cart))
    }),
  ),

  http.delete(
    `${API}/cart/items/:itemId`,
    route('write', ({ request, params }) => {
      const { userId, guestCartId } = cartContext(request)
      const cart = resolveCart(userId, guestCartId) ?? fail('NOT_FOUND', 'Carrinho não encontrado.')
      cart.items = cart.items.filter((item) => item.id !== params.itemId)
      if (cart.items.length === 0) cart.coupon = null
      touchCart(cart)
      return HttpResponse.json(toCartView(cart))
    }),
  ),

  http.post(
    `${API}/cart/acknowledge`,
    route('write', ({ request }) => {
      const { userId, guestCartId } = cartContext(request)
      const cart = resolveCart(userId, guestCartId)
      if (!cart) return HttpResponse.json(toCartView(null))
      for (const item of cart.items) {
        const edition = findNft(item.nftId)?.editions.find((e) => e.id === item.editionId)
        if (edition) item.acknowledgedPriceEth = edition.priceEth
      }
      touchCart(cart)
      return HttpResponse.json(toCartView(cart))
    }),
  ),

  http.post(
    `${API}/cart/merge`,
    route('write', async ({ request }) => {
      const user = requireUser(request)
      const { guestCartId } = await readJson<{ guestCartId: string }>(request)
      const guest = guestCartId ? db.data.carts[guestCartId] : undefined
      const cart = ensureCart(user.id, null)
      if (guest && guest.ownerId === null) {
        for (const guestItem of guest.items) {
          const { max } = itemLimit(guestItem.nftId, guestItem.editionId)
          const existing = cart.items.find((i) => i.nftId === guestItem.nftId && i.editionId === guestItem.editionId)
          if (existing) {
            existing.quantity = Math.max(1, Math.min(existing.quantity + guestItem.quantity, Math.max(max, existing.quantity)))
          } else {
            cart.items.push({ ...guestItem, id: db.nextId('item') })
          }
        }
        cart.coupon = cart.coupon ?? guest.coupon
        delete db.data.carts[guest.id]
      }
      touchCart(cart)
      return HttpResponse.json(toCartView(cart))
    }),
  ),

  http.put(
    `${API}/cart/coupon`,
    route('write', async ({ request }) => {
      const { userId, guestCartId } = cartContext(request)
      const cart = resolveCart(userId, guestCartId)
      if (!cart || cart.items.length === 0) fail('VALIDATION_ERROR', 'Adicione itens antes de aplicar um cupom.')
      const { code } = await readJson<{ code: string }>(request)
      if (!code?.trim()) validationError({ code: 'Informe o código do cupom.' })
      cart.coupon = validateCoupon(code).code
      touchCart(cart)
      return HttpResponse.json(toCartView(cart))
    }),
  ),

  http.delete(
    `${API}/cart/coupon`,
    route('write', ({ request }) => {
      const { userId, guestCartId } = cartContext(request)
      const cart = resolveCart(userId, guestCartId) ?? fail('NOT_FOUND', 'Carrinho não encontrado.')
      cart.coupon = null
      touchCart(cart)
      return HttpResponse.json(toCartView(cart))
    }),
  ),

  http.get(
    `${API}/cart/quote`,
    route('read', ({ request }) => {
      const { userId, guestCartId } = cartContext(request)
      const network = parseNetwork(new URL(request.url).searchParams.get('network') ?? 'ethereum')
      const quote = buildQuote(resolveCart(userId, guestCartId), network)
      db.data.quotes[quote.id] = quote
      db.persist()
      const { cartId: _cartId, ...body } = quote
      return HttpResponse.json(body)
    }),
  ),

  http.post(
    `${API}/orders`,
    route('write', async ({ request }) => {
      const user = requireUser(request)
      const key = request.headers.get('Idempotency-Key')?.trim()
      if (!key) fail('VALIDATION_ERROR', 'Cabeçalho Idempotency-Key obrigatório.')

      const body = await readJson<CreateOrderBody>(request)
      const requestHash = stableHash(body)
      const idempotencyId = `${user.id}:${key}`
      const existingId = db.data.idempotency[idempotencyId]
      if (existingId) {
        const existing = db.data.orders[existingId]
        if (existing.requestHash !== requestHash) {
          fail('IDEMPOTENCY_CONFLICT', 'Esta tentativa de compra já foi usada com dados diferentes.')
        }
        settleIfDue(existing)
        return HttpResponse.json(publicOrder(existing))
      }

      const network = parseNetwork(body.network)
      const collector = body.collector
      const fields: Record<string, string> = {}
      if (!collector?.displayName?.trim()) fields['collector.displayName'] = 'Informe o nome de exibição.'
      if (!collector?.username?.trim()) fields['collector.username'] = 'Informe o nome de usuário.'
      if (!collector?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(collector.email)) fields['collector.email'] = 'Informe um e-mail válido.'
      if (Object.keys(fields).length > 0) validationError(fields)

      const wallet =
        db.data.wallets.find((w) => w.id === body.walletId && w.userId === user.id) ??
        validationError({ walletId: 'Selecione uma carteira cadastrada.' })
      if (!db.data.connectedWallets[wallet.id]) {
        fail('FORBIDDEN', 'Conecte a carteira antes de confirmar a compra.')
      }

      const quote = body.quoteId ? db.data.quotes[body.quoteId] : undefined
      const cart = resolveCart(user.id, null)
      if (!quote || !cart || quote.cartId !== cart.id || Date.parse(quote.expiresAt) < Date.now()) {
        fail('QUOTE_OUTDATED', 'A cotação expirou. Revise os valores antes de confirmar.')
      }

      const firstLine = quote.items[0]
      const triggerKey = firstLine ? `${scenario.get()}:${user.id}:${firstLine.nftId}:${firstLine.editionId}` : ''
      if (firstLine && !db.data.triggered[triggerKey]) {
        if (scenario.is('preco-alterado')) {
          db.data.triggered[triggerKey] = true
          const edition = findNft(firstLine.nftId)?.editions.find((e) => e.id === firstLine.editionId)
          if (edition) {
            const [whole, fraction = ''] = edition.priceEth.split('.')
            const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2)) + 15
            updateEdition(firstLine.nftId, firstLine.editionId, { priceEth: (cents / 100).toFixed(2) })
          }
        }
        if (scenario.is('edicao-esgotada')) {
          db.data.triggered[triggerKey] = true
          updateEdition(firstLine.nftId, firstLine.editionId, { available: 0 })
        }
      }

      const fresh = buildQuote(cart, network)
      if (fresh.issues.some((issue) => issue.code !== 'PRICE_CHANGED')) {
        fail('AVAILABILITY_CONFLICT', fresh.issues.map((issue) => issue.message).join(' '))
      }
      if (fresh.issues.length > 0 || !sameQuote(fresh, quote)) {
        fail('QUOTE_OUTDATED', 'Preços, disponibilidade ou taxas mudaram. Revise o pedido e confirme novamente.')
      }

      const view = toCartView(cart)
      const createdAt = nowIso()
      const order: DbOrder = {
        id: db.nextId('ped'),
        status: 'pending',
        version: 1,
        createdAt,
        updatedAt: createdAt,
        quoteId: quote.id,
        network,
        wallet: { id: wallet.id, label: wallet.label, type: wallet.type, address: wallet.address },
        collector: {
          displayName: collector!.displayName.trim(),
          username: collector!.username.trim(),
          email: collector!.email.trim(),
          note: collector!.note?.trim() ?? '',
        },
        items: quote.items.map((line) => {
          const item = view.items.find((i) => i.id === line.itemId)!
          return {
            nftId: line.nftId,
            editionId: line.editionId,
            editionLabel: item.editionLabel,
            name: item.name,
            tokenId: item.tokenId,
            image: item.image,
            quantity: line.quantity,
            unitPriceEth: line.unitPriceEth,
            lineTotalEth: line.lineTotalEth,
          }
        }),
        coupon: quote.coupon,
        subtotalEth: quote.subtotalEth,
        discountEth: quote.discountEth,
        networkFeeEth: quote.networkFeeEth,
        totalEth: quote.totalEth,
        transaction: null,
        failureReason: null,
        userId: user.id,
        idempotencyKey: key,
        requestHash,
        settlesAt: Date.now() + settleDelayMs(),
        outcome: scenario.is('pagamento-recusado') ? 'declined' : 'confirmed',
      }
      db.data.orders[order.id] = order
      db.data.idempotency[idempotencyId] = order.id
      db.persist()
      scheduleSettlement(order)

      if (scenario.is('timeout-pedido') && !db.data.triggered[`timeout:${idempotencyId}`]) {
        db.data.triggered[`timeout:${idempotencyId}`] = true
        db.persist()
        await delay(REQUEST_TIMEOUT_MS + 2_000)
      }
      return HttpResponse.json(publicOrder(order), { status: 201 })
    }),
  ),

  http.get(
    `${API}/orders/:id`,
    route('read', ({ request, params }) => {
      const user = requireUser(request)
      const order = db.data.orders[String(params.id)]
      if (!order || order.userId !== user.id) fail('NOT_FOUND', 'Pedido não encontrado.')
      settleIfDue(order)
      return HttpResponse.json(publicOrder(order))
    }),
  ),
]

function publicOrder(order: DbOrder) {
  const { userId: _u, idempotencyKey: _k, requestHash: _h, settlesAt: _s, outcome: _o, ...body } = order
  return body
}
