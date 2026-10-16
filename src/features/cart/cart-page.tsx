import { useId, useState, type FormEvent } from 'react'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'
import { AlertTriangle, ArrowLeft, Minus, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import type { CartItem } from '@/api/contracts'
import { getErrorMessage, isApiError } from '@/api/http'
import { EthAmount } from '@/components/nft/eth-amount'
import { NftImage } from '@/components/nft/nft-image'
import { Skeleton } from '@/components/ui/skeleton'
import { NftRail } from '@/features/nft/related-nfts'
import { multiplyEth } from '@/lib/eth'
import { cn } from '@/lib/utils'
import { OrderSummary } from './order-summary'
import {
  useAcknowledgeCart,
  useApplyCoupon,
  useCart,
  useQuote,
  useRemoveCartItem,
  useRemoveCoupon,
  useUpdateCartItem,
} from './use-cart'

export function CartPage() {
  const cart = useCart()
  const quote = useQuote('ethereum')
  const navigate = useNavigate()
  const router = useRouter()
  const acknowledge = useAcknowledgeCart()

  const items = cart.data?.items ?? []
  const changed = items.filter((item) => item.status === 'price_changed')
  const blocked = items.filter((item) => item.status === 'sold_out' || item.status === 'insufficient')
  const canCheckout = items.length > 0 && changed.length === 0 && blocked.length === 0 && quote.isSuccess

  return (
    <div className="page-container pt-6 md:pt-6">
      <div className="flex items-center gap-3 md:hidden">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? router.history.back() : navigate({ to: '/' }))}
          aria-label="Voltar"
          className="grid size-[35px] place-items-center rounded-full bg-card"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <h1 className="flex-1 pr-[35px] text-center text-lg font-bold">Carrinho de NFTs</h1>
      </div>
      <nav aria-label="Trilha de navegação" className="hidden md:block">
        <ol className="flex gap-2 text-sm font-bold">
          <li>
            <Link to="/" className="hover:text-text-accent">
              Início
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to="/" hash="catalogo" className="hover:text-text-accent">
              Mercado
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">Carrinho</li>
        </ol>
      </nav>
      <h1 className="sr-only max-md:hidden">Carrinho de NFTs</h1>

      <div className="mt-4 flex flex-col gap-10 lg:flex-row lg:gap-20">
        <section className="min-w-0 flex-1" aria-label="Itens do carrinho">
          {(changed.length > 0 || blocked.length > 0) && (
            <div role="alert" className="mb-4 flex flex-col gap-2 rounded-[6px] border border-primary/60 bg-surface-dark p-4 text-sm">
              <p className="flex items-center gap-2 font-bold">
                <AlertTriangle className="size-4 text-text-accent" aria-hidden="true" />
                Alguns itens mudaram desde que você os adicionou
              </p>
              <ul className="ml-6 list-disc text-text-secondary">
                {changed.map((item) => (
                  <li key={item.id}>
                    {item.name} ({item.editionLabel}): de {item.acknowledgedPriceEth} ETH para {item.unitPriceEth} ETH
                  </li>
                ))}
                {blocked.map((item) => (
                  <li key={item.id}>
                    {item.status === 'sold_out'
                      ? `${item.name} (${item.editionLabel}) esgotou. Remova o item para continuar.`
                      : `${item.name} (${item.editionLabel}): restam ${item.available} unidade(s). Ajuste a quantidade.`}
                  </li>
                ))}
              </ul>
              {changed.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    acknowledge.mutate(undefined, {
                      onSuccess: () => toast.success('Preços atualizados no carrinho'),
                      onError: (error) => toast.error(getErrorMessage(error)),
                    })
                  }
                  disabled={acknowledge.isPending}
                  className="self-start rounded-[5px] bg-primary px-3 py-1.5 font-bold text-primary-foreground disabled:opacity-60"
                >
                  Aceitar novos preços
                </button>
              )}
            </div>
          )}

          <div className="hidden grid-cols-[minmax(0,1fr)_110px_120px_110px_40px] gap-4 border-b border-border pb-2 text-sm font-bold md:grid" aria-hidden="true">
            <span>NFTs</span>
            <span>Preço</span>
            <span>Edições</span>
            <span>Total</span>
            <span />
          </div>

          {cart.isPending ? (
            <ul className="mt-3 flex flex-col gap-3" aria-busy="true" aria-label="Carregando carrinho">
              {Array.from({ length: 3 }, (_, index) => (
                <li key={index}>
                  <Skeleton className="h-[100px] w-full rounded-[10px] md:h-16 md:rounded-none" />
                </li>
              ))}
            </ul>
          ) : cart.isError ? (
            <div role="alert" className="mt-4 rounded-[6px] bg-card p-6 text-sm">
              <p className="font-bold">Não foi possível carregar o carrinho.</p>
              <p className="mt-1 text-text-secondary">{getErrorMessage(cart.error)}</p>
              <button type="button" onClick={() => cart.refetch()} className="mt-3 rounded-[5px] bg-primary px-3 py-1.5 font-bold text-primary-foreground">
                Tentar novamente
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="mt-6 flex flex-col items-start gap-3 rounded-[6px] bg-card p-8">
              <p className="text-lg font-bold">Seu carrinho está vazio</p>
              <p className="text-sm text-text-secondary">Explore o mercado e adicione os NFTs que você quer colecionar.</p>
              <Link to="/" hash="catalogo" className="rounded-[6px] bg-primary px-4 py-2 font-bold text-primary-foreground">
                Explorar NFTs
              </Link>
            </div>
          ) : (
            <ul className="mt-3 flex flex-col gap-3">
              {items.map((item) => (
                <CartLine key={item.id} item={item} />
              ))}
            </ul>
          )}
        </section>

        <aside aria-labelledby="resumo-titulo" className="w-full shrink-0 rounded-t-[30px] bg-card p-6 md:rounded-none md:bg-transparent md:p-0 lg:w-[303px]">
          <h2 id="resumo-titulo" className="hidden border-b border-border pb-2 text-lg font-bold md:block">
            Resumo da carteira
          </h2>
          <CouponForm coupon={cart.data?.coupon ?? null} disabled={items.length === 0} />
          <OrderSummary
            className="mt-5"
            quote={items.length === 0 ? { subtotalEth: '0', discountEth: '0', networkFeeEth: '0', totalEth: '0', coupon: null } : quote.data}
            loading={items.length > 0 && quote.isPending}
            updating={quote.isFetching && !quote.isPending}
          />
          {quote.isError && items.length > 0 && (
            <p role="alert" className="mt-3 text-xs text-destructive">
              Não foi possível calcular o total. {getErrorMessage(quote.error)}{' '}
              <button type="button" className="underline" onClick={() => quote.refetch()}>
                Recalcular
              </button>
            </p>
          )}
          <button
            type="button"
            onClick={() => navigate({ to: '/pagamento' })}
            disabled={!canCheckout}
            aria-describedby={!canCheckout && items.length > 0 ? 'checkout-bloqueado' : undefined}
            className="mt-6 h-[60px] w-full rounded-[10px] bg-primary text-base font-bold text-primary-foreground transition-colors hover:bg-primary/85 disabled:opacity-50 md:h-[37px] md:rounded-[4px] md:text-sm"
          >
            Conectar e finalizar
          </button>
          {!canCheckout && items.length > 0 && (changed.length > 0 || blocked.length > 0) && (
            <p id="checkout-bloqueado" className="mt-2 text-center text-xs text-text-secondary">
              Revise os itens destacados para continuar.
            </p>
          )}
          <Link to="/" hash="catalogo" className="mt-4 block text-center text-sm text-text-accent hover:underline">
            Continuar explorando
          </Link>
        </aside>
      </div>

      <NftRail title="Colecionadores também viram" params={{ aba: 'alta' }} />
    </div>
  )
}

function CartLine({ item }: { item: CartItem }) {
  const update = useUpdateCartItem()
  const remove = useRemoveCartItem()
  const pending = update.isPending || remove.isPending
  const lineTotal = multiplyEth(item.unitPriceEth, item.quantity)
  const flagged = item.status !== 'ok'

  function changeQuantity(quantity: number) {
    update.mutate(
      { itemId: item.id, quantity },
      { onError: (error) => toast.error('Não foi possível alterar a quantidade', { description: getErrorMessage(error) }) },
    )
  }

  function removeItem() {
    remove.mutate(item.id, {
      onSuccess: () => toast.success(`${item.name} removido do carrinho`),
      onError: (error) => toast.error('Não foi possível remover o item', { description: getErrorMessage(error) }),
    })
  }

  const statusText =
    item.status === 'price_changed'
      ? 'Preço alterado'
      : item.status === 'sold_out'
        ? 'Esgotado'
        : item.status === 'insufficient'
          ? `Restam ${item.available}`
          : null

  return (
    <li
      aria-busy={pending}
      className={cn(
        'relative grid grid-cols-[100px_minmax(0,1fr)] gap-x-4 gap-y-2 rounded-[10px] bg-card p-0 pr-3 md:grid-cols-[64px_minmax(0,1fr)_110px_120px_110px_40px] md:items-center md:rounded-none md:pr-0',
        flagged && 'outline outline-primary/60',
        pending && 'opacity-70',
      )}
    >
      <Link to="/nft/$nftId" params={{ nftId: item.nftId }} tabIndex={-1} aria-hidden="true" className="row-span-3 md:row-span-1">
        <NftImage image={item.image} sizes="100px" decorative className="size-[100px] rounded-[10px] md:size-16 md:rounded-none" />
      </Link>
      <div className="min-w-0 pt-3 md:pt-0">
        <h3 className="truncate text-base font-bold md:text-sm">
          <Link to="/nft/$nftId" params={{ nftId: item.nftId }} className="hover:text-text-accent">
            {item.name}
          </Link>
        </h3>
        <p className="text-sm text-text-secondary md:text-xs">
          <span className="md:hidden">Edição: {item.editionLabel}</span>
          <span className="max-md:hidden">
            ID do token: {item.tokenId} · {item.editionLabel}
          </span>
        </p>
        {statusText && (
          <p className="mt-1 inline-flex items-center gap-1 rounded-sm bg-primary/15 px-1.5 text-[11px] font-bold text-text-accent">
            <AlertTriangle className="size-3" aria-hidden="true" />
            {statusText}
          </p>
        )}
      </div>
      <p className="text-sm font-bold text-text-accent md:text-sm">
        <span className="sr-only">Preço unitário: </span>
        <EthAmount value={item.unitPriceEth} maxFractionDigits={4} />
      </p>
      <div className="flex items-center justify-between gap-2 pb-3 md:pb-0">
        <div className="flex items-center gap-3" role="group" aria-label={`Quantidade de ${item.name}`}>
          <button
            type="button"
            onClick={() => changeQuantity(item.quantity - 1)}
            disabled={pending || item.quantity <= 1}
            aria-label="Diminuir quantidade"
            className="grid h-6 w-5 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
          >
            <Minus className="size-3" aria-hidden="true" />
          </button>
          <output aria-live="polite" className="min-w-4 text-center">
            {item.quantity}
          </output>
          <button
            type="button"
            onClick={() => changeQuantity(item.quantity + 1)}
            disabled={pending || item.quantity >= item.maxQuantity}
            aria-label="Aumentar quantidade"
            className="grid h-6 w-5 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-40"
          >
            <Plus className="size-3" aria-hidden="true" />
          </button>
        </div>
        <button type="button" onClick={removeItem} disabled={pending} aria-label={`Remover ${item.name}`} className="text-text-secondary hover:text-destructive md:hidden">
          <Trash2 className="size-5" aria-hidden="true" />
        </button>
      </div>
      <p className="hidden text-sm font-bold text-text-accent md:block">
        <span className="sr-only">Total do item: </span>
        <EthAmount value={lineTotal} />
      </p>
      <button
        type="button"
        onClick={removeItem}
        disabled={pending}
        aria-label={`Remover ${item.name}`}
        className="hidden size-8 place-items-center text-text-secondary hover:text-destructive md:grid"
      >
        <Trash2 className="size-5" aria-hidden="true" />
      </button>
    </li>
  )
}

function CouponForm({ coupon, disabled }: { coupon: { code: string; percentOff: number } | null; disabled: boolean }) {
  const apply = useApplyCoupon()
  const remove = useRemoveCoupon()
  const [code, setCode] = useState('')
  const inputId = useId()
  const errorId = useId()
  const error = apply.error ? (isApiError(apply.error) ? (apply.error.fields.code ?? apply.error.message) : getErrorMessage(apply.error)) : null

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!code.trim()) return
    apply.mutate(code.trim(), {
      onSuccess: (cart) => {
        setCode('')
        toast.success(`Cupom ${cart.coupon?.code} aplicado: ${cart.coupon?.percentOff}% de desconto`)
      },
    })
  }

  if (coupon) {
    return (
      <div className="mt-5 flex items-center justify-between gap-3 rounded-[5px] border border-primary/60 bg-surface-dark px-3 py-2 text-sm">
        <span>
          Cupom <strong className="text-text-accent">{coupon.code}</strong> · {coupon.percentOff}% off
        </span>
        <button
          type="button"
          onClick={() => remove.mutate(undefined, { onSuccess: () => toast.success('Cupom removido'), onError: (e) => toast.error(getErrorMessage(e)) })}
          disabled={remove.isPending}
          aria-label={`Remover cupom ${coupon.code}`}
          className="text-text-secondary hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mt-5 flex flex-col gap-2" noValidate>
      <label htmlFor={inputId} className="text-sm font-bold max-md:sr-only">
        Código promocional
      </label>
      <div className="flex h-[50px] overflow-hidden rounded-[10px] border border-border md:h-9 md:rounded-[4px] md:border-primary">
        <input
          id={inputId}
          value={code}
          onChange={(event) => {
            setCode(event.target.value)
            if (apply.isError) apply.reset()
          }}
          placeholder="Digite o código promocional..."
          disabled={disabled}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-w-0 flex-1 bg-transparent px-3 text-sm uppercase placeholder:normal-case placeholder:text-brand-secondary focus-visible:outline-2 focus-visible:outline-offset-[-2px] disabled:opacity-60 md:text-xs"
        />
        <button
          type="submit"
          disabled={disabled || apply.isPending || !code.trim()}
          className="w-[97px] shrink-0 bg-primary text-base font-bold text-primary-foreground disabled:opacity-60 md:w-[92px] md:text-sm"
        >
          {apply.isPending ? '...' : 'Aplicar'}
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </form>
  )
}
