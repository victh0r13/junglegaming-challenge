import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import type { z } from 'zod'
import { NETWORK_LABELS, NETWORKS, WALLET_TYPE_LABELS, WALLET_TYPES, type Wallet } from '@/api/contracts'
import { getErrorMessage, isApiError } from '@/api/http'
import { walletInputSchema } from '@/api/schemas'
import { FormAlert, TextField, fieldInputClass } from '@/components/form/text-field'
import { Skeleton } from '@/components/ui/skeleton'
import { applyApiFieldErrors } from '@/lib/form-errors'
import { cn } from '@/lib/utils'
import { AccountLayout } from './account-layout'
import { useProfile, useSaveWallet, useWallets } from './use-account'

type WalletFormInput = z.input<typeof walletInputSchema>
type WalletFormOutput = z.output<typeof walletInputSchema>
type Role = Wallet['role']

const ROLE_TITLES: Record<Role, string> = { primary: 'Carteira principal', secondary: 'Carteira secundária' }

export function WalletsPage() {
  const wallets = useWallets()
  const profile = useProfile()

  return (
    <AccountLayout title="Carteiras">
      <p className="mt-4 text-[13px] text-text-secondary">
        Estas carteiras ficam disponíveis no pagamento e para receber os NFTs comprados.
      </p>
      {wallets.isPending || profile.isPending ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2" role="status" aria-busy="true" aria-label="Carregando carteiras">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-16" />
          ))}
        </div>
      ) : wallets.isError ? (
        <div className="mt-6">
          <FormAlert>{getErrorMessage(wallets.error)}</FormAlert>
          <button type="button" onClick={() => wallets.refetch()} className="mt-3 rounded-[6px] bg-primary px-4 py-2 font-bold text-primary-foreground">
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <WalletSection role="primary" wallets={wallets.data} profile={profile.data} />
          <WalletSection role="secondary" wallets={wallets.data} profile={profile.data} />
        </>
      )}
    </AccountLayout>
  )
}

type SectionProps = {
  role: Role
  wallets: Wallet[]
  profile: { displayName: string; email: string; ensName: string; walletNickname: string } | undefined
}

function WalletSection({ role, wallets, profile }: SectionProps) {
  const wallet = wallets.find((candidate) => candidate.role === role)
  const primary = wallets.find((candidate) => candidate.role === 'primary')
  const [editing, setEditing] = useState(false)
  const [copyPrimary, setCopyPrimary] = useState(false)
  const headingId = useId()

  const base: WalletFormInput = wallet
    ? { ...wallet, secondaryRef: wallet.secondaryRef ?? '' }
    : copyPrimary && primary
      ? { ...primary, role, address: '', label: `${primary.label} 2`, secondaryRef: primary.ensName }
      : {
          role,
          label: role === 'primary' ? (profile?.walletNickname ?? '') : '',
          type: 'metamask',
          network: 'ethereum',
          address: '',
          secondaryRef: '',
          displayName: profile?.displayName ?? '',
          profileName: profile?.displayName ?? '',
          email: profile?.email ?? '',
          referralCode: '',
          ensName: profile?.ensName ?? '',
        }

  const showForm = Boolean(wallet) || editing

  return (
    <section aria-labelledby={headingId} className={cn('mt-8', role === 'secondary' && 'border-t border-border pt-8')}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} className="text-lg font-bold">
          {ROLE_TITLES[role]}
        </h2>
        {!wallet && (
          <div className="flex items-center gap-4">
            {role === 'secondary' && primary && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={copyPrimary} onChange={(event) => setCopyPrimary(event.target.checked)} className="size-4 accent-primary" />
                Igual à carteira principal
              </label>
            )}
            {!editing && (
              <button type="button" onClick={() => setEditing(true)} className="rounded-[6px] border border-primary px-4 py-1.5 text-sm font-bold text-text-accent">
                Adicionar
              </button>
            )}
          </div>
        )}
      </div>
      {showForm ? (
        <WalletForm key={`${wallet?.id ?? 'nova'}-${copyPrimary}`} wallet={wallet} defaults={base} onCancel={wallet ? undefined : () => setEditing(false)} />
      ) : (
        <p className="mt-3 text-[13px] text-text-secondary">
          Você ainda não adicionou uma carteira {role === 'primary' ? 'principal' : 'secundária'}.
        </p>
      )}
    </section>
  )
}

function WalletForm({ wallet, defaults, onCancel }: { wallet?: Wallet; defaults: WalletFormInput; onCancel?: () => void }) {
  const save = useSaveWallet()
  const form = useForm<WalletFormInput, unknown, WalletFormOutput>({ resolver: zodResolver(walletInputSchema), defaultValues: defaults })
  const { errors, isDirty } = form.formState
  const [formError, setFormError] = useState<string | null>(null)

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null)
    return save.mutateAsync({ id: wallet?.id, body: { ...values, secondaryRef: values.secondaryRef || null } }).then(
      () => {
        toast.success(wallet ? 'Carteira atualizada' : 'Carteira adicionada')
        form.reset(values)
        onCancel?.()
      },
      (error: unknown) => {
        if (applyApiFieldErrors(error, form.setError)) return
        setFormError(isApiError(error) ? error.message : getErrorMessage(error))
      },
    )
  })

  return (
    <form noValidate onSubmit={onSubmit} className="mt-4 flex flex-col gap-5" aria-label={wallet ? `Editar ${wallet.label}` : 'Nova carteira'}>
      {formError && <FormAlert>{formError}</FormAlert>}
      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
        <TextField label="Nome de exibição" required error={errors.displayName?.message} {...form.register('displayName')} />
        <TextField label="Apelido da carteira" required error={errors.label?.message} {...form.register('label')} />
        <Select label="Rede" required error={errors.network?.message} {...form.register('network')}>
          {NETWORKS.map((network) => (
            <option key={network} value={network}>
              {NETWORK_LABELS[network]}
            </option>
          ))}
        </Select>
        <TextField label="Nome do perfil" required error={errors.profileName?.message} {...form.register('profileName')} />
        <TextField label="Endereço da carteira" required placeholder="Endereço 0x da carteira" autoComplete="off" spellCheck={false} error={errors.address?.message} {...form.register('address')} />
        <TextField label="ENS ou carteira secundária (opcional)" placeholder="ENS ou carteira secundária (opcional)" error={errors.secondaryRef?.message} {...form.register('secondaryRef')} />
        <Select label="Tipo de carteira" required error={errors.type?.message} {...form.register('type')}>
          {WALLET_TYPES.map((type) => (
            <option key={type} value={type}>
              {WALLET_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
        <TextField label="Código de indicação" required inputClassName="uppercase" error={errors.referralCode?.message} {...form.register('referralCode')} />
        <TextField label="E-mail" required type="email" error={errors.email?.message} {...form.register('email')} />
        <TextField label="Nome ENS" required placeholder="nome.eth" error={errors.ensName?.message} {...form.register('ensName')} />
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={save.isPending || (Boolean(wallet) && !isDirty)} className="h-10 rounded-[6px] bg-primary px-6 font-bold text-primary-foreground disabled:opacity-60">
          {save.isPending ? 'Salvando…' : 'Salvar carteira'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="h-10 rounded-[6px] border border-border-soft px-4 text-sm">
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}

type SelectProps = React.ComponentProps<'select'> & { label: string; error?: string; required?: boolean }

function Select({ label, error, required, children, ...props }: SelectProps) {
  const id = useId()
  return (
    <div className="flex flex-col gap-1.5">
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
        className={cn(fieldInputClass, 'bg-background')}
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
