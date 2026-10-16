import type { NftUpdatedEvent } from '@/api/contracts'
import { db } from './db'
import { findNft, settleNow, updateEdition } from './domain'
import { buildNftUpdatedEvent, emitRawNftEvent, realtimeControl } from './realtime'
import { SCENARIOS, isScenarioId, scenario, type ScenarioId } from './scenarios'

export type MockControl = typeof mockControl

export const mockControl = {
  scenarios: SCENARIOS,
  getScenario: () => scenario.get(),
  setScenario(id: ScenarioId) {
    if (!isScenarioId(id)) throw new Error(`Cenário desconhecido: ${id}`)
    scenario.set(id)
  },
  async reset() {
    await db.reset()
    scenario.set('padrao')
  },
  updateEdition(nftId: string, editionId: string, change: { priceEth?: string; available?: number }) {
    return updateEdition(nftId, editionId, change)
  },
  lastNftEvent(nftId: string): NftUpdatedEvent | null {
    const nft = findNft(nftId)
    return nft ? buildNftUpdatedEvent(nft) : null
  },
  replayNftEvent(event: NftUpdatedEvent) {
    emitRawNftEvent(event)
  },
  dropRealtime: () => realtimeControl.dropConnections(),
  realtimeOutage: (ms: number) => realtimeControl.outage(ms),
  connectedClients: () => realtimeControl.connectedClients(),
  expireSessions() {
    db.data.sessions.forEach((session) => {
      session.expiresAt = Date.now() - 1
    })
    db.persist()
  },
  settleOrder: (orderId: string) => settleNow(orderId),
  pendingOrders: () => Object.values(db.data.orders).filter((order) => order.status === 'pending').map((order) => order.id),
}

declare global {
  interface Window {
    __kurioMocks?: MockControl
  }
}
