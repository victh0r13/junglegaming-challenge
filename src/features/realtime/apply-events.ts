import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { Cart, Highlights, NftDetail, NftPage, NftSummary, NftUpdatedEvent, Order, OrderUpdatedEvent } from '@/api/contracts'
import { queryKeys } from '@/api/query-keys'
import { compareEth, formatEth } from '@/lib/eth'
import type { EventTracker } from './event-tracker'

function knownNftVersion(queryClient: QueryClient, nftId: string) {
  const detail = queryClient.getQueryData<NftDetail>(queryKeys.nfts.detail(nftId))
  let version = detail?.version ?? 0
  for (const [, page] of queryClient.getQueriesData<NftPage>({ queryKey: ['nfts', 'list'] })) {
    const item = page?.items.find((candidate) => candidate.id === nftId)
    if (item) version = Math.max(version, item.version)
  }
  return version
}

function patchSummary<T extends NftSummary>(item: T, event: NftUpdatedEvent): T {
  if (item.id !== event.resource.id || item.version >= event.version) return item
  const priceChanged = compareEth(item.priceEth, event.data.priceEth) !== 0
  return {
    ...item,
    priceEth: event.data.priceEth,
    previousPriceEth: priceChanged ? item.priceEth : item.previousPriceEth,
    available: event.data.available,
    version: event.version,
  }
}

export function applyNftUpdated(queryClient: QueryClient, tracker: EventTracker, event: NftUpdatedEvent) {
  const nftId = event.resource.id
  if (!tracker.shouldApply(event.eventId, `nft:${nftId}`, event.version, knownNftVersion(queryClient, nftId))) return false

  queryClient.setQueryData<NftDetail>(queryKeys.nfts.detail(nftId), (detail) => {
    if (!detail) return detail
    const patched = patchSummary(detail, event)
    return {
      ...patched,
      editions: detail.editions.map((edition) => {
        const update = event.data.editions.find((candidate) => candidate.id === edition.id)
        return update ? { ...edition, priceEth: update.priceEth, available: update.available } : edition
      }),
    }
  })
  queryClient.setQueriesData<NftPage>({ queryKey: ['nfts', 'list'] }, (page) =>
    page ? { ...page, items: page.items.map((item) => patchSummary(item, event)) } : page,
  )
  queryClient.setQueryData<Highlights>(queryKeys.nfts.highlights(), (highlights) =>
    highlights
      ? { hero: highlights.hero.map((item) => patchSummary(item, event)), spotlight: patchSummary(highlights.spotlight, event) }
      : highlights,
  )

  const affectedCartItems = queryClient
    .getQueriesData<Cart>({ queryKey: queryKeys.cart.all })
    .flatMap(([, cart]) => (cart && 'items' in cart ? cart.items : []))
    .filter((item) => item.nftId === nftId)

  if (affectedCartItems.length > 0) {
    queryClient.invalidateQueries({ queryKey: queryKeys.cart.all })
    const item = affectedCartItems[0]
    const edition = event.data.editions.find((candidate) => candidate.id === item.editionId)
    if (edition && edition.available === 0) {
      toast.warning(`${item.name} (${item.editionLabel}) esgotou`, { description: 'O item do seu carrinho ficou indisponível.', id: `rt-${nftId}` })
    } else if (edition && compareEth(edition.priceEth, item.unitPriceEth) !== 0) {
      toast.warning(`O preço de ${item.name} mudou`, {
        description: `${formatEth(item.unitPriceEth)} ETH → ${formatEth(edition.priceEth)} ETH. Revise o carrinho antes de finalizar.`,
        id: `rt-${nftId}`,
      })
    } else if (edition && edition.available < item.quantity) {
      toast.warning(`Disponibilidade de ${item.name} reduzida`, { description: `Restam ${edition.available} unidade(s).`, id: `rt-${nftId}` })
    }
  }
  return true
}

export function applyOrderUpdated(queryClient: QueryClient, tracker: EventTracker, event: OrderUpdatedEvent, currentUserId: string | null) {
  if (!currentUserId || event.data.userId !== currentUserId) return false
  const key = queryKeys.private.order(currentUserId, event.resource.id)
  const cached = queryClient.getQueryData<Order>(key)
  if (!tracker.shouldApply(event.eventId, `order:${event.resource.id}`, event.version, cached?.version ?? 0)) return false
  if (cached?.status !== 'pending' && cached) return false

  queryClient.invalidateQueries({ queryKey: key })
  queryClient.invalidateQueries({ queryKey: queryKeys.cart.all })
  if (event.data.status === 'confirmed') toast.success('Pagamento confirmado na rede', { id: `pedido-${event.resource.id}` })
  if (event.data.status === 'declined') toast.error('Pagamento recusado', { id: `pedido-${event.resource.id}` })
  return true
}
