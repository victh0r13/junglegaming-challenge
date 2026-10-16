import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { ArrowLeft, Heart, Mail, Minus, Plus, Search, ShoppingCart, Star } from 'lucide-react'
import { toast } from 'sonner'
import { COLLECTION_LABELS, NETWORK_LABELS, type Edition, type NftDetail } from '@/api/contracts'
import { getErrorMessage, isApiError } from '@/api/http'
import { LinkedinIcon, TwitterIcon } from '@/components/icons'
import { NotFoundPage } from '@/components/not-found-page'
import { EthAmount } from '@/components/nft/eth-amount'
import { NftImage } from '@/components/nft/nft-image'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useAddToCart, useCart } from '@/features/cart/use-cart'
import { nftDetailQuery } from '@/features/catalog/queries'
import { useToggleFavorite } from '@/features/favorites/use-favorites'
import { cn } from '@/lib/utils'
import { RelatedNfts } from './related-nfts'

function pickDefaultEdition(nft: NftDetail) {
  return (nft.editions.find((edition) => edition.id === '1-50' && edition.available > 0) ?? nft.editions.find((edition) => edition.available > 0))?.id
}

export function NftDetailPage({ nftId }: { nftId: string }) {
  const query = useQuery(nftDetailQuery(nftId))

  if (query.isError && isApiError(query.error) && query.error.code === 'NOT_FOUND') {
    return <NotFoundPage title="NFT não encontrado" description="Este NFT não existe, foi removido ou o link está incorreto." />
  }
  if (query.isError && !query.data) {
    return (
      <section className="page-container py-16" role="alert">
        <h1 className="text-2xl font-bold">Não foi possível carregar este NFT</h1>
        <p className="mt-2 text-sm text-text-secondary">{getErrorMessage(query.error)}</p>
        <button type="button" onClick={() => query.refetch()} className="mt-4 rounded-[6px] bg-primary px-4 py-2 font-bold text-primary-foreground">
          Tentar novamente
        </button>
      </section>
    )
  }
  if (!query.data) return <NftDetailSkeleton />
  return <NftDetailView key={query.data.id} nft={query.data} />
}

function NftDetailView({ nft }: { nft: NftDetail }) {
  const navigate = useNavigate()
  const router = useRouter()
  const favorites = useToggleFavorite()
  const addToCart = useAddToCart()
  const cart = useCart()
  const [editionId, setEditionId] = useState(() => pickDefaultEdition(nft))
  const [quantity, setQuantity] = useState(1)
  const [activeImage, setActiveImage] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)
  const [tab, setTab] = useState<'detalhes' | 'avaliacoes'>('detalhes')

  const edition = nft.editions.find((candidate) => candidate.id === editionId)
  const inCart = cart.data?.items.find((item) => item.nftId === nft.id && item.editionId === editionId)?.quantity ?? 0
  const maxQuantity = edition ? Math.max(0, Math.min(edition.available, edition.maxPerOrder) - inCart) : 0
  const isFavorite = favorites.isFavorite(nft.id)

  useEffect(() => {
    document.title = `${nft.name} — Kurio`
  }, [nft.name])

  useEffect(() => {
    if (edition && edition.available === 0) setEditionId(pickDefaultEdition(nft))
  }, [edition, nft])

  useEffect(() => {
    setQuantity((current) => Math.max(1, Math.min(current, Math.max(1, maxQuantity))))
  }, [maxQuantity])

  function add(goToCart: boolean) {
    if (!edition) return
    addToCart.mutate(
      { nftId: nft.id, editionId: edition.id, quantity },
      {
        onSuccess: () => {
          toast.success(`${nft.name} adicionado ao carrinho`, { description: `Edição ${edition.label} · ${quantity} unidade(s)` })
          if (goToCart) navigate({ to: '/carrinho' })
        },
        onError: (error) => toast.error('Não foi possível adicionar ao carrinho', { description: getErrorMessage(error) }),
      },
    )
  }

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/nft/${nft.id}` : `/nft/${nft.id}`
  const canBuy = Boolean(edition) && maxQuantity > 0 && !addToCart.isPending

  return (
    <>
      <div className="page-container hidden pt-6 md:block">
        <nav aria-label="Trilha de navegação">
          <ol className="flex gap-2 text-sm font-bold">
            <li>
              <Link to="/" className="hover:text-text-accent">
                Início
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li>
              <Link to="/" hash="catalogo" className="hover:text-text-accent">
                Mercado
              </Link>
            </li>
          </ol>
        </nav>
      </div>

      <article aria-labelledby="nft-titulo" className="md:page-container md:mt-4">
        <div className="flex flex-col md:flex-row md:gap-5">
          <div className="relative md:hidden">
            <NftImage image={nft.gallery[activeImage]} sizes="100vw" priority className="h-[506px] w-full rounded-none" />
            <div className="absolute inset-x-7 top-6 flex justify-between">
              <button
                type="button"
                onClick={() => (window.history.length > 1 ? router.history.back() : navigate({ to: '/' }))}
                aria-label="Voltar"
                className="grid size-[35px] place-items-center rounded-[10px] bg-ink/70 text-foreground"
              >
                <ArrowLeft className="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => favorites.toggle(nft.id)}
                aria-pressed={isFavorite}
                aria-label={isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
                className="grid size-[35px] place-items-center rounded-[10px] bg-ink/70 text-foreground"
              >
                <Heart className={cn('size-4', isFavorite && 'fill-current text-text-accent')} aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="hidden shrink-0 gap-5 md:flex">
            <ul className="flex flex-col gap-3" aria-label="Galeria">
              {nft.gallery.map((image, index) => (
                <li key={`${image.src}-${index}`}>
                  <button
                    type="button"
                    onClick={() => setActiveImage(index)}
                    aria-label={`Imagem ${index + 1} de ${nft.gallery.length}`}
                    aria-current={index === activeImage}
                    className={cn('block rounded-[4px] border-2', index === activeImage ? 'border-primary' : 'border-transparent hover:border-border-soft')}
                  >
                    <NftImage image={image} sizes="71px" decorative className="size-[67px] rounded-[2px]" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="relative bg-card p-4">
              <NftImage image={nft.gallery[activeImage]} sizes="(min-width: 1024px) 384px, 40vw" priority className="size-[min(384px,38vw)] rounded-[15px]" />
              <button
                type="button"
                onClick={() => setZoomOpen(true)}
                aria-label="Ampliar imagem"
                className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-ink/70 text-foreground hover:text-text-accent"
              >
                <Search className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="relative z-10 -mt-28 flex flex-1 flex-col rounded-t-[40px] bg-background px-6 pt-8 pb-48 md:mt-0 md:rounded-none md:px-0 md:pt-0 md:pb-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 id="nft-titulo" className="text-xl font-bold md:text-[26px] md:leading-8">
                {nft.name}
              </h1>
              <Rating value={nft.rating} count={nft.reviewsCount} />
            </div>
            <p className="mt-3 hidden text-xl font-bold md:block">
              <EthAmount value={edition?.priceEth ?? nft.priceEth} className="text-text-accent" />
            </p>
            <div className="mt-3 hidden border-t border-border md:block" />

            <h2 className="mt-4 hidden text-sm font-bold md:block">Sobre este NFT:</h2>
            <p className="mt-3 text-sm leading-6 text-text-secondary md:mt-2 md:text-[13px]">{nft.description}</p>

            <EditionPicker editions={nft.editions} value={editionId} onChange={setEditionId} />

            <div className="mt-5 hidden items-center justify-between gap-4 md:flex">
              <QuantityStepper value={quantity} max={maxQuantity} onChange={setQuantity} inCart={inCart} />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => add(true)}
                  disabled={!canBuy}
                  className="h-[35px] rounded-[5px] bg-primary px-6 text-sm font-bold text-primary-foreground hover:bg-primary/85 disabled:opacity-50"
                >
                  {addToCart.isPending ? 'ADICIONANDO…' : 'COMPRAR'}
                </button>
                <button
                  type="button"
                  onClick={() => favorites.toggle(nft.id)}
                  aria-pressed={isFavorite}
                  className={cn(
                    'flex h-[35px] items-center gap-2 rounded-[5px] border border-primary px-3 text-sm transition-colors',
                    isFavorite ? 'bg-primary/15 text-text-accent' : 'text-text-secondary hover:text-foreground',
                  )}
                >
                  <Heart className={cn('size-4', isFavorite && 'fill-current')} aria-hidden="true" />
                  {isFavorite ? 'Favoritado' : 'Favoritar'}
                </button>
              </div>
            </div>
            <AvailabilityNote edition={edition} maxQuantity={maxQuantity} inCart={inCart} />

            <dl className="mt-5 flex flex-col gap-3 text-sm leading-5 text-text-secondary">
              <div className="flex gap-1">
                <dt>ID do token:</dt>
                <dd>{nft.tokenId}</dd>
              </div>
              <div className="flex gap-1">
                <dt>Coleção:</dt>
                <dd>
                  {nft.collectionName} · {COLLECTION_LABELS[nft.collection]}
                </dd>
              </div>
              <div className="flex gap-1">
                <dt>Atributos:</dt>
                <dd>{nft.attributes.join(', ')}</dd>
              </div>
            </dl>
            <div className="mt-3 flex items-center gap-3 text-sm font-bold">
              Compartilhar este NFT:
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Compartilhar no LinkedIn (abre em nova aba)"
                className="text-foreground hover:text-text-accent"
              >
                <LinkedinIcon className="size-6" />
              </a>
              <a href={`mailto:?subject=${encodeURIComponent(nft.name)}&body=${encodeURIComponent(shareUrl)}`} aria-label="Compartilhar por e-mail" className="hover:text-text-accent">
                <Mail className="size-4" aria-hidden="true" />
              </a>
              <a
                href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(nft.name)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Compartilhar no Twitter (abre em nova aba)"
                className="text-foreground hover:text-text-accent"
              >
                <TwitterIcon className="size-6" />
              </a>
            </div>
          </div>
        </div>

        <section className="page-container mt-16 hidden md:block" aria-label="Informações adicionais">
          <div role="tablist" aria-label="Informações do NFT" className="flex gap-6 border-b border-border">
            {(
              [
                ['detalhes', 'Detalhes do NFT'],
                ['avaliacoes', `Avaliações de colecionadores (${nft.reviewsCount})`],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                id={`aba-${id}`}
                role="tab"
                type="button"
                aria-selected={tab === id}
                aria-controls={`painel-${id}`}
                tabIndex={tab === id ? 0 : -1}
                onClick={() => setTab(id)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                    const next = id === 'detalhes' ? 'avaliacoes' : 'detalhes'
                    setTab(next)
                    document.getElementById(`aba-${next}`)?.focus()
                  }
                }}
                className={cn('-mb-px border-b-2 pb-2 text-base', tab === id ? 'border-primary font-bold text-text-accent' : 'border-transparent')}
              >
                {label}
              </button>
            ))}
          </div>
          <div id={`painel-${tab}`} role="tabpanel" aria-labelledby={`aba-${tab}`} className="pt-4 text-[13px] leading-[26px] text-text-secondary">
            {tab === 'detalhes' ? (
              <div className="flex flex-col gap-4">
                {nft.details.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                <DetailLine title="Rede:" text={`Cunhado na ${NETWORK_LABELS[nft.network]} com procedência imutável e metadados armazenados no IPFS.`} />
                <DetailLine title="Contrato:" text={`Direitos autorais do criador: ${nft.royaltyPercent}% nas vendas secundárias, pagos automaticamente pelos mercados compatíveis.`} />
                <DetailLine title="Direitos autorais:" text={`${nft.contractAddress} · Contrato inteligente ERC-721 verificado.`} />
              </div>
            ) : (
              <p>
                Nota média {nft.rating.toFixed(1).replace('.', ',')} de 5 com base em {nft.reviewsCount} avaliações. A leitura dos comentários
                individuais estará disponível em breve.
              </p>
            )}
          </div>
        </section>

        <RelatedNfts nftId={nft.id} collection={nft.collection} />
      </article>

      <div className="fixed inset-x-0 bottom-0 z-40 rounded-t-[30px] bg-card px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(10,6,4,0.45)] md:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span>Qtd.</span>
            <QuantityStepper value={quantity} max={maxQuantity} onChange={setQuantity} inCart={inCart} compact />
          </div>
          <p className="text-lg font-bold">
            <EthAmount value={edition?.priceEth ?? nft.priceEth} className="text-text-accent" />
          </p>
        </div>
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => add(true)}
            disabled={!canBuy}
            className="h-[60px] flex-1 rounded-[10px] bg-primary text-base font-bold text-primary-foreground disabled:opacity-50"
          >
            Comprar NFT
          </button>
          <button
            type="button"
            onClick={() => add(false)}
            disabled={!canBuy}
            aria-label="Adicionar ao carrinho"
            className="grid size-[60px] place-items-center rounded-[10px] border border-primary text-text-accent disabled:opacity-50"
          >
            <ShoppingCart className="size-5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
        <DialogContent className="max-w-[min(90vw,720px)] bg-card p-3 sm:max-w-[min(90vw,720px)]">
          <DialogTitle className="sr-only">{nft.name}</DialogTitle>
          <DialogDescription className="sr-only">{nft.gallery[activeImage].alt}</DialogDescription>
          <NftImage image={nft.gallery[activeImage]} sizes="720px" className="w-full rounded-[12px]" />
        </DialogContent>
      </Dialog>
    </>
  )
}

function DetailLine({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3 className="font-bold text-foreground">{title}</h3>
      <p>{text}</p>
    </div>
  )
}

function Rating({ value, count }: { value: number; count: number }) {
  const rounded = Math.round(value)
  return (
    <p className="flex items-center gap-1 text-[13px]" aria-label={`Nota ${value.toFixed(1)} de 5, ${count} avaliações`}>
      <span className="flex text-primary" aria-hidden="true">
        {Array.from({ length: 5 }, (_, index) => (
          <Star key={index} className={cn('size-3.5', index < rounded ? 'fill-current' : 'opacity-40')} />
        ))}
      </span>
      <span aria-hidden="true" className="max-md:hidden">
        {count} avaliações de colecionadores
      </span>
      <span aria-hidden="true" className="md:hidden">
        {value.toFixed(1)} ({count})
      </span>
    </p>
  )
}

function EditionPicker({ editions, value, onChange }: { editions: Edition[]; value: string | undefined; onChange: (id: string) => void }) {
  return (
    <fieldset className="mt-5">
      <legend className="text-sm font-bold">Edição:</legend>
      <div className="mt-2 flex flex-wrap gap-3">
        {editions.map((edition) => {
          const unavailable = edition.available === 0
          const selected = edition.id === value
          return (
            <label
              key={edition.id}
              className={cn(
                'relative cursor-pointer rounded-full border px-2 py-1 text-[13px] leading-4 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-ring',
                selected ? 'border-primary text-foreground' : 'border-border-soft text-text-secondary hover:text-foreground',
                unavailable && 'cursor-not-allowed line-through opacity-50',
              )}
            >
              <input
                type="radio"
                name="edicao"
                value={edition.id}
                checked={selected}
                disabled={unavailable}
                onChange={() => onChange(edition.id)}
                className="sr-only"
              />
              {edition.label}
              {unavailable && <span className="sr-only"> (esgotada)</span>}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}

function QuantityStepper({
  value,
  max,
  onChange,
  inCart,
  compact = false,
}: {
  value: number
  max: number
  onChange: (value: number) => void
  inCart: number
  compact?: boolean
}) {
  const disabled = max === 0
  const buttonClass = compact
    ? 'grid h-[30px] w-5 place-items-center rounded-full text-text-accent disabled:opacity-40'
    : 'grid size-[30px] place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40'
  return (
    <div className="flex items-center gap-3" role="group" aria-label="Quantidade">
      <button type="button" className={buttonClass} onClick={() => onChange(value - 1)} disabled={disabled || value <= 1} aria-label="Diminuir quantidade">
        <Minus className="size-4" aria-hidden="true" />
      </button>
      <output aria-live="polite" className="min-w-4 text-center text-base">
        {disabled ? 0 : value}
      </output>
      <button type="button" className={buttonClass} onClick={() => onChange(value + 1)} disabled={disabled || value >= max} aria-label="Aumentar quantidade">
        <Plus className="size-4" aria-hidden="true" />
      </button>
      <span className="sr-only">{inCart > 0 ? `Você já tem ${inCart} no carrinho.` : ''}</span>
    </div>
  )
}

function AvailabilityNote({ edition, maxQuantity, inCart }: { edition: Edition | undefined; maxQuantity: number; inCart: number }) {
  const message = useMemo(() => {
    if (!edition) return 'Todas as edições deste NFT estão esgotadas.'
    if (maxQuantity === 0 && inCart > 0) return `Você já tem o limite desta edição no carrinho (${inCart}).`
    if (maxQuantity === 0) return 'Esta edição está indisponível.'
    const stock = edition.supply === null ? 'Edição aberta' : `${edition.available} de ${edition.supply} disponíveis`
    return `${stock} · máximo de ${edition.maxPerOrder} por pedido${inCart > 0 ? ` · ${inCart} no carrinho` : ''}`
  }, [edition, maxQuantity, inCart])
  return (
    <p className="mt-3 text-xs text-text-secondary" aria-live="polite">
      {message}
    </p>
  )
}

function NftDetailSkeleton() {
  return (
    <div className="page-container pt-6" aria-busy="true" aria-label="Carregando NFT">
      <Skeleton className="hidden h-4 w-40 md:block" />
      <div className="mt-4 flex flex-col gap-5 md:flex-row">
        <div className="hidden flex-col gap-3 md:flex">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="size-[71px]" />
          ))}
        </div>
        <Skeleton className="aspect-square w-full md:size-[min(416px,40vw)]" />
        <div className="flex flex-1 flex-col gap-4">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-6 w-1/4" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-7 w-1/2" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-16 w-2/3" />
        </div>
      </div>
    </div>
  )
}
