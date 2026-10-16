import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateOrderBody, Order } from '@/api/contracts'
import { isApiError } from '@/api/http'
import { ordersApi } from '@/api/orders'
import { queryKeys } from '@/api/query-keys'
import { useSessionState } from '@/features/auth/session-store'
import { pendingCheckout } from '@/features/checkout/pending-checkout'

const RECOVERY_ATTEMPTS = 3

export function useOrder(orderId: string) {
  const session = useSessionState()
  const userId = session.status === 'authenticated' ? session.session.userId : null
  return useQuery({
    queryKey: queryKeys.private.order(userId ?? 'anonimo', orderId),
    queryFn: ({ signal }) => ordersApi.get(orderId, signal),
    enabled: userId !== null,
    refetchInterval: (query) => (query.state.data?.status === 'pending' ? 5_000 : false),
  })
}

async function createWithRecovery(body: CreateOrderBody, idempotencyKey: string): Promise<Order> {
  let lastError: unknown
  for (let attempt = 0; attempt < RECOVERY_ATTEMPTS; attempt += 1) {
    try {
      return await ordersApi.create(body, idempotencyKey)
    } catch (error) {
      lastError = error
      if (!isApiError(error) || !error.isTransient) throw error
      await new Promise((resolve) => window.setTimeout(resolve, 800 * (attempt + 1)))
    }
  }
  throw lastError
}

export function usePlaceOrder() {
  const queryClient = useQueryClient()
  const session = useSessionState()
  const userId = session.status === 'authenticated' ? session.session.userId : null

  return useMutation({
    mutationKey: ['place-order'],
    mutationFn: async ({ body, idempotencyKey }: { body: CreateOrderBody; idempotencyKey: string }) => {
      if (!userId) throw new Error('Sessão ausente')
      pendingCheckout.save({ userId, idempotencyKey, body, orderId: null, createdAt: new Date().toISOString() })
      const order = await createWithRecovery(body, idempotencyKey)
      pendingCheckout.save({ userId, idempotencyKey, body, orderId: order.id, createdAt: order.createdAt })
      return order
    },
    onSuccess: (order) => {
      if (userId) queryClient.setQueryData(queryKeys.private.order(userId, order.id), order)
    },
  })
}

export function useRecoverPendingOrder() {
  return useMutation({
    mutationFn: ({ body, idempotencyKey }: { body: CreateOrderBody; idempotencyKey: string }) => createWithRecovery(body, idempotencyKey),
  })
}
