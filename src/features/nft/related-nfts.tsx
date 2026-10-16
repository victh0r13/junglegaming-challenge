import { useQuery } from '@tanstack/react-query'
import type { NftListParams } from '@/api/contracts'
import { NftCard, NftCardSkeleton } from '@/components/nft/nft-card'
import { nftListQuery } from '@/features/catalog/queries'

type NftRailProps = {
  title: string
  params: NftListParams
}

export function NftRail({ title, params }: NftRailProps) {
  const { data, isPending } = useQuery(nftListQuery({ porPagina: 5, ...params }))
  const items = data?.items ?? []
  if (!isPending && items.length === 0) return null
  const headingId = `rail-${title.toLowerCase().replace(/\W+/g, '-')}`

  return (
    <section aria-labelledby={headingId} className="page-container mt-16 hidden md:block">
      <h2 id={headingId} className="border-b border-border pb-2 text-base font-bold text-text-accent">
        {title}
      </h2>
      <div className="mt-6 grid grid-cols-3 gap-4 lg:grid-cols-5">
        {isPending
          ? Array.from({ length: 5 }, (_, index) => <NftCardSkeleton key={index} />)
          : items.map((nft) => <NftCard key={nft.id} nft={nft} sizes="(min-width: 1024px) 190px, 30vw" />)}
      </div>
    </section>
  )
}

export function RelatedNfts({ nftId, collection }: { nftId: string; collection: string }) {
  return <NftRail title="Mais desta coleção" params={{ colecoes: [collection], excluir: nftId }} />
}
