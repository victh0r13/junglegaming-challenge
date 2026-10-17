import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io, type Socket } from 'socket.io-client'
import { WifiOff } from 'lucide-react'
import { backendReady } from '@/api/backend'
import { REALTIME_URL } from '@/api/config'
import { nftUpdatedEventSchema, orderUpdatedEventSchema } from '@/api/contracts'
import { queryKeys } from '@/api/query-keys'
import { sessionStore } from '@/features/auth/session-store'
import { applyNftUpdated, applyOrderUpdated } from './apply-events'
import { createEventTracker } from './event-tracker'

type ConnectionState = 'connecting' | 'connected' | 'reconnecting'

export function RealtimeBridge() {
  const queryClient = useQueryClient()
  const [state, setState] = useState<ConnectionState>('connecting')
  const trackerRef = useRef(createEventTracker())

  useEffect(() => {
    const tracker = trackerRef.current
    const socket: Socket = io(REALTIME_URL, {
      path: '/socket.io',
      transports: ['websocket'],
      reconnectionDelay: 500,
      reconnectionDelayMax: 4_000,
      timeout: 5_000,
      autoConnect: false,
    })
    let active = true
    let hasConnected = false
    let subscribedUserId: string | null = null

    function syncSession() {
      const token = sessionStore.getToken()
      const userId = sessionStore.getUserId()
      if (subscribedUserId && subscribedUserId !== userId) socket.emit('session.unsubscribe')
      if (token && userId) socket.emit('session.subscribe', { token })
      subscribedUserId = userId
    }

    function onConnect() {
      setState('connected')
      syncSession()
      if (hasConnected) {
        queryClient.invalidateQueries({ queryKey: queryKeys.nfts.all, refetchType: 'active' })
        queryClient.invalidateQueries({ queryKey: queryKeys.cart.all, refetchType: 'active' })
        queryClient.invalidateQueries({ queryKey: queryKeys.private.all, refetchType: 'active' })
      }
      hasConnected = true
    }

    function onDisconnect() {
      setState('reconnecting')
    }

    function onNftUpdated(payload: unknown) {
      const parsed = nftUpdatedEventSchema.safeParse(payload)
      if (parsed.success) applyNftUpdated(queryClient, tracker, parsed.data)
    }

    function onOrderUpdated(payload: unknown) {
      const parsed = orderUpdatedEventSchema.safeParse(payload)
      if (parsed.success) applyOrderUpdated(queryClient, tracker, parsed.data, sessionStore.getUserId())
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('nft.updated', onNftUpdated)
    socket.on('order.updated', onOrderUpdated)
    const unsubscribeSession = sessionStore.subscribe(() => {
      if (socket.connected) syncSession()
    })
    void backendReady.then(() => {
      if (active) socket.connect()
    })

    return () => {
      active = false
      unsubscribeSession()
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('nft.updated', onNftUpdated)
      socket.off('order.updated', onOrderUpdated)
      socket.disconnect()
      tracker.reset()
    }
  }, [queryClient])

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed top-3 left-1/2 z-50 -translate-x-1/2">
      {state === 'reconnecting' && (
        <p className="flex items-center gap-2 rounded-full border border-border-soft bg-surface-dark px-4 py-2 text-xs text-text-secondary shadow-lg">
          <WifiOff className="size-4 text-text-accent" aria-hidden="true" />
          Atualizações em tempo real indisponíveis. Reconectando…
        </p>
      )}
    </div>
  )
}
