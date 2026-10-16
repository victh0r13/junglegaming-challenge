import { cartSchema, quoteSchema, type AddCartItemBody, type Network, type UpdateCartItemBody } from './contracts'
import { apiRequest } from './http'

export const cartApi = {
  get: (signal?: AbortSignal) => apiRequest(cartSchema, { url: '/cart', signal }),
  addItem: (body: AddCartItemBody) => apiRequest(cartSchema, { url: '/cart/items', method: 'POST', data: body }),
  updateItem: (itemId: string, body: UpdateCartItemBody) =>
    apiRequest(cartSchema, { url: `/cart/items/${itemId}`, method: 'PATCH', data: body }),
  removeItem: (itemId: string) => apiRequest(cartSchema, { url: `/cart/items/${itemId}`, method: 'DELETE' }),
  acknowledge: () => apiRequest(cartSchema, { url: '/cart/acknowledge', method: 'POST' }),
  merge: (guestCartId: string) => apiRequest(cartSchema, { url: '/cart/merge', method: 'POST', data: { guestCartId } }),
  applyCoupon: (code: string) => apiRequest(cartSchema, { url: '/cart/coupon', method: 'PUT', data: { code } }),
  removeCoupon: () => apiRequest(cartSchema, { url: '/cart/coupon', method: 'DELETE' }),
  quote: (network: Network, signal?: AbortSignal) => apiRequest(quoteSchema, { url: '/cart/quote', params: { network }, signal }),
}
