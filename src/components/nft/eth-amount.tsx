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
  if (!previous) return <span className={className}>{formatted} ETH</span>
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-3">
      <span className={className}>
        <span className="sr-only">Preço atual: </span>
        {formatted} ETH
      </span>
      <span className={cn('font-normal text-brand-secondary', previousClassName)}>
        <span className="sr-only">Preço anterior: </span>
        {formatEth(previous, { maxFractionDigits })} ETH
      </span>
    </span>
  )
}
