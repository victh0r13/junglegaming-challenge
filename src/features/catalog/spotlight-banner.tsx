import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { EthAmount } from '@/components/nft/eth-amount'
import { NftImage } from '@/components/nft/nft-image'
import { Skeleton } from '@/components/ui/skeleton'
import { highlightsQuery } from './queries'

export function SpotlightBanner() {
  const { data } = useQuery(highlightsQuery())
  const spotlight = data?.spotlight

  return (
    <section
      aria-labelledby="destaque-titulo"
      className="relative isolate overflow-hidden rounded-[10px] border border-primary/25 bg-linear-to-b from-primary/15 via-primary/[0.06] to-card p-5"
    >
      <span aria-hidden="true" className="absolute -top-20 -right-16 -z-10 size-56 rounded-full bg-primary/20 blur-3xl" />
      <span aria-hidden="true" className="absolute -bottom-24 -left-20 -z-10 size-56 rounded-full bg-primary/10 blur-3xl" />

      <h2 id="destaque-titulo" className="text-2xl leading-8 font-bold text-text-accent">
        NFT EM DESTAQUE
      </h2>
      <p className="mt-1 inline-flex items-center gap-2 text-sm font-bold tracking-[0.08em]">
        <span aria-hidden="true" className="size-2 animate-pulse rounded-full bg-text-coral" />
        OFERTA LIMITADA
      </p>

      {spotlight ? (
        <Link to="/nft/$nftId" params={{ nftId: spotlight.id }} className="group mt-4 block rounded-[16px]">
          <span className="relative block overflow-hidden rounded-[16px] ring-1 ring-primary/30 transition-shadow duration-300 group-hover:shadow-[0_18px_40px_-18px_rgb(210_138_76/0.6)]">
            <NftImage
              image={spotlight.image}
              sizes="270px"
              decorative
              className="w-full rounded-[16px] duration-700 group-hover:scale-105 motion-reduce:group-hover:scale-100"
            />
            <span className="absolute inset-x-0 bottom-0 flex flex-col gap-0.5 bg-linear-to-t from-ink/95 via-ink/70 to-transparent px-4 pt-10 pb-3">
              <span className="truncate text-base font-bold">{spotlight.name}</span>
              <span className="text-sm font-bold">
                <EthAmount value={spotlight.priceEth} previous={spotlight.previousPriceEth} className="text-text-accent" previousClassName="line-through" />
              </span>
            </span>
          </span>
          <span className="mt-4 flex h-10 items-center justify-center gap-2 rounded-[6px] bg-primary text-sm font-bold text-primary-foreground transition-colors group-hover:bg-primary/85">
            Ver oferta
            <ArrowRight className="size-4 transition-[translate] group-hover:translate-x-0.5" aria-hidden="true" />
          </span>
        </Link>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <Skeleton className="aspect-square w-full rounded-[16px]" />
          <Skeleton className="h-10 w-full rounded-[6px]" />
        </div>
      )}
    </section>
  )
}
