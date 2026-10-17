import { useState } from 'react'
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
  const [loaded, setLoaded] = useState(priority)
  const reveal = () => setLoaded(true)

  return (
    <img
      ref={(node) => {
        if (node?.complete && node.naturalWidth > 0) reveal()
      }}
      src={`${image.src}-640.webp`}
      srcSet={WIDTHS.map((width) => `${image.src}-${width}.webp ${width}w`).join(', ')}
      sizes={sizes}
      alt={decorative ? '' : image.alt}
      width={640}
      height={640}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding={priority ? 'sync' : 'async'}
      onLoad={reveal}
      onError={reveal}
      className={cn(
        'aspect-square bg-surface-dark object-cover transition-[opacity,scale] duration-500 ease-out',
        loaded ? 'opacity-100' : 'opacity-0',
        className,
      )}
    />
  )
}
