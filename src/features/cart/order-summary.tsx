import type { ReactNode } from 'react'
import type { Quote } from '@/api/contracts'
import { Skeleton } from '@/components/ui/skeleton'
import { formatEth } from '@/lib/eth'
import { cn } from '@/lib/utils'

type OrderSummaryProps = {
  quote: Pick<Quote, 'subtotalEth' | 'discountEth' | 'networkFeeEth' | 'totalEth' | 'coupon'> | undefined
  loading?: boolean
  updating?: boolean
  className?: string
  feeHint?: string
}

const money = (value: string) => `${formatEth(value, { maxFractionDigits: 6 })} ETH`

export function OrderSummary({ quote, loading, updating, className, feeHint = 'Taxa estimada' }: OrderSummaryProps) {
  if (loading || !quote) {
    return (
      <div className={cn('flex flex-col gap-3', className)} aria-busy="true" aria-label="Calculando resumo">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    )
  }

  const discount = quote.discountEth === '0' ? '(-) 00.00' : `(-) ${money(quote.discountEth)}`

  return (
    <div className={cn('flex flex-col gap-3 transition-opacity', updating && 'opacity-60', className)} aria-busy={updating}>
      <dl className="flex flex-col gap-3 text-sm">
        <Row label="Subtotal" value={money(quote.subtotalEth)} />
        <Row label={quote.coupon ? `Desconto (${quote.coupon})` : 'Desconto do lançamento'} value={discount} />
        <div>
          <Row label="Taxa de rede" value={money(quote.networkFeeEth)} />
          <p className="mt-1 text-right text-[11px] text-text-accent">{feeHint}</p>
        </div>
      </dl>
      <div className="flex items-center justify-between border-t border-border pt-4">
        <span className="text-base font-bold">Total</span>
        <span className="text-lg font-bold text-text-accent" aria-live="polite">
          {money(quote.totalEth)}
        </span>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: ReactNode; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt>{label}</dt>
      <dd className="text-base tabular-nums">{value}</dd>
    </div>
  )
}
