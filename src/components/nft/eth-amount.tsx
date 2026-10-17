import { FlashOnChange } from '@/components/flash-on-change'
import { formatEth, type Eth } from '@/lib/eth'
import { cn } from '@/lib/utils'

type EthAmountProps = {
  value: Eth
  className?: string
  maxFractionDigits?: number
  previous?: Eth | null
  previousClassName?: string
}

export function EthAmount({ value, className, maxFractionDigits = 4, previous, previousClassName }: EthAmountProps) {
  const formatted = formatEth(value, { maxFractionDigits })
  if (!previous) {
    return (
      <FlashOnChange value={value} className={className}>
        {formatted} ETH
      </FlashOnChange>
    )
  }
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-3">
      <FlashOnChange value={value} className={className}>
        <span className="sr-only">Preço atual: </span>
        {formatted} ETH
      </FlashOnChange>
      <span className={cn('font-normal text-brand-secondary', previousClassName)}>
        <span className="sr-only">Preço anterior: </span>
        {formatEth(previous, { maxFractionDigits })} ETH
      </span>
    </span>
  )
}
