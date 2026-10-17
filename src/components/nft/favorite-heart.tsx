import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

type FavoriteHeartProps = {
  filled: boolean
  popKey: number
  className?: string
}

export function FavoriteHeart({ filled, popKey, className }: FavoriteHeartProps) {
  return (
    <Heart
      key={popKey}
      aria-hidden="true"
      className={cn('transition-colors', filled && 'fill-current', filled && popKey > 0 && 'animate-heart-pop', className)}
    />
  )
}
