import { http, HttpResponse } from 'msw'
import { NETWORKS, WALLET_TYPES, type Network, type WalletBody, type WalletType } from '@/api/contracts'
import { db, type DbWallet } from '../db'
import { API, fail, nowIso, readJson, requireUser, route, validationError } from '../http'
import { scenario } from '../scenarios'

const EVM_ADDRESS = /^0x[a-fA-F0-9]{40}$/
const SOLANA_ADDRESS = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/
const ENS_NAME = /^[a-z0-9-]{3,}\.eth$/

function walletProblems(input: Partial<WalletBody>, partial: boolean) {
  const fields: Record<string, string> = {}
  const network = input.network as Network | undefined
  if (!partial || input.label !== undefined) {
    const label = input.label?.trim() ?? ''
    if (label.length < 2 || label.length > 30) fields.label = 'Use um nome entre 2 e 30 caracteres.'
  }
  if (!partial || input.type !== undefined) {
    if (!WALLET_TYPES.includes(input.type as WalletType)) fields.type = 'Selecione o tipo de carteira.'
  }
  if (!partial || input.network !== undefined) {
    if (!NETWORKS.includes(network as Network)) fields.network = 'Selecione uma rede.'
  }
  if (!partial || input.address !== undefined) {
    const address = input.address?.trim() ?? ''
    const valid = network === 'solana' ? SOLANA_ADDRESS.test(address) : EVM_ADDRESS.test(address)
    if (!valid) {
      fields.address = network === 'solana' ? 'Endereço Solana inválido.' : 'Use um endereço 0x com 40 caracteres hexadecimais.'
    }
  }
  if (input.ensName && !ENS_NAME.test(input.ensName)) fields.ensName = 'Use um nome ENS terminado em .eth.'
  if (!partial || input.role !== undefined) {
    if (input.role !== 'primary' && input.role !== 'secondary') fields.role = 'Defina se a carteira é principal ou secundária.'
  }
  if (Object.keys(fields).length > 0) validationError(fields)
}

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
      const body = await readJson<WalletBody>(request)
      walletProblems(body, false)
      const owned = db.data.wallets.filter((wallet) => wallet.userId === user.id)
      if (owned.some((wallet) => wallet.role === body.role)) {
        fail('WALLET_LIMIT', `Você já tem uma carteira ${body.role === 'primary' ? 'principal' : 'secundária'}. Edite-a em vez de criar outra.`)
      }
      if (owned.some((wallet) => wallet.address.toLowerCase() === body.address!.trim().toLowerCase())) {
        validationError({ address: 'Este endereço já está cadastrado.' })
      }
      const wallet: DbWallet = {
        id: db.nextId('wal'),
        userId: user.id,
        role: body.role!,
        label: body.label!.trim(),
        type: body.type!,
        network: body.network!,
        address: body.address!.trim(),
        ensName: body.ensName?.trim() || null,
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
      const body = await readJson<WalletBody>(request)
      walletProblems({ ...body, network: body.network ?? wallet.network }, true)

      if (body.role && body.role !== wallet.role) {
        const other = db.data.wallets.find((w) => w.userId === user.id && w.role === body.role)
        if (other) {
          other.role = wallet.role
          other.updatedAt = nowIso()
        }
        wallet.role = body.role
      }
      if (body.label !== undefined) wallet.label = body.label.trim()
      if (body.type !== undefined) wallet.type = body.type
      if (body.network !== undefined) wallet.network = body.network
      if (body.address !== undefined) wallet.address = body.address.trim()
      if (body.ensName !== undefined) wallet.ensName = body.ensName?.trim() || null
      wallet.updatedAt = nowIso()
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
