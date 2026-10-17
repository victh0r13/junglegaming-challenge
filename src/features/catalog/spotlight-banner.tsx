import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { NftImage } from '@/components/nft/nft-image'
import { Skeleton } from '@/components/ui/skeleton'
import { highlightsQuery } from './queries'

export function SpotlightBanner() {
  const { data } = useQuery(highlightsQuery())
  const spotlight = data?.spotlight

  return (
    <section aria-labelledby="destaque-titulo" className="relative overflow-hidden bg-linear-to-b from-primary/10 to-primary/[0.03] pt-6 pb-1">
      <div className="flex flex-col items-center gap-4 px-5">
        <h2 id="destaque-titulo" className="w-full text-2xl leading-8 font-bold text-text-accent">
          NFT EM DESTAQUE
        </h2>
        <p className="w-full text-center text-[22px] leading-4 font-bold">OFERTA LIMITADA</p>
      </div>
      <div className="mt-4">
        {spotlight ? (
          <Link to="/nft/$nftId" params={{ nftId: spotlight.id }} className="group block overflow-hidden rounded-[22px]" aria-label={`Ver ${spotlight.name}`}>
            <NftImage
              image={spotlight.image}
              sizes="310px"
              className="h-[368px] w-full rounded-[22px] duration-700 group-hover:scale-105 motion-reduce:group-hover:scale-100"
            />
          </Link>
        ) : (
          <Skeleton className="h-[368px] w-full rounded-[22px]" />
        )}
      </div>
      <span aria-hidden="true" className="absolute top-[105px] left-[38px] size-[15px] rounded-full bg-linear-to-br from-primary/30 to-transparent" />
      <span aria-hidden="true" className="absolute top-[343px] left-[248px] size-[45px] rounded-full bg-linear-to-br from-primary/30 to-transparent" />
    </section>
  )
}
