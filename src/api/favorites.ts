import { favoritesSchema } from './contracts'
import { apiRequest } from './http'

export const favoritesApi = {
  list: (signal?: AbortSignal) => apiRequest(favoritesSchema, { url: '/favorites', signal }),
  add: (nftId: string) => apiRequest(favoritesSchema, { url: `/favorites/${encodeURIComponent(nftId)}`, method: 'PUT' }),
  remove: (nftId: string) => apiRequest(favoritesSchema, { url: `/favorites/${encodeURIComponent(nftId)}`, method: 'DELETE' }),
}
