import { walletConnectionSchema, walletListSchema, walletSchema, type WalletBody } from './contracts'
import { apiRequest, apiRequestVoid } from './http'

export const walletsApi = {
  list: (signal?: AbortSignal) => apiRequest(walletListSchema, { url: '/wallets', signal }),
  create: (body: WalletBody) => apiRequest(walletSchema, { url: '/wallets', method: 'POST', data: body }),
  update: (id: string, body: Partial<WalletBody>) => apiRequest(walletSchema, { url: `/wallets/${id}`, method: 'PATCH', data: body }),
  connect: (id: string) => apiRequest(walletConnectionSchema, { url: `/wallets/${id}/connect`, method: 'POST' }),
  disconnect: (id: string) => apiRequestVoid({ url: `/wallets/${id}/disconnect`, method: 'POST' }),
}
