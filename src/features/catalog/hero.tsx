import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import { NftImage } from '@/components/nft/nft-image'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { highlightsQuery } from './queries'

export function Hero() {
  const { data } = useQuery(highlightsQuery())
  const [active, setActive] = useState(0)
  const slides = data?.hero ?? []
  const current = slides[active]

  return (
    <section aria-roledescription="carrossel" aria-label="Destaques" className="page-container md:mt-8">
      <div className="relative hidden items-center justify-between gap-10 md:flex lg:pl-10">
        <div className="flex max-w-[600px] flex-1 flex-col items-end gap-11">
          <div className="flex w-full flex-col gap-8">
            <div className="flex flex-col gap-1">
              <p className="text-sm leading-4 font-medium tracking-[0.1em]">Bem-vindo à Kurio</p>
              <h1 className="mt-2 text-[32px] leading-[52px] font-bold lg:text-[43px] lg:leading-[70px]">
                SEJA DONO DO FUTURO
                <br />
                DA ARTE DIGITAL
              </h1>
              <p className="max-w-[557px] text-sm leading-6 text-text-secondary">
                Descubra NFTs selecionados de criadores emergentes e consagrados. Colecione arte digital rara, apoie artistas e tenha uma
                parte da cultura da internet.
              </p>
            </div>
            <Link
              to="/"
              hash="catalogo"
              className="grid h-10 w-[140px] place-items-center rounded-[6px] bg-primary text-base leading-5 font-bold text-primary-foreground hover:bg-primary/85"
            >
              EXPLORAR
            </Link>
          </div>
          <SlideDots count={slides.length} active={active} onSelect={setActive} names={slides.map((slide) => slide.name)} />
        </div>
        <div className="relative size-[min(450px,40vw)] shrink-0">
          {current ? (
            <Link to="/nft/$nftId" params={{ nftId: current.id }} className="block rounded-[24px]" aria-label={`Ver ${current.name}`}>
              <NftImage image={current.image} sizes="(min-width: 1024px) 450px, 40vw" priority className="size-full rounded-[24px]" />
            </Link>
          ) : (
            <Skeleton className="size-full rounded-[24px]" />
          )}
        </div>
      </div>

      <div className="relative mt-4 overflow-hidden rounded-[24px] bg-linear-to-br from-surface-dark to-card p-4 md:hidden">
        <span aria-hidden="true" className="absolute -top-16 left-1/3 size-56 rounded-full bg-primary/10" />
        <div className="relative flex items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <p className="text-xs leading-4 font-medium">Bem-vindo à Kurio</p>
            <h1 className="text-lg leading-8 font-bold">SEJA DONO DA CULTURA DIGITAL</h1>
            <p className="text-xs leading-5 text-text-secondary">Descubra NFTs selecionados de criadores do mundo todo.</p>
            <Link to="/" hash="catalogo" className="mt-1 inline-flex items-center gap-2 text-xs font-bold text-text-accent">
              EXPLORAR <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="relative size-[138px] shrink-0">
            {current ? (
              <NftImage image={current.image} sizes="138px" priority className="size-full rounded-[14px]" />
            ) : (
              <Skeleton className="size-full rounded-[14px]" />
            )}
          </div>
        </div>
        <div className="relative mt-3 flex justify-center">
          <SlideDots count={slides.length} active={active} onSelect={setActive} names={slides.map((slide) => slide.name)} />
        </div>
      </div>
    </section>
  )
}

type SlideDotsProps = { count: number; active: number; onSelect: (index: number) => void; names: string[] }

function SlideDots({ count, active, onSelect, names }: SlideDotsProps) {
  if (count === 0) return <span className="h-2" />
  return (
    <div className="flex gap-1" role="group" aria-label="Escolher destaque">
      {Array.from({ length: count }, (_, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onSelect(index)}
          aria-label={`Destaque ${index + 1}: ${names[index]}`}
          aria-pressed={index === active}
          className="grid size-6 place-items-center rounded-full"
        >
          <span className={cn('size-2 rounded-full bg-primary transition-opacity', index === active ? 'opacity-100' : 'opacity-50')} />
        </button>
      ))}
    </div>
  )
}
