import { createFileRoute } from '@tanstack/react-router'
import { nftDetailQuery } from '@/features/catalog/queries'
import { NftDetailPage } from '@/features/nft/nft-detail-page'

export const Route = createFileRoute('/nft/$nftId')({
  loader: ({ context, params }) => {
    void context.queryClient.prefetchQuery(nftDetailQuery(params.nftId))
  },
  head: () => ({ meta: [{ title: 'NFT — Kurio' }, { name: 'description', content: 'Veja edições, disponibilidade, preço e detalhes deste NFT na Kurio.' }] }),
  staticData: { nav: 'mercado', hideTabBar: true },
  component: NftRoute,
})

function NftRoute() {
  const { nftId } = Route.useParams()
  return <NftDetailPage nftId={nftId} />
}
