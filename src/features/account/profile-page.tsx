import { useRef, useState, type ChangeEvent } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { z } from 'zod'
import type { User } from '@/api/contracts'
import { getErrorMessage } from '@/api/http'
import { passwordChangeSchema, profileInputSchema } from '@/api/schemas'
import { FormAlert, TextField } from '@/components/form/text-field'
import { UserAvatar } from '@/components/layout/account-menu'
import { NftCard, NftCardSkeleton } from '@/components/nft/nft-card'
import { Skeleton } from '@/components/ui/skeleton'
import { nftListQuery } from '@/features/catalog/queries'
import { useFavorites } from '@/features/favorites/use-favorites'
import { applyApiFieldErrors } from '@/lib/form-errors'
import { AccountLayout } from './account-layout'
import { useChangePassword, useProfile, useUpdateAvatar, useUpdateProfile } from './use-account'

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const AVATAR_SIZE = 256

export function ProfilePage() {
  const profile = useProfile()
  return (
    <AccountLayout title="Perfil do colecionador">
      {profile.isPending ? (
        <div className="mt-6 grid gap-5 md:grid-cols-2" role="status" aria-busy="true" aria-label="Carregando perfil">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-16" />
          ))}
        </div>
      ) : profile.isError ? (
        <div role="alert" className="mt-6">
          <FormAlert>{getErrorMessage(profile.error)}</FormAlert>
          <button type="button" onClick={() => profile.refetch()} className="mt-3 rounded-[6px] bg-primary px-4 py-2 font-bold text-primary-foreground">
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          <ProfileForm key={profile.data.id} user={profile.data} />
          <PasswordForm />
          <FavoritesList />
        </>
      )}
    </AccountLayout>
  )
}

function ProfileForm({ user }: { user: User }) {
  const update = useUpdateProfile()
  const form = useForm<z.input<typeof profileInputSchema>, unknown, z.output<typeof profileInputSchema>>({
    resolver: zodResolver(profileInputSchema),
    values: {
      displayName: user.displayName,
      username: user.username,
      email: user.email,
      ensName: user.ensName,
      walletNickname: user.walletNickname,
    },
  })
  const { errors, isDirty } = form.formState

  const onSubmit = form.handleSubmit((values) =>
    update.mutateAsync(values).then(
      () => toast.success('Perfil atualizado'),
      (error: unknown) => {
        if (!applyApiFieldErrors(error, form.setError)) toast.error('Não foi possível salvar o perfil', { description: getErrorMessage(error) })
      },
    ),
  )

  return (
    <form noValidate onSubmit={onSubmit} className="mt-6 flex flex-col gap-6" aria-label="Dados do perfil">
      <div className="grid gap-x-6 gap-y-5 md:grid-cols-2">
        <TextField label="Nome de exibição" required error={errors.displayName?.message} autoComplete="name" {...form.register('displayName')} />
        <TextField label="Nome de usuário" required error={errors.username?.message} autoComplete="username" {...form.register('username')} />
        <TextField label="E-mail" required type="email" error={errors.email?.message} autoComplete="email" {...form.register('email')} />
        <TextField label="Nome ENS" required placeholder="nome.eth" error={errors.ensName?.message} {...form.register('ensName')} />
        <TextField label="Apelido da carteira" required error={errors.walletNickname?.message} {...form.register('walletNickname')} />
        <AvatarField user={user} />
      </div>
      <button
        type="submit"
        disabled={update.isPending || !isDirty}
        className="h-10 self-start rounded-[6px] bg-primary px-10 font-bold text-primary-foreground disabled:opacity-60"
      >
        {update.isPending ? 'Salvando…' : 'Salvar'}
      </button>
    </form>
  )
}

function resizeImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = AVATAR_SIZE
      canvas.height = AVATAR_SIZE
      const context = canvas.getContext('2d')
      if (!context) return reject(new Error('Canvas indisponível'))
      const side = Math.min(image.width, image.height)
      context.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/webp', 0.85))
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Não foi possível ler a imagem.'))
    }
    image.src = url
  })
}

function AvatarField({ user }: { user: User }) {
  const updateAvatar = useUpdateAvatar()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setError(null)
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return setError('Envie uma imagem PNG, JPEG ou WebP.')
    if (file.size > MAX_UPLOAD_BYTES) return setError('A imagem deve ter no máximo 5 MB.')
    try {
      const dataUrl = await resizeImage(file)
      await updateAvatar.mutateAsync({ dataUrl })
      toast.success('Avatar atualizado')
    } catch (uploadError) {
      setError(getErrorMessage(uploadError, 'Não foi possível enviar a imagem.'))
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span id="avatar-rotulo" className="text-sm leading-4">
        Avatar
      </span>
      <div className="flex items-center gap-4" role="group" aria-labelledby="avatar-rotulo">
        <UserAvatar user={user} className="size-12 text-base" />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={updateAvatar.isPending}
          className="h-10 rounded-[6px] border border-primary px-4 text-sm text-text-accent disabled:opacity-60"
        >
          {updateAvatar.isPending ? 'Enviando…' : 'Alterar'}
        </button>
        <button
          type="button"
          onClick={() =>
            updateAvatar.mutate({ dataUrl: null }, { onSuccess: () => toast.success('Avatar removido'), onError: (e) => setError(getErrorMessage(e)) })
          }
          disabled={!user.avatarUrl || updateAvatar.isPending}
          className="h-10 rounded-[6px] border border-border-soft px-4 text-sm disabled:opacity-40"
        >
          Remover
        </button>
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={handleFile} />
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}

const passwordFormSchema = passwordChangeSchema
  .and(z.object({ confirmPassword: z.string().min(1, 'Confirme a nova senha.') }))
  .refine((values) => values.newPassword === values.confirmPassword, { path: ['confirmPassword'], message: 'As senhas não coincidem.' })

function PasswordForm() {
  const change = useChangePassword()
  const form = useForm<z.input<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  })
  const { errors } = form.formState

  const onSubmit = form.handleSubmit(({ currentPassword, newPassword }) =>
    change.mutateAsync({ currentPassword, newPassword }).then(
      () => {
        form.reset()
        toast.success('Senha alterada com sucesso')
      },
      (error: unknown) => {
        if (!applyApiFieldErrors(error, form.setError)) toast.error('Não foi possível alterar a senha', { description: getErrorMessage(error) })
      },
    ),
  )

  return (
    <form noValidate onSubmit={onSubmit} className="mt-10 flex flex-col gap-5 border-t border-border pt-8" aria-labelledby="senha-titulo">
      <h2 id="senha-titulo" className="text-base font-bold">
        Alterar senha
      </h2>
      <div className="grid gap-x-6 gap-y-5 md:grid-cols-3">
        <TextField label="Senha atual" type="password" autoComplete="current-password" error={errors.currentPassword?.message} {...form.register('currentPassword')} />
        <TextField label="Nova senha" type="password" autoComplete="new-password" error={errors.newPassword?.message} {...form.register('newPassword')} />
        <TextField label="Confirmar nova senha" type="password" autoComplete="new-password" error={errors.confirmPassword?.message} {...form.register('confirmPassword')} />
      </div>
      <button type="submit" disabled={change.isPending} className="h-10 self-start rounded-[6px] bg-primary px-6 font-bold text-primary-foreground disabled:opacity-60">
        {change.isPending ? 'Alterando…' : 'Alterar senha'}
      </button>
    </form>
  )
}

function FavoritesList() {
  const { ids, query: favoritesQuery } = useFavorites()
  const list = [...ids].sort()
  const nfts = useQuery({ ...nftListQuery({ ids: list, porPagina: 24 }), enabled: favoritesQuery.isSuccess && list.length > 0 })

  return (
    <section id="favoritos" aria-labelledby="favoritos-titulo" className="mt-10 scroll-mt-6 border-t border-border pt-8 pb-6">
      <h2 id="favoritos-titulo" className="text-base font-bold">
        Meus favoritos
      </h2>
      {favoritesQuery.isPending ? (
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <NftCardSkeleton key={index} />
          ))}
        </div>
      ) : list.length === 0 ? (
        <p className="mt-3 text-sm text-text-secondary">Você ainda não favoritou nenhum NFT.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
          {nfts.data
            ? nfts.data.items.map((nft) => <NftCard key={nft.id} nft={nft} />)
            : list.map((id) => <NftCardSkeleton key={id} />)}
        </div>
      )}
    </section>
  )
}
