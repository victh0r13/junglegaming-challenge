import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Check, ExternalLink, Loader2, X } from 'lucide-react'
import { NETWORK_LABELS, WALLET_TYPE_LABELS, type Order } from '@/api/contracts'
import { getErrorMessage, isApiError } from '@/api/http'
import { queryKeys } from '@/api/query-keys'
import { NotFoundPage } from '@/components/not-found-page'
import { Skeleton } from '@/components/ui/skeleton'
import { pendingCheckout } from '@/features/checkout/pending-checkout'
import { formatEth } from '@/lib/eth'
import { cn } from '@/lib/utils'
import { useOrder } from './use-order'

const dateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })

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
  const headline =
    order.status === 'confirmed' ? 'Compra confirmada!' : order.status === 'declined' ? 'Pagamento recusado' : 'Aguardando confirmação'
  const subtitle =
    order.status === 'confirmed'
      ? 'Seus NFTs agora estão na sua carteira'
      : order.status === 'declined'
        ? (order.failureReason ?? 'A transação não foi concluída.')
        : 'Estamos aguardando a confirmação da transação na rede. Você pode recarregar a página sem perder o pedido.'

  return (
    <div className="page-container py-6 md:py-10">
      <article
        aria-labelledby="pedido-titulo"
        className="mx-auto max-w-[578px] animate-rise-in overflow-hidden rounded-[8px] border-b-[10px] border-primary bg-card"
      >
        <header className="flex flex-col items-center gap-4 px-6 pt-6 pb-8 text-center">
          <span key={order.status} className="relative grid size-20 place-items-center" aria-hidden="true">
            {order.status === 'pending' ? (
              <span className="absolute inset-0 animate-pulse rounded-full bg-primary/15" />
            ) : (
              <span
                className={cn(
                  'absolute inset-0 animate-ring-out rounded-full border-2',
                  order.status === 'confirmed' ? 'border-primary' : 'border-destructive',
                )}
              />
            )}
            <span
              className={cn(
                'relative grid size-20 place-items-center rounded-full',
                order.status !== 'pending' && 'animate-status-pop',
                order.status === 'confirmed'
                  ? 'bg-primary text-primary-foreground'
                  : order.status === 'declined'
                    ? 'bg-destructive/20 text-destructive'
                    : 'bg-surface-dark text-text-accent',
              )}
            >
              {order.status === 'confirmed' ? <Check className="size-10" /> : order.status === 'declined' ? <X className="size-10" /> : <Loader2 className="size-10 animate-spin" />}
            </span>
          </span>
          <h1 id="pedido-titulo" className="text-2xl font-bold">
            {headline}
          </h1>
          <p className="text-sm leading-6 text-text-secondary" role="status" aria-live="polite">
            {subtitle}
          </p>
        </header>

        <dl className="grid grid-cols-2 gap-4 border-y border-border px-9 py-3 text-sm sm:grid-cols-4">
          <Meta label="ID da transação" value={order.transaction ? `${order.transaction.hash.slice(0, 6)}…${order.transaction.hash.slice(-4)}` : order.id} />
          <Meta label="Data" value={dateFormatter.format(new Date(order.createdAt))} />
          <Meta label="Total" value={`${formatEth(order.totalEth, { maxFractionDigits: 6 })} ETH`} />
          <Meta label="Carteira" value={WALLET_TYPE_LABELS[order.wallet.type]} />
        </dl>

        <section aria-labelledby="detalhes-transacao" className="px-9 py-6">
          <h2 id="detalhes-transacao" className="text-lg font-bold">
            Detalhes da transação
          </h2>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th scope="col" className="pb-2 font-bold">
                  NFTs
                </th>
                <th scope="col" className="pb-2 font-bold">
                  Edições
                </th>
                <th scope="col" className="pb-2 text-right font-bold">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={`${item.nftId}-${item.editionId}`} className="border-b border-border/60">
                  <td className="py-3">
                    <span className="block font-bold">{item.name}</span>
                    <span className="text-xs text-text-secondary">
                      ID do token: {item.tokenId} · {item.editionLabel}
                    </span>
                  </td>
                  <td className="py-3 text-text-secondary">(x {item.quantity})</td>
                  <td className="py-3 text-right font-bold text-text-accent">{formatEth(item.lineTotalEth)} ETH</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="mt-4 flex flex-col gap-2 text-sm">
            <Line label="Subtotal" value={order.subtotalEth} />
            {order.discountEth !== '0' && <Line label={`Desconto${order.coupon ? ` (${order.coupon})` : ''}`} value={order.discountEth} negative />}
            <Line label="Taxa de rede" value={order.networkFeeEth} />
            <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
              <dt>Total</dt>
              <dd className="text-text-accent">{formatEth(order.totalEth, { maxFractionDigits: 6 })} ETH</dd>
            </div>
          </dl>

          {order.status === 'confirmed' && order.transaction && (
            <div className="mt-6 flex flex-col gap-4 rounded-[6px] bg-surface-dark p-4 text-sm leading-6">
              <p>
                Transação confirmada na {NETWORK_LABELS[order.network]}. A propriedade foi transferida para a carteira{' '}
                <span className="font-bold">
                  {order.wallet.address.slice(0, 6)}…{order.wallet.address.slice(-4)}
                </span>
                . Referência simulada: <code className="text-xs break-all">{order.transaction.hash}</code>
              </p>
              <a
                href={order.transaction.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-fit items-center gap-2 rounded-[5px] border border-primary px-4 py-2 font-bold text-text-accent hover:bg-primary/10"
              >
                Ver no Etherscan <ExternalLink className="size-4" aria-hidden="true" />
                <span className="sr-only">(link simulado, abre em nova aba)</span>
              </a>
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            {order.status === 'declined' ? (
              <Link to="/carrinho" className="rounded-[6px] bg-primary px-4 py-2 font-bold text-primary-foreground">
                Voltar ao carrinho
              </Link>
            ) : (
              <Link to="/" hash="catalogo" className="rounded-[6px] bg-primary px-4 py-2 font-bold text-primary-foreground">
                Continuar explorando
              </Link>
            )}
            <Link to="/perfil" className="rounded-[6px] border border-border-soft px-4 py-2">
              Ir para o perfil
            </Link>
          </div>
        </section>
      </article>
    </div>
  )
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-text-secondary">{label}</dt>
      <dd className="truncate font-bold">{value}</dd>
    </div>
  )
}

function Line({ label, value, negative = false }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt>{label}</dt>
      <dd>
        {negative ? '(-) ' : ''}
        {formatEth(value, { maxFractionDigits: 6 })} ETH
      </dd>
    </div>
  )
}
