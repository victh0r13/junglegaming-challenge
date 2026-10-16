import { Link } from '@tanstack/react-router'
import { Heart, Search, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import type { NftSummary } from '@/api/contracts'
import { getErrorMessage } from '@/api/http'
import { Skeleton } from '@/components/ui/skeleton'
import { useAddToCart } from '@/features/cart/use-cart'
import { useToggleFavorite } from '@/features/favorites/use-favorites'
import { cn } from '@/lib/utils'
import { EthAmount } from './eth-amount'
import { NftImage } from './nft-image'

const DEFAULT_EDITION = '1-50'

type NftCardProps = {
  nft: NftSummary
  sizes?: string
  priority?: boolean
  className?: string
}

export function NftCard({ nft, sizes = '(min-width: 1024px) 250px, (min-width: 768px) 30vw, 45vw', priority, className }: NftCardProps) {
  const favorites = useToggleFavorite()
  const addToCart = useAddToCart()
  const isFavorite = favorites.isFavorite(nft.id)
  const soldOut = nft.available === 0

  function handleAddToCart() {
    addToCart.mutate(
      { nftId: nft.id, editionId: DEFAULT_EDITION, quantity: 1 },
      {
        onSuccess: () => toast.success(`${nft.name} adicionado ao carrinho`, { description: 'Edição 1/50 · 1 unidade' }),
        onError: (error) => toast.error('Não foi possível adicionar ao carrinho', { description: getErrorMessage(error) }),
      },
    )
  }

  return (
    <article className={cn('group relative flex flex-col gap-3', className)} aria-labelledby={`nft-${nft.id}`}>
      <div className="relative bg-card px-1 pt-6 pb-6 md:pt-6 md:pb-7">
        <Link to="/nft/$nftId" params={{ nftId: nft.id }} tabIndex={-1} aria-hidden="true" className="block">
          <NftImage image={nft.image} sizes={sizes} priority={priority} decorative className="w-full rounded-[15px]" />
        </Link>
        {nft.badge && (
          <span className="absolute top-3 left-0 bg-primary px-3 py-1 text-xs leading-4 font-medium text-primary-foreground uppercase">
            {nft.badge === 'raro' ? 'Raro' : 'Novo'}
          </span>
        )}
        <button
          type="button"
          onClick={() => favorites.toggle(nft.id)}
          aria-label={isFavorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
          aria-pressed={isFavorite}
          className="absolute top-8 right-3 grid size-8 place-items-center rounded-full bg-ink/60 text-foreground md:hidden"
        >
          <Heart className={cn('size-4', isFavorite && 'fill-current text-text-accent')} aria-hidden="true" />
        </button>
        {soldOut && (
          <span className="absolute top-3 right-0 bg-surface-dark px-3 py-1 text-xs leading-4 font-medium text-text-secondary">Esgotado</span>
        )}
        <div className="absolute inset-x-0 bottom-1 hidden justify-center gap-2 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 md:flex">
          <CardAction label={`Adicionar ${nft.name} ao carrinho`} onClick={handleAddToCart} disabled={soldOut || addToCart.isPending}>
            <ShoppingCart className="size-4" aria-hidden="true" />
          </CardAction>
          <CardAction
            label={isFavorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
            pressed={isFavorite}
            onClick={() => favorites.toggle(nft.id)}
          >
            <Heart className={cn('size-4', isFavorite && 'fill-current')} aria-hidden="true" />
          </CardAction>
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            aria-label={`Ver detalhes de ${nft.name}`}
            className="grid size-[30px] place-items-center rounded-[5px] bg-surface-dark text-foreground hover:text-text-accent"
          >
            <Search className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 leading-4">
        <h3 id={`nft-${nft.id}`} className="text-base font-normal">
          <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="hover:text-text-accent">
            {nft.name}
          </Link>
        </h3>
        <p className="text-lg font-bold">
          <EthAmount value={nft.priceEth} previous={nft.previousPriceEth} className="text-text-accent" maxFractionDigits={2} />
        </p>
      </div>
    </article>
  )
}

type CardActionProps = {
  label: string
  onClick: () => void
  children: React.ReactNode
  pressed?: boolean
  disabled?: boolean
}

function CardAction({ label, onClick, children, pressed, disabled }: CardActionProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'grid size-[30px] place-items-center rounded-[5px] bg-surface-dark transition-colors hover:text-text-accent disabled:opacity-50',
        pressed ? 'text-text-accent' : 'text-foreground',
      )}
    >
      {children}
    </button>
  )
}

export function NftCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)} aria-hidden="true">
      <div className="bg-card px-1 pt-6 pb-6 md:pb-7">
        <Skeleton className="aspect-square w-full rounded-[15px] bg-surface-dark" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
      </div>
    </div>
  )
}
