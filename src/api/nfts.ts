import { highlightsSchema, nftDetailSchema, nftPageSchema, type NftListParams } from './contracts'
import { apiRequest } from './http'

function toQueryParams(params: NftListParams) {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0))
      .map(([key, value]) => [key, Array.isArray(value) ? value.join(',') : String(value)]),
  )
}

export const nftsApi = {
  list: (params: NftListParams, signal?: AbortSignal) =>
    apiRequest(nftPageSchema, { url: '/nfts', params: toQueryParams(params), signal }),
  get: (id: string, signal?: AbortSignal) => apiRequest(nftDetailSchema, { url: `/nfts/${encodeURIComponent(id)}`, signal }),
  highlights: (signal?: AbortSignal) => apiRequest(highlightsSchema, { url: '/highlights', signal }),
}
