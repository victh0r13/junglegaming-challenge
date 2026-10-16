import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, CheckCircle2, Loader2, PlugZap, Unplug } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'
import { NETWORK_LABELS, NETWORKS, WALLET_TYPE_LABELS, type Network, type Quote, type Wallet } from '@/api/contracts'
import { getErrorMessage, isApiError } from '@/api/http'
import { queryKeys } from '@/api/query-keys'
import { collectorSchema } from '@/api/schemas'
import { walletsApi } from '@/api/wallets'
import { FormAlert, TextField, fieldInputClass } from '@/components/form/text-field'
import { NftImage } from '@/components/nft/nft-image'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { useProfile, useWallets } from '@/features/account/use-account'
import { useCurrentUser } from '@/features/auth/use-auth'
import { OrderSummary } from '@/features/cart/order-summary'
import { useCart, useQuote } from '@/features/cart/use-cart'
import { usePlaceOrder, useRecoverPendingOrder } from '@/features/orders/use-order'
import { formatEth } from '@/lib/eth'
import { applyApiFieldErrors } from '@/lib/form-errors'
import { cn } from '@/lib/utils'
import { checkoutDraft, pendingCheckout } from './pending-checkout'

const checkoutFormSchema = collectorSchema.extend({
  network: z.enum(NETWORKS, 'Selecione uma rede.'),
  useSecondary: z.boolean(),
})
type CheckoutForm = z.input<typeof checkoutFormSchema>
type CheckoutValues = z.output<typeof checkoutFormSchema>

function quoteSignature(quote: Quote) {
  return [quote.network, quote.coupon, quote.totalEth, ...quote.items.map((item) => `${item.itemId}:${item.quantity}:${item.unitPriceEth}`)].join('|')
}

export function CheckoutPage() {
  const { userId } = useCurrentUser()
  const profile = useProfile()
  const wallets = useWallets()
  const navigate = useNavigate()
  const recover = useRecoverPendingOrder()
  const recoveryStarted = useRef(false)

  useEffect(() => {
    if (!userId || recoveryStarted.current) return
    const pending = pendingCheckout.get(userId)
    if (!pending) return
    recoveryStarted.current = true
    if (pending.orderId) {
      navigate({ to: '/pedidos/$pedidoId', params: { pedidoId: pending.orderId }, replace: true })
      return
    }
    recover.mutate(pending, {
      onSuccess: (order) => {
        pendingCheckout.save({ ...pending, orderId: order.id })
        toast.info('Recuperamos seu pedido em andamento')
        navigate({ to: '/pedidos/$pedidoId', params: { pedidoId: order.id }, replace: true })
      },
      onError: (error) => {
        pendingCheckout.clear()
        toast.error('Não foi possível retomar a tentativa anterior', { description: getErrorMessage(error) })
      },
    })
  }, [userId, navigate, recover])

  if (recover.isPending) {
    return (
      <div className="page-container flex items-center gap-3 py-24" role="status">
        <Loader2 className="size-5 animate-spin text-text-accent" aria-hidden="true" />
        Verificando sua compra em andamento…
      </div>
    )
  }

  if (profile.isPending || wallets.isPending || !userId) return <CheckoutSkeleton />

  if (profile.isError || wallets.isError) {
    return (
      <div className="page-container py-16" role="alert">
        <p className="text-lg font-bold">Não foi possível carregar seus dados.</p>
        <p className="mt-1 text-sm text-text-secondary">{getErrorMessage(profile.error ?? wallets.error)}</p>
        <button type="button" onClick={() => (profile.refetch(), wallets.refetch())} className="mt-4 rounded-[6px] bg-primary px-4 py-2 font-bold text-primary-foreground">
          Tentar novamente
        </button>
      </div>
    )
  }

  if (wallets.data.length === 0) {
    return (
      <div className="page-container py-16">
        <h1 className="text-2xl font-bold">Cadastre uma carteira para continuar</h1>
        <p className="mt-2 text-sm text-text-secondary">O pagamento usa as carteiras cadastradas na sua conta.</p>
        <Link to="/carteiras" className="mt-4 inline-block rounded-[6px] bg-primary px-4 py-2 font-bold text-primary-foreground">
          Cadastrar carteira
        </Link>
      </div>
    )
  }

  return <CheckoutForm userId={userId} wallets={wallets.data} defaults={profile.data} />
}

type CheckoutFormProps = {
  userId: string
  wallets: Wallet[]
  defaults: { displayName: string; username: string; email: string; ensName: string }
}

function CheckoutForm({ userId, wallets, defaults }: CheckoutFormProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const primary = wallets.find((wallet) => wallet.role === 'primary') ?? wallets[0]
  const secondary = wallets.find((wallet) => wallet.role === 'secondary')

  const form = useForm<CheckoutForm, unknown, CheckoutValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: checkoutDraft.get<CheckoutForm>(userId) ?? {
      displayName: primary.displayName || defaults.displayName,
      username: defaults.username,
      profileName: primary.profileName,
      email: primary.email || defaults.email,
      ensName: primary.ensName || defaults.ensName,
      referralCode: primary.referralCode,
      note: '',
      network: primary.network,
      useSecondary: false,
    },
  })
  const values = useWatch({ control: form.control })
  const useSecondary = Boolean(values.useSecondary && secondary)
  const wallet = useSecondary && secondary ? secondary : primary
  const network = (values.network ?? wallet.network) as Network

  useEffect(() => {
    checkoutDraft.save(userId, values)
  }, [userId, values])

  const cart = useCart()
  const quote = useQuote(network)
  const placeOrder = usePlaceOrder()
  const [connectedId, setConnectedId] = useState<string | null>(null)
  const [review, setReview] = useState<{ quote: Quote; key: string; values: CheckoutValues } | null>(null)
  const [conflict, setConflict] = useState<string | null>(null)

  const connect = useMutation({
    mutationFn: (id: string) => walletsApi.connect(id),
    onSuccess: (result) => {
      setConnectedId(result.walletId)
      toast.success(`${WALLET_TYPE_LABELS[wallet.type]} conectada`)
    },
    onError: (error) => toast.error('Conexão recusada', { description: getErrorMessage(error) }),
  })
  const disconnect = useMutation({
    mutationFn: (id: string) => walletsApi.disconnect(id),
    onSettled: () => {
      setConnectedId(null)
      toast.info('Carteira desconectada')
    },
  })

  const isConnected = connectedId === wallet.id
  const items = cart.data?.items ?? []
  const currentQuote = quote.data
  const reviewOutdated = review && currentQuote && quoteSignature(review.quote) !== quoteSignature(currentQuote)
  const blockingIssues = currentQuote?.issues ?? []

  useEffect(() => {
    if (cart.isSuccess && items.length === 0 && !placeOrder.isPending && !placeOrder.isSuccess) {
      toast.info('Seu carrinho está vazio')
      navigate({ to: '/carrinho', replace: true })
    }
  }, [cart.isSuccess, items.length, navigate, placeOrder.isPending, placeOrder.isSuccess])

  const openReview = form.handleSubmit((submitted) => {
    setConflict(null)
    if (!isConnected) {
      toast.error('Conecte a carteira selecionada antes de revisar o pedido.')
      document.getElementById('carteira-e-rede')?.focus()
      return
    }
    if (!currentQuote || blockingIssues.length > 0) {
      toast.error('Revise os itens do carrinho antes de continuar.')
      return
    }
    setReview({ quote: currentQuote, key: crypto.randomUUID(), values: submitted })
  })

  function refreshReview() {
    if (!review || !currentQuote) return
    setConflict(null)
    setReview({ ...review, quote: currentQuote, key: crypto.randomUUID() })
  }

  function confirm() {
    if (!review || reviewOutdated) return
    const { network: selectedNetwork, useSecondary: _secondary, ...collector } = review.values
    placeOrder.mutate(
      { body: { quoteId: review.quote.id, walletId: wallet.id, network: selectedNetwork, collector }, idempotencyKey: review.key },
      {
        onSuccess: (order) => {
          checkoutDraft.clear()
          navigate({ to: '/pedidos/$pedidoId', params: { pedidoId: order.id } })
        },
        onError: async (error) => {
          if (isApiError(error) && (error.code === 'QUOTE_OUTDATED' || error.code === 'AVAILABILITY_CONFLICT')) {
            pendingCheckout.clear()
            setConflict(error.message)
            await queryClient.invalidateQueries({ queryKey: queryKeys.cart.all })
            if (error.code === 'AVAILABILITY_CONFLICT') {
              setReview(null)
              toast.error('Disponibilidade alterada', { description: error.message })
            }
            return
          }
          if (isApiError(error) && error.code === 'FORBIDDEN') {
            setConnectedId(null)
          }
          if (isApiError(error) && Object.keys(error.fields).length > 0) {
            setReview(null)
            applyApiFieldErrors(error, form.setError, {
              'collector.displayName': 'displayName',
              'collector.username': 'username',
              'collector.profileName': 'profileName',
              'collector.email': 'email',
              'collector.ensName': 'ensName',
              'collector.referralCode': 'referralCode',
              'collector.note': 'note',
            })
            return
          }
          if (!(isApiError(error) && error.isTransient)) pendingCheckout.clear()
          toast.error('Não foi possível concluir a compra', { description: getErrorMessage(error) })
        },
      },
    )
  }

  const { errors } = form.formState
  const register = form.register

  return (
    <div className="page-container pt-6">
      <nav aria-label="Trilha de navegação" className="hidden md:block">
        <ol className="flex gap-2 text-sm font-bold">
          <li>
            <Link to="/">Início</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link to="/carrinho">Mercado</Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">Pagamento</li>
        </ol>
      </nav>
      <h1 className="sr-only">Pagamento</h1>

      <form noValidate onSubmit={openReview} className="mt-6 flex flex-col gap-10 lg:flex-row lg:gap-8">
        <section aria-labelledby="perfil-titulo" className="min-w-0 flex-1">
          <h2 id="perfil-titulo" className="text-lg font-bold">
            Perfil do colecionador
          </h2>
          <div className="mt-4 grid gap-x-6 gap-y-5 md:grid-cols-2">
            <TextField label="Nome de exibição" required error={errors.displayName?.message} autoComplete="name" {...register('displayName')} />
            <TextField label="Nome de usuário" required error={errors.username?.message} autoComplete="username" {...register('username')} />
            <SelectField label="Rede" required error={errors.network?.message} {...register('network')}>
              {NETWORKS.map((option) => (
                <option key={option} value={option}>
                  {NETWORK_LABELS[option]}
                </option>
              ))}
            </SelectField>
            <TextField label="Nome do perfil" required error={errors.profileName?.message} {...register('profileName')} />
            <TextField label="Endereço da carteira" required readOnly value={wallet.address} hint={<Link to="/carteiras" className="underline">Gerenciar carteiras</Link>} inputClassName="text-text-secondary" />
            <TextField label="ENS ou carteira secundária (opcional)" readOnly value={wallet.secondaryRef ?? ''} placeholder="ENS ou carteira secundária (opcional)" inputClassName="text-text-secondary" />
            <SelectField label="Tipo de carteira" required value={wallet.type} disabled onChange={() => undefined}>
              {Object.entries(WALLET_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
            <TextField label="Código de indicação" required error={errors.referralCode?.message} autoComplete="off" inputClassName="uppercase" {...register('referralCode')} />
            <TextField label="E-mail" required type="email" error={errors.email?.message} autoComplete="email" {...register('email')} />
            <TextField label="Nome ENS" required error={errors.ensName?.message} placeholder="nome.eth" {...register('ensName')} />
          </div>

          {secondary && (
            <label className="mt-6 flex w-fit cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-primary" {...register('useSecondary')} />
              Usar outra carteira? <span className="text-text-secondary">({secondary.label})</span>
            </label>
          )}

          <div className="mt-6 flex max-w-[338px] flex-col gap-1.5">
            <label htmlFor="observacao" className="text-sm">
              Observação do colecionador (opcional)
            </label>
            <textarea
              id="observacao"
              rows={5}
              maxLength={280}
              aria-invalid={errors.note ? true : undefined}
              className={cn(fieldInputClass, 'h-auto py-2')}
              {...register('note')}
            />
            {errors.note && <p className="text-xs text-destructive">{errors.note.message}</p>}
          </div>
        </section>

        <aside aria-labelledby="seus-nfts" className="w-full shrink-0 lg:w-[391px]">
          <h2 id="seus-nfts" className="text-lg font-bold">
            Seus NFTs
          </h2>
          <div className="mt-2 flex justify-between border-b border-border pb-2 text-sm font-bold">
            <span>NFTs</span>
            <span>Subtotal</span>
          </div>
          <ul className="mt-3 flex flex-col gap-3">
            {cart.isPending
              ? Array.from({ length: 2 }, (_, index) => <Skeleton key={index} className="h-[66px] w-full" />)
              : items.map((item) => {
                  const line = currentQuote?.items.find((candidate) => candidate.itemId === item.id)
                  return (
                    <li key={item.id} className="flex items-center gap-3 bg-card pr-4">
                      <NftImage image={item.image} sizes="66px" decorative className="size-[66px] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">{item.name}</p>
                        <p className="text-xs text-text-secondary">
                          ID do token: {item.tokenId} · {item.editionLabel}
                        </p>
                      </div>
                      <span className="text-xs text-text-secondary">(x {item.quantity})</span>
                      <span className="text-sm font-bold text-text-accent">
                        {line ? `${formatEth(line.lineTotalEth)} ETH` : item.status === 'ok' ? '…' : 'Indisponível'}
                      </span>
                    </li>
                  )
                })}
          </ul>
          <p className="mt-3 text-center text-sm">
            Tem um código promocional?{' '}
            <Link to="/carrinho" className="text-text-accent underline-offset-4 hover:underline">
              Aplique aqui
            </Link>
          </p>

          {blockingIssues.length > 0 && (
            <div className="mt-4">
              <FormAlert>
                <span className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    {blockingIssues.map((issue) => issue.message).join(' ')}{' '}
                    <Link to="/carrinho" className="font-bold underline">
                      Revisar carrinho
                    </Link>
                  </span>
                </span>
              </FormAlert>
            </div>
          )}

          <OrderSummary
            className="mt-4"
            quote={currentQuote}
            loading={quote.isPending}
            updating={quote.isFetching && !quote.isPending}
            feeHint={`Taxa estimada · ${NETWORK_LABELS[network]}`}
          />

          <fieldset id="carteira-e-rede" tabIndex={-1} className="mt-6 flex flex-col gap-3 outline-none">
            <legend className="mb-3 w-full text-center text-lg font-bold">Carteira e rede</legend>
            <p className="flex h-[26px] items-center justify-center self-start rounded-[6px] border border-border-soft bg-surface-dark px-2 text-[9px] font-bold whitespace-pre text-text-accent">
              {'METAMASK  •  WALLETCONNECT  •  COINBASE'}
            </p>
            {[primary, secondary].filter((candidate): candidate is Wallet => Boolean(candidate)).map((candidate) => {
              const selected = candidate.id === wallet.id
              return (
                <div key={candidate.id} className={cn('flex flex-col gap-2 rounded-[2px] border p-3', selected ? 'border-foreground' : 'border-border')}>
                  <label className="flex cursor-pointer items-center gap-3 text-sm">
                    <input
                      type="radio"
                      name="carteira"
                      checked={selected}
                      onChange={() => form.setValue('useSecondary', candidate.role === 'secondary', { shouldDirty: true })}
                      className="size-4 accent-primary"
                    />
                    <span className="flex-1">
                      {WALLET_TYPE_LABELS[candidate.type]}
                      <span className="block text-xs text-text-secondary">
                        {candidate.label} · {NETWORK_LABELS[candidate.network]} · {candidate.address.slice(0, 6)}…{candidate.address.slice(-4)}
                      </span>
                    </span>
                    {connectedId === candidate.id && (
                      <span className="flex items-center gap-1 text-xs text-text-accent">
                        <CheckCircle2 className="size-4" aria-hidden="true" /> Conectada
                      </span>
                    )}
                  </label>
                  {selected && (
                    <div className="flex gap-2 pl-7">
                      {isConnected ? (
                        <button
                          type="button"
                          onClick={() => disconnect.mutate(candidate.id)}
                          className="flex items-center gap-1 rounded-[4px] border border-border-soft px-2 py-1 text-xs hover:border-primary"
                        >
                          <Unplug className="size-3.5" aria-hidden="true" /> Desconectar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => connect.mutate(candidate.id)}
                          disabled={connect.isPending}
                          className="flex items-center gap-1 rounded-[4px] bg-primary px-2 py-1 text-xs font-bold text-primary-foreground disabled:opacity-60"
                        >
                          <PlugZap className="size-3.5" aria-hidden="true" /> {connect.isPending ? 'Aguardando a carteira…' : 'Conectar carteira'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </fieldset>

          <button
            type="submit"
            disabled={quote.isPending || blockingIssues.length > 0}
            className="mt-6 h-[60px] w-full rounded-[10px] bg-primary text-base font-bold text-primary-foreground hover:bg-primary/85 disabled:opacity-50 md:h-[43px] md:rounded-[6px]"
          >
            Confirmar compra
          </button>
        </aside>
      </form>

      <Dialog open={review !== null} onOpenChange={(open) => !open && !placeOrder.isPending && setReview(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto bg-card sm:max-w-lg" showCloseButton={!placeOrder.isPending}>
          <DialogHeader>
            <DialogTitle>Revise seu pedido</DialogTitle>
            <DialogDescription>Os valores abaixo foram confirmados agora pela API e serão cobrados na rede {NETWORK_LABELS[network]}.</DialogDescription>
          </DialogHeader>
          {review && (
            <div className="flex flex-col gap-4 text-sm">
              {(reviewOutdated || conflict) && (
                <FormAlert>
                  {conflict ?? 'Os preços, a disponibilidade ou as taxas mudaram desde a sua revisão.'} Confira os novos valores e confirme novamente.
                </FormAlert>
              )}
              <ul className="flex flex-col gap-2">
                {review.quote.items.map((line) => {
                  const item = items.find((candidate) => candidate.id === line.itemId)
                  return (
                    <li key={line.itemId} className="flex justify-between gap-3">
                      <span>
                        {item?.name ?? line.nftId} ({item?.editionLabel}) × {line.quantity}
                      </span>
                      <span className="font-bold text-text-accent">{formatEth(line.lineTotalEth)} ETH</span>
                    </li>
                  )
                })}
              </ul>
              <OrderSummary quote={reviewOutdated && currentQuote ? currentQuote : review.quote} />
              <p className="text-xs text-text-secondary">
                Carteira: {WALLET_TYPE_LABELS[wallet.type]} · {wallet.address.slice(0, 10)}…{wallet.address.slice(-6)}
              </p>
            </div>
          )}
          <DialogFooter className="gap-2">
            {reviewOutdated || conflict ? (
              <button
                type="button"
                onClick={refreshReview}
                disabled={!currentQuote || quote.isFetching}
                className="h-11 rounded-[6px] bg-primary px-4 font-bold text-primary-foreground disabled:opacity-60"
              >
                Usar novos valores
              </button>
            ) : (
              <button
                type="button"
                onClick={confirm}
                disabled={placeOrder.isPending}
                aria-busy={placeOrder.isPending}
                className="flex h-11 items-center justify-center gap-2 rounded-[6px] bg-primary px-4 font-bold text-primary-foreground disabled:opacity-70"
              >
                {placeOrder.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {placeOrder.isPending ? 'Enviando pedido…' : 'Confirmar pagamento'}
              </button>
            )}
          </DialogFooter>
          <p className="sr-only" role="status" aria-live="polite">
            {placeOrder.isPending ? 'Enviando pedido, aguarde.' : ''}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  )
}

type SelectFieldProps = React.ComponentProps<'select'> & { label: string; error?: string; required?: boolean }

function SelectField({ label, error, required, children, className, ...props }: SelectFieldProps) {
  const id = useId()
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm leading-4">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-text-coral">
            *
          </span>
        )}
      </label>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-erro` : undefined}
        className={cn(fieldInputClass, 'appearance-none bg-background text-text-secondary disabled:opacity-80')}
        {...props}
      >
        {children}
      </select>
      {error && (
        <p id={`${id}-erro`} className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

function CheckoutSkeleton() {
  const fields = useMemo(() => Array.from({ length: 10 }, (_, index) => index), [])
  return (
    <div className="page-container flex flex-col gap-8 pt-12 lg:flex-row" aria-busy="true" aria-label="Carregando pagamento">
      <div className="grid flex-1 gap-5 md:grid-cols-2">
        {fields.map((index) => (
          <Skeleton key={index} className="h-16" />
        ))}
      </div>
      <Skeleton className="h-[480px] w-full lg:w-[391px]" />
    </div>
  )
}
