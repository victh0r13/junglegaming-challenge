import { useState, type KeyboardEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'
import type { NftSummary } from '@/api/contracts'
import { NftImage } from '@/components/nft/nft-image'
import { Skeleton } from '@/components/ui/skeleton'
import { BREAKPOINTS, useMediaQuery } from '@/lib/use-media-query'
import { cn } from '@/lib/utils'
import { highlightsQuery } from './queries'

export function Hero() {
  const { data } = useQuery(highlightsQuery())
  const [active, setActive] = useState(0)
  const [changed, setChanged] = useState(false)
  const isDesktop = useMediaQuery(BREAKPOINTS.md)
  const slides = data?.hero ?? []

  function select(index: number) {
    setActive(index)
    setChanged(true)
  }

  const slideProps: SlideProps = {
    slides,
    active,
    onSelect: select,
    animation: changed ? 'animate-in fade-in zoom-in-95 duration-500 ease-out' : undefined,
  }

  return (
    <section aria-roledescription="carrossel" aria-label="Destaques" className="page-container md:mt-8">
      {isDesktop ? <DesktopHero {...slideProps} /> : <MobileHero {...slideProps} />}
    </section>
  )
}

type SlideProps = {
  slides: NftSummary[]
  active: number
  onSelect: (index: number) => void
  animation?: string
}

function DesktopHero({ slides, active, onSelect, animation }: SlideProps) {
  const current = slides[active]
  return (
    <div className="relative flex items-center justify-between gap-10 lg:pl-10">
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
            className="grid h-10 w-[140px] place-items-center rounded-[6px] bg-primary text-base leading-5 font-bold text-primary-foreground transition-colors hover:bg-primary/85"
          >
            EXPLORAR
          </Link>
        </div>
        <SlideDots count={slides.length} active={active} onSelect={onSelect} names={slides.map((slide) => slide.name)} />
      </div>
      <div className="relative size-[min(450px,40vw)] shrink-0">
        {current ? (
          <Link
            key={current.id}
            to="/nft/$nftId"
            params={{ nftId: current.id }}
            className={cn('group block overflow-hidden rounded-[24px]', animation)}
            aria-label={`Ver ${current.name}`}
          >
            <NftImage
              image={current.image}
              sizes="(min-width: 1024px) 450px, 40vw"
              priority
              className="size-full rounded-[24px] duration-700 group-hover:scale-[1.03] motion-reduce:group-hover:scale-100"
            />
          </Link>
        ) : (
          <Skeleton className="size-full rounded-[24px]" />
        )}
      </div>
    </div>
  )
}

function MobileHero({ slides, active, onSelect, animation }: SlideProps) {
  const current = slides[active]
  return (
    <div className="relative mt-4 overflow-hidden rounded-[24px] bg-linear-to-br from-surface-dark to-card p-4">
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
            <NftImage key={current.id} image={current.image} sizes="138px" priority className={cn('size-full rounded-[14px]', animation)} />
          ) : (
            <Skeleton className="size-full rounded-[14px]" />
          )}
        </div>
      </div>
      <div className="relative mt-3 flex justify-center">
        <SlideDots count={slides.length} active={active} onSelect={onSelect} names={slides.map((slide) => slide.name)} />
      </div>
    </div>
  )
}

type SlideDotsProps = { count: number; active: number; onSelect: (index: number) => void; names: string[] }

function SlideDots({ count, active, onSelect, names }: SlideDotsProps) {
  if (count === 0) return <span className="h-6" />

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    event.preventDefault()
    const next = (active + (event.key === 'ArrowRight' ? 1 : count - 1)) % count
    onSelect(next)
    event.currentTarget.querySelectorAll('button')[next]?.focus()
  }

  return (
    <div className="flex gap-1" role="group" aria-label="Escolher destaque" onKeyDown={handleKeyDown}>
      {Array.from({ length: count }, (_, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onSelect(index)}
          aria-label={`Destaque ${index + 1}: ${names[index]}`}
          aria-pressed={index === active}
          className="group grid h-6 min-w-6 place-items-center rounded-full"
        >
          <span
            className={cn(
              'h-2 rounded-full bg-primary transition-[width,opacity] duration-300 ease-out',
              index === active ? 'w-6 opacity-100' : 'w-2 opacity-50 group-hover:opacity-80',
            )}
          />
        </button>
      ))}
    </div>
  )
}
