import { useQuery } from '@tanstack/react-query'
import { NftCard, NftCardSkeleton } from '@/components/nft/nft-card'
import { nftListQuery } from '@/features/catalog/queries'

export function RelatedNfts({ nftId, collection }: { nftId: string; collection: string }) {
  const { data, isPending } = useQuery(nftListQuery({ colecoes: [collection], porPagina: 5, excluir: nftId }))
  const items = data?.items ?? []
  if (!isPending && items.length === 0) return null

  return (
    <section aria-labelledby="mais-colecao" className="page-container mt-16 hidden md:block">
      <h2 id="mais-colecao" className="border-b border-border pb-2 text-base font-bold text-text-accent">
        Mais desta coleção
      </h2>
      <div className="mt-6 grid grid-cols-3 gap-4 lg:grid-cols-5">
        {isPending
          ? Array.from({ length: 5 }, (_, index) => <NftCardSkeleton key={index} />)
          : items.map((nft) => <NftCard key={nft.id} nft={nft} sizes="(min-width: 1024px) 190px, 30vw" />)}
      </div>
    </section>
  )
}
