import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import { nftsApi } from '@/api/nfts'
import type { NftListParams } from '@/api/contracts'
import { queryKeys } from '@/api/query-keys'
import { CATALOG_PAGE_SIZE, type CatalogSearch } from './search-params'

export function toListParams(search: CatalogSearch): NftListParams {
  return {
    busca: search.busca || undefined,
    colecoes: search.colecoes?.length ? [...search.colecoes].sort() : undefined,
    redes: search.redes?.length ? [...search.redes].sort() : undefined,
    precoMin: search.precoMin,
    precoMax: search.precoMax,
    aba: search.aba,
    ordem: search.ordem,
    pagina: search.pagina,
    porPagina: CATALOG_PAGE_SIZE,
  }
}

export const nftListQuery = (params: NftListParams) =>
  queryOptions({
    queryKey: queryKeys.nfts.list(params),
    queryFn: ({ signal }) => nftsApi.list(params, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })

export const nftDetailQuery = (id: string) =>
  queryOptions({
    queryKey: queryKeys.nfts.detail(id),
    queryFn: ({ signal }) => nftsApi.get(id, signal),
    staleTime: 30_000,
  })

export const highlightsQuery = () =>
  queryOptions({
    queryKey: queryKeys.nfts.highlights(),
    queryFn: ({ signal }) => nftsApi.highlights(signal),
    staleTime: 60_000,
  })
