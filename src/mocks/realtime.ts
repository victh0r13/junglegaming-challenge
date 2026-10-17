import { ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import type { NftUpdatedEvent, OrderUpdatedEvent } from '@/api/contracts'
import { REALTIME_URL } from '@/api/config'
import { db } from './db'
import type { SeedNft } from './fixtures/nfts'
import { nowIso, userIdForToken } from './http'

const realtime = ws.link(REALTIME_URL.replace(/^http/, 'ws'))

type RealtimeClient = {
  io: ReturnType<typeof toSocketIo>
  userId: string | null
  close: () => void
}

const clients = new Map<string, RealtimeClient>()
let clientSeq = 0
let eventSeq = 0
let refuseConnections = false

const PING_INTERVAL_MS = 20_000

export const realtimeHandler = realtime.addEventListener('connection', (connection) => {
  if (refuseConnections) {
    refuse(connection.client)
    return
  }

  const id = `cli_${++clientSeq}`
  const io = toSocketIo(connection)
  const client: RealtimeClient = { io, userId: null, close: () => connection.client.close() }
  clients.set(id, client)

  const heartbeat = window.setInterval(() => connection.client.send('2'), PING_INTERVAL_MS)

  io.client.on('session.subscribe', (_event, payload: { token?: string } | undefined) => {
    client.userId = userIdForToken(payload?.token)
    io.client.emit('session.subscribed', { authenticated: client.userId !== null })
  })
  io.client.on('session.unsubscribe', () => {
    client.userId = null
  })

  connection.client.addEventListener('close', () => {
    window.clearInterval(heartbeat)
    clients.delete(id)
  })
})

function refuse(client: { close: (code?: number, reason?: string) => void }) {
  const socket = (client as { socket?: EventTarget }).socket
  socket?.dispatchEvent(new Event('error'))
  client.close(1013, 'Indisponível')
}

function nextEventId() {
  eventSeq += 1
  return `evt_${Date.now().toString(36)}_${eventSeq}`
}

export function buildNftUpdatedEvent(nft: SeedNft): NftUpdatedEvent {
  return {
    eventId: nextEventId(),
    type: 'nft.updated',
    resource: { type: 'nft', id: nft.id },
    version: nft.version,
    occurredAt: nowIso(),
    data: {
      priceEth: nft.priceEth,
      available: nft.available,
      editions: nft.editions.map(({ id, priceEth, available }) => ({ id, priceEth, available })),
    },
  }
}

export function emitNftUpdated(nft: SeedNft) {
  const event = buildNftUpdatedEvent(nft)
  clients.forEach((client) => client.io.client.emit('nft.updated', event))
  return event
}

export function emitRawNftEvent(event: NftUpdatedEvent) {
  clients.forEach((client) => client.io.client.emit('nft.updated', event))
}

export function emitOrderUpdated(orderId: string) {
  const order = db.data.orders[orderId]
  if (!order) return
  const event: OrderUpdatedEvent = {
    eventId: nextEventId(),
    type: 'order.updated',
    resource: { type: 'order', id: order.id },
    version: order.version,
    occurredAt: nowIso(),
    data: { status: order.status, userId: order.userId },
  }
  clients.forEach((client) => {
    if (client.userId === order.userId) client.io.client.emit('order.updated', event)
  })
}

export const realtimeControl = {
  connectedClients: () => clients.size,
  dropConnections() {
    clients.forEach((client) => client.close())
    clients.clear()
  },
  outage(ms: number) {
    refuseConnections = true
    realtimeControl.dropConnections()
    window.setTimeout(() => {
      refuseConnections = false
    }, ms)
  },
}
