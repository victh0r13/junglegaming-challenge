import { http, HttpResponse } from 'msw'
import type { WalletBody } from '@/api/contracts'
import { issuesToFields, walletInputSchema } from '@/api/schemas'
import { db, type DbWallet } from '../db'
import { API, fail, nowIso, readJson, requireUser, route, validationError } from '../http'
import { scenario } from '../scenarios'

function publicWallet({ userId: _userId, ...wallet }: DbWallet) {
  return wallet
}

export const walletHandlers = [
  http.get(
    `${API}/wallets`,
    route('read', ({ request }) => {
      const user = requireUser(request)
      const items = db.data.wallets
        .filter((wallet) => wallet.userId === user.id)
        .sort((a, b) => (a.role === b.role ? 0 : a.role === 'primary' ? -1 : 1))
        .map(publicWallet)
      return HttpResponse.json({ items })
    }),
  ),

  http.post(
    `${API}/wallets`,
    route('write', async ({ request }) => {
      const user = requireUser(request)
      const parsed = walletInputSchema.safeParse(await readJson<WalletBody>(request))
      if (!parsed.success) validationError(issuesToFields(parsed.error))
      const input = parsed.data
      const owned = db.data.wallets.filter((wallet) => wallet.userId === user.id)
      if (owned.some((wallet) => wallet.role === input.role)) {
        fail('WALLET_LIMIT', `Você já tem uma carteira ${input.role === 'primary' ? 'principal' : 'secundária'}. Edite-a em vez de criar outra.`)
      }
      if (owned.some((wallet) => wallet.address.toLowerCase() === input.address.toLowerCase())) {
        validationError({ address: 'Este endereço já está cadastrado.' })
      }
      const wallet: DbWallet = {
        ...input,
        secondaryRef: input.secondaryRef || null,
        id: db.nextId('wal'),
        userId: user.id,
        updatedAt: nowIso(),
      }
      db.data.wallets.push(wallet)
      db.persist()
      return HttpResponse.json(publicWallet(wallet), { status: 201 })
    }),
  ),

  http.patch(
    `${API}/wallets/:id`,
    route('write', async ({ request, params }) => {
      const user = requireUser(request)
      const wallet =
        db.data.wallets.find((w) => w.id === params.id && w.userId === user.id) ?? fail('NOT_FOUND', 'Carteira não encontrada.')
      const { id: _id, userId: _userId, updatedAt: _updatedAt, ...current } = wallet
      const parsed = walletInputSchema.safeParse({ ...current, ...(await readJson<WalletBody>(request)) })
      if (!parsed.success) validationError(issuesToFields(parsed.error))
      const input = parsed.data
      const duplicate = db.data.wallets.find(
        (w) => w.userId === user.id && w.id !== wallet.id && w.address.toLowerCase() === input.address.toLowerCase(),
      )
      if (duplicate) validationError({ address: 'Este endereço já está cadastrado em outra carteira.' })

      if (input.role !== wallet.role) {
        const other = db.data.wallets.find((w) => w.userId === user.id && w.role === input.role)
        if (other) {
          other.role = wallet.role
          other.updatedAt = nowIso()
        }
      }
      Object.assign(wallet, input, { secondaryRef: input.secondaryRef || null, updatedAt: nowIso() })
      db.persist()
      return HttpResponse.json(publicWallet(wallet))
    }),
  ),

  http.post(
    `${API}/wallets/:id/connect`,
    route('write', async ({ request, params }) => {
      const user = requireUser(request)
      const wallet =
        db.data.wallets.find((w) => w.id === params.id && w.userId === user.id) ?? fail('NOT_FOUND', 'Carteira não encontrada.')
      if (scenario.is('carteira-recusada')) fail('WALLET_REJECTED', 'A carteira recusou a solicitação de conexão.')
      const connectedAt = nowIso()
      db.data.connectedWallets[wallet.id] = connectedAt
      db.persist()
      return HttpResponse.json({ walletId: wallet.id, status: 'connected', connectedAt })
    }),
  ),

  http.post(
    `${API}/wallets/:id/disconnect`,
    route('write', ({ request, params }) => {
      const user = requireUser(request)
      const wallet = db.data.wallets.find((w) => w.id === params.id && w.userId === user.id)
      if (wallet) delete db.data.connectedWallets[wallet.id]
      db.persist()
      return new HttpResponse(null, { status: 204 })
    }),
  ),
]
