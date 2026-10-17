import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { Search, ShoppingCart } from 'lucide-react'
import { toast } from 'sonner'
import type { NftSummary } from '@/api/contracts'
import { getErrorMessage } from '@/api/http'
import { Skeleton } from '@/components/ui/skeleton'
import { useAddToCart } from '@/features/cart/use-cart'
import { useToggleFavorite } from '@/features/favorites/use-favorites'
import { cn } from '@/lib/utils'
import { EthAmount } from './eth-amount'
import { FavoriteHeart } from './favorite-heart'
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
  const [popKey, setPopKey] = useState(0)

  function toggleFavorite() {
    setPopKey((key) => key + 1)
    favorites.toggle(nft.id)
  }

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
      <div className="relative bg-card px-1 pt-6 pb-6 ring-1 ring-transparent transition-[box-shadow,translate] duration-300 ease-out group-hover:-translate-y-1 group-hover:shadow-[0_18px_40px_-20px_rgb(210_138_76/0.45)] group-hover:ring-primary/40 md:pt-6 md:pb-7">
        <Link to="/nft/$nftId" params={{ nftId: nft.id }} tabIndex={-1} aria-hidden="true" className="block overflow-hidden rounded-[15px]">
          <NftImage
            image={nft.image}
            sizes={sizes}
            priority={priority}
            decorative
            className="w-full rounded-[15px] group-hover:scale-105 motion-reduce:group-hover:scale-100"
          />
        </Link>
        {nft.badge && (
          <span className="absolute top-3 left-0 bg-primary px-3 py-1 text-xs leading-4 font-medium text-primary-foreground uppercase">
            {nft.badge === 'raro' ? 'Raro' : 'Novo'}
          </span>
        )}
        <button
          type="button"
          onClick={toggleFavorite}
          aria-label={isFavorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
          aria-pressed={isFavorite}
          className="absolute top-8 right-3 grid size-8 place-items-center rounded-full bg-ink/60 text-foreground backdrop-blur-sm md:hidden"
        >
          <FavoriteHeart filled={isFavorite} popKey={popKey} className={cn('size-4', isFavorite && 'text-text-accent')} />
        </button>
        {soldOut && (
          <span className="absolute top-3 right-0 bg-surface-dark px-3 py-1 text-xs leading-4 font-medium text-text-secondary">Esgotado</span>
        )}
        <div className="absolute inset-x-0 bottom-1 hidden translate-y-2 justify-center gap-2 opacity-0 transition-[opacity,translate] duration-300 ease-out group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 md:flex">
          <CardAction label={`Adicionar ${nft.name} ao carrinho`} onClick={handleAddToCart} disabled={soldOut || addToCart.isPending}>
            <ShoppingCart className="size-4" aria-hidden="true" />
          </CardAction>
          <CardAction
            label={isFavorite ? `Remover ${nft.name} dos favoritos` : `Favoritar ${nft.name}`}
            pressed={isFavorite}
            onClick={toggleFavorite}
          >
            <FavoriteHeart filled={isFavorite} popKey={popKey} className="size-4" />
          </CardAction>
          <Link
            to="/nft/$nftId"
            params={{ nftId: nft.id }}
            aria-label={`Ver detalhes de ${nft.name}`}
            className="grid size-[30px] place-items-center rounded-[5px] bg-surface-dark text-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            <Search className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 leading-4">
        <h3 id={`nft-${nft.id}`} className="text-base font-normal">
          <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="transition-colors hover:text-text-accent">
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
        'grid size-[30px] place-items-center rounded-[5px] bg-surface-dark transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-50',
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
