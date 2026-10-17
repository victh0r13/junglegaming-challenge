import { http, HttpResponse } from 'msw'
import {
  COLLECTION_LABELS,
  COLLECTIONS,
  NETWORK_LABELS,
  NETWORKS,
  type Highlights,
  type NftPage,
} from '@/api/contracts'
import { compareEth, isEth } from '@/lib/eth'
import { db } from '../db'
import { findNft, toDetail, toSummary } from '../domain'
import { isNewRelease, type SeedNft } from '../fixtures/nfts'
import { API, fail, route } from '../http'
import { scenario } from '../scenarios'

const DEFAULT_PAGE_SIZE = 9
const TRENDING_THRESHOLD = 60

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function listParam(url: URL, name: string) {
  return (url.searchParams.get(name) ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
}

function matchesTab(nft: SeedNft, tab: string | null, newest: number) {
  if (tab === 'novos') return isNewRelease(nft.createdAt, newest)
  if (tab === 'alta') return nft.trending >= TRENDING_THRESHOLD
  return true
}

function sortItems(items: SeedNft[], order: string | null) {
  const sorted = [...items]
  switch (order) {
    case 'preco-asc':
      return sorted.sort((a, b) => compareEth(a.priceEth, b.priceEth) || a.name.localeCompare(b.name))
    case 'preco-desc':
      return sorted.sort((a, b) => compareEth(b.priceEth, a.priceEth) || a.name.localeCompare(b.name))
    case 'nome':
      return sorted.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    default:
      return sorted.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || a.name.localeCompare(b.name))
  }
}

export const catalogHandlers = [
  http.get(
    `${API}/nfts`,
    route('catalog', ({ request }) => {
      const url = new URL(request.url)
      const search = normalize(url.searchParams.get('busca')?.trim() ?? '')
      const collections = listParam(url, 'colecoes')
      const networks = listParam(url, 'redes')
      const minPrice = url.searchParams.get('precoMin')
      const maxPrice = url.searchParams.get('precoMax')
      const tab = url.searchParams.get('aba')
      const exclude = url.searchParams.get('excluir')
      const ids = listParam(url, 'ids')
      const page = Math.max(1, Number.parseInt(url.searchParams.get('pagina') ?? '1', 10) || 1)
      const pageSize = Math.min(24, Math.max(1, Number.parseInt(url.searchParams.get('porPagina') ?? '', 10) || DEFAULT_PAGE_SIZE))

      if ((minPrice && !isEth(minPrice)) || (maxPrice && !isEth(maxPrice))) {
        fail('VALIDATION_ERROR', 'Faixa de preço inválida.', { preco: 'Use valores decimais em ETH.' })
      }

      const all = scenario.is('catalogo-vazio') ? [] : db.data.nfts
      const newest = Math.max(...db.data.nfts.map((nft) => Date.parse(nft.createdAt)))

      const base = all.filter(
        (nft) =>
          nft.id !== exclude &&
          (ids.length === 0 || ids.includes(nft.id)) &&
          matchesTab(nft, tab, newest) &&
          (!search ||
            normalize(`${nft.name} ${nft.tokenId} ${COLLECTION_LABELS[nft.collection]} ${nft.creator}`).includes(search)),
      )

      const inPrice = (nft: SeedNft) =>
        (!minPrice || compareEth(nft.priceEth, minPrice) >= 0) && (!maxPrice || compareEth(nft.priceEth, maxPrice) <= 0)
      const inCollection = (nft: SeedNft) => collections.length === 0 || collections.includes(nft.collection)
      const inNetwork = (nft: SeedNft) => networks.length === 0 || networks.includes(nft.network)

      const filtered = base.filter((nft) => inPrice(nft) && inCollection(nft) && inNetwork(nft))
      const sorted = sortItems(filtered, url.searchParams.get('ordem'))
      const totalPages = Math.ceil(sorted.length / pageSize)
      const prices = all.map((nft) => nft.priceEth).sort(compareEth)

      const body: NftPage = {
        items: sorted.slice((page - 1) * pageSize, page * pageSize).map(toSummary),
        page,
        pageSize,
        total: sorted.length,
        totalPages,
        facets: {
          collections: COLLECTIONS.map((id) => ({
            id,
            label: COLLECTION_LABELS[id],
            count: base.filter((nft) => nft.collection === id && inPrice(nft) && inNetwork(nft)).length,
          })),
          networks: NETWORKS.map((id) => ({
            id,
            label: NETWORK_LABELS[id],
            count: base.filter((nft) => nft.network === id && inPrice(nft) && inCollection(nft)).length,
          })),
          priceRange: { min: prices[0] ?? '0', max: prices.at(-1) ?? '0' },
        },
      }
      return HttpResponse.json(body)
    }),
  ),

  http.get(
    `${API}/nfts/:id`,
    route('catalog', ({ params }) => {
      const nft = findNft(String(params.id)) ?? fail('NOT_FOUND', 'Este NFT não existe ou foi removido.')
      return HttpResponse.json(toDetail(nft))
    }),
  ),

  http.get(
    `${API}/highlights`,
    route('catalog', () => {
      const pick = (id: string) => toSummary(findNft(id) ?? db.data.nfts[0])
      const body: Highlights = {
        hero: [pick('emerald-ape-042'), pick('ivory-baron-088'), pick('golden-beat-207')],
        spotlight: pick('sage-nomad-009'),
      }
      return HttpResponse.json(body)
    }),
  ),
]
