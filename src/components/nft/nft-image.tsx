import type { NftImage as NftImageData } from '@/api/contracts'
import { cn } from '@/lib/utils'

type NftImageProps = {
  image: NftImageData
  sizes: string
  className?: string
  priority?: boolean
  decorative?: boolean
}

const WIDTHS = [320, 640, 960] as const

export function NftImage({ image, sizes, className, priority = false, decorative = false }: NftImageProps) {
  return (
    <img
      src={`${image.src}-640.webp`}
      srcSet={WIDTHS.map((width) => `${image.src}-${width}.webp ${width}w`).join(', ')}
      sizes={sizes}
      alt={decorative ? '' : image.alt}
      width={640}
      height={640}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding={priority ? 'sync' : 'async'}
      className={cn('aspect-square object-cover', className)}
    />
  )
}
