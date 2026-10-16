import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/nft/$nftId')({
  staticData: { nav: 'mercado' },
  component: NftDetailPage,
})

function NftDetailPage() {
  const { nftId } = Route.useParams()
  return (
    <section className="page-container py-10">
      <h1 className="text-2xl font-bold">NFT {nftId}</h1>
    </section>
  )
}
