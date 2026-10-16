import { orderSchema, type CreateOrderBody } from './contracts'
import { apiRequest } from './http'

export const ordersApi = {
  create: (body: CreateOrderBody, idempotencyKey: string) =>
    apiRequest(orderSchema, { url: '/orders', method: 'POST', data: body, headers: { 'Idempotency-Key': idempotencyKey } }),
  get: (id: string, signal?: AbortSignal) => apiRequest(orderSchema, { url: `/orders/${encodeURIComponent(id)}`, signal }),
}
