import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ExternalLink, Loader2, X } from 'lucide-react'
import { NETWORK_LABELS, WALLET_TYPE_LABELS, type Order } from '@/api/contracts'
import { getErrorMessage, isApiError } from '@/api/http'
import { queryKeys } from '@/api/query-keys'
import { ThankYouIcon } from '@/components/icons'
import { NftImage } from '@/components/nft/nft-image'
import { NotFoundPage } from '@/components/not-found-page'
import { Skeleton } from '@/components/ui/skeleton'
import { pendingCheckout } from '@/features/checkout/pending-checkout'
import { formatEth } from '@/lib/eth'
import { cn } from '@/lib/utils'
import { useOrder } from './use-order'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

function formatOrderDate(value: string) {
  const parts = dateFormatter.formatToParts(new Date(value))
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((candidate) => candidate.type === type)?.value ?? ''
  return `${part('day')} ${part('month').replace('.', '')}, ${part('year')}`
}

export function OrderPage({ orderId }: { orderId: string }) {
  const query = useOrder(orderId)
  const queryClient = useQueryClient()
  const status = query.data?.status

  useEffect(() => {
    if (status === 'confirmed' || status === 'declined') {
      pendingCheckout.clear()
      queryClient.invalidateQueries({ queryKey: queryKeys.cart.all })
    }
  }, [status, queryClient])

  if (query.isError && isApiError(query.error) && query.error.code === 'NOT_FOUND') {
    return <NotFoundPage title="Pedido não encontrado" description="Este pedido não existe ou pertence a outra conta." />
  }
  if (!query.data) {
    return query.isError ? (
      <div className="page-container py-16" role="alert">
        <p className="text-lg font-bold">Não foi possível carregar o pedido.</p>
        <p className="text-sm text-text-secondary">{getErrorMessage(query.error)}</p>
        <button type="button" onClick={() => query.refetch()} className="mt-4 rounded-[6px] bg-primary px-4 py-2 font-bold text-primary-foreground">
          Tentar novamente
        </button>
      </div>
    ) : (
      <div className="page-container py-10">
        <Skeleton className="mx-auto h-[640px] max-w-[578px] rounded-[8px]" />
      </div>
    )
  }
  return <OrderReceipt order={query.data} />
}

function OrderReceipt({ order }: { order: Order }) {
  const confirmed = order.status === 'confirmed'
  const headline = confirmed ? 'Compra confirmada!' : order.status === 'declined' ? 'Pagamento recusado' : 'Aguardando confirmação'
  const subtitle = confirmed
    ? 'Seus NFTs agora estão na sua carteira'
    : order.status === 'declined'
      ? (order.failureReason ?? 'A transação não foi concluída.')
      : 'Estamos aguardando a confirmação da transação na rede. Você pode recarregar a página sem perder o pedido.'

  return (
    <div className="page-container py-6 md:py-10">
      <article
        aria-labelledby="pedido-titulo"
        className="relative mx-auto max-w-[578px] animate-rise-in overflow-hidden rounded-[8px] border-b-[10px] border-primary bg-card"
      >
        <Link
          to="/"
          hash="catalogo"
          aria-label="Fechar e continuar explorando"
          className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-text-accent transition-colors hover:bg-primary/15"
        >
          <X className="size-4" aria-hidden="true" />
        </Link>

        <header className="flex flex-col items-center gap-3 px-6 pt-7 pb-5 text-center">
          <StatusIcon status={order.status} />
          <h1 id="pedido-titulo" className={confirmed ? 'sr-only' : 'text-xl font-bold'}>
            {headline}
          </h1>
          <p className={cn('leading-6', confirmed ? 'text-base font-bold text-text-accent' : 'text-sm text-text-secondary')} role="status" aria-live="polite">
            {subtitle}
          </p>
        </header>

        <dl className="grid grid-cols-2 gap-y-3 border-y border-primary/70 px-4 py-3 text-xs sm:grid-cols-4 sm:divide-x sm:divide-primary/70">
          <Meta label="ID da transação" value={order.transaction ? `${order.transaction.hash.slice(0, 6)}…${order.transaction.hash.slice(-4)}` : order.id} />
          <Meta label="Data" value={formatOrderDate(order.createdAt)} />
          <Meta label="Total" value={`${formatEth(order.totalEth, { maxFractionDigits: 6 })} ETH`} />
          <Meta label="Carteira" value={WALLET_TYPE_LABELS[order.wallet.type]} />
        </dl>

        <section aria-labelledby="detalhes-transacao" className="px-6 pt-5 pb-7 sm:px-10">
          <h2 id="detalhes-transacao" className="text-sm font-bold">
            Detalhes da transação
          </h2>
          <table className="mt-2 w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs">
                <th scope="col" className="pb-2 font-bold">
                  NFTs
                </th>
                <th scope="col" className="pb-2 text-center font-bold">
                  Edições
                </th>
                <th scope="col" className="pb-2 text-right font-bold">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={`${item.nftId}-${item.editionId}`}>
                  <td className="py-2.5">
                    <span className="flex items-center gap-3">
                      <NftImage image={item.image} sizes="48px" decorative className="size-12 shrink-0 rounded-[6px]" />
                      <span className="min-w-0">
                        <span className="block truncate font-bold">{item.name}</span>
                        <span className="block text-xs text-text-secondary">ID do token: {item.tokenId}</span>
                      </span>
                    </span>
                  </td>
                  <td className="py-2.5 text-center text-xs text-text-secondary">(x {item.quantity})</td>
                  <td className="py-2.5 text-right font-bold whitespace-nowrap text-text-accent">{formatEth(item.lineTotalEth)} ETH</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="mt-2 ml-auto flex max-w-[240px] flex-col gap-1.5 text-sm">
            {order.discountEth !== '0' && <Line label={`Desconto${order.coupon ? ` (${order.coupon})` : ''}`} value={order.discountEth} negative />}
            <Line label="Taxa de rede" value={order.networkFeeEth} />
            <div className="flex justify-between font-bold">
              <dt>Total</dt>
              <dd className="text-text-accent">{formatEth(order.totalEth, { maxFractionDigits: 6 })} ETH</dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-col items-center gap-4 border-t border-border pt-5 text-center">
            {confirmed && order.transaction && (
              <>
                <p className="max-w-[360px] text-xs leading-5 text-text-secondary">
                  Transação confirmada na {NETWORK_LABELS[order.network]}. A propriedade foi transferida para a carteira{' '}
                  <span className="font-bold text-foreground">
                    {order.wallet.address.slice(0, 6)}…{order.wallet.address.slice(-4)}
                  </span>{' '}
                  e registrada na rede.
                </p>
                <a
                  href={order.transaction.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-2 rounded-[5px] bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/85"
                >
                  Ver no Etherscan <ExternalLink className="size-4" aria-hidden="true" />
                  <span className="sr-only">(link simulado, abre em nova aba)</span>
                </a>
              </>
            )}
            {order.status === 'declined' && (
              <Link to="/carrinho" className="inline-flex h-9 items-center rounded-[5px] bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/85">
                Voltar ao carrinho
              </Link>
            )}
            {order.status === 'pending' && (
              <p className="text-xs leading-5 text-text-secondary">Assim que a rede confirmar, esta página é atualizada automaticamente.</p>
            )}
          </div>
        </section>
      </article>
    </div>
  )
}

function StatusIcon({ status }: { status: Order['status'] }) {
  if (status === 'confirmed') {
    return <ThankYouIcon key={status} className="size-[72px] animate-status-pop text-text-accent" />
  }
  return (
    <span key={status} className="relative grid size-16 place-items-center" aria-hidden="true">
      {status === 'pending' ? (
        <span className="absolute inset-0 animate-pulse rounded-full bg-primary/15" />
      ) : (
        <span className="absolute inset-0 animate-ring-out rounded-full border-2 border-destructive" />
      )}
      <span
        className={cn(
          'relative grid size-16 place-items-center rounded-full',
          status === 'pending' ? 'bg-surface-dark text-text-accent' : 'animate-status-pop bg-destructive/20 text-destructive',
        )}
      >
        {status === 'pending' ? <Loader2 className="size-8 animate-spin" /> : <X className="size-8" />}
      </span>
    </span>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-3">
      <dt className="text-text-secondary">{label}</dt>
      <dd className="truncate font-bold">{value}</dd>
    </div>
  )
}

function Line({ label, value, negative = false }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-text-secondary">{label}</dt>
      <dd>
        {negative ? '(-) ' : ''}
        {formatEth(value, { maxFractionDigits: 6 })} ETH
      </dd>
    </div>
  )
}
