import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { AvatarUpdateBody, PasswordChangeBody, ProfileUpdateBody, User, WalletBody } from '@/api/contracts'
import { profileApi } from '@/api/profile'
import { queryKeys } from '@/api/query-keys'
import { walletsApi } from '@/api/wallets'
import { useSessionState } from '@/features/auth/session-store'

function useUserId() {
  const session = useSessionState()
  return session.status === 'authenticated' ? session.session.userId : null
}

export function useProfile() {
  const userId = useUserId()
  return useQuery({
    queryKey: queryKeys.private.profile(userId ?? 'anonimo'),
    queryFn: ({ signal }) => profileApi.get(signal),
    enabled: userId !== null,
  })
}

function useSyncUser() {
  const queryClient = useQueryClient()
  const userId = useUserId()
  return (user: User) => {
    if (!userId) return
    queryClient.setQueryData(queryKeys.private.profile(userId), user)
    queryClient.setQueryData(queryKeys.private.session(userId), { user })
  }
}

export function useUpdateProfile() {
  const sync = useSyncUser()
  return useMutation({ mutationFn: (body: ProfileUpdateBody) => profileApi.update(body), onSuccess: sync })
}

export function useUpdateAvatar() {
  const sync = useSyncUser()
  return useMutation({ mutationFn: (body: AvatarUpdateBody) => profileApi.updateAvatar(body), onSuccess: sync })
}

export function useChangePassword() {
  return useMutation({ mutationFn: (body: PasswordChangeBody) => profileApi.changePassword(body) })
}

export function useWallets() {
  const userId = useUserId()
  return useQuery({
    queryKey: queryKeys.private.wallets(userId ?? 'anonimo'),
    queryFn: ({ signal }) => walletsApi.list(signal),
    enabled: userId !== null,
    select: (data) => data.items,
  })
}

export function useSaveWallet() {
  const queryClient = useQueryClient()
  const userId = useUserId()
  return useMutation({
    mutationFn: ({ id, body }: { id?: string; body: WalletBody }) => (id ? walletsApi.update(id, body) : walletsApi.create(body)),
    onSuccess: () => {
      if (userId) queryClient.invalidateQueries({ queryKey: queryKeys.private.wallets(userId) })
    },
  })
}
