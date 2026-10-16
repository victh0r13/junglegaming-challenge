import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { authApi } from '@/api/auth'
import { cartApi } from '@/api/cart'
import type { AuthResponse, LoginBody, RegisterBody } from '@/api/contracts'
import { queryKeys } from '@/api/query-keys'
import { guestCart } from '@/features/cart/guest-cart'
import { sessionStore, useSessionState } from './session-store'

export function clearPrivateData(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: queryKeys.private.all })
  queryClient.removeQueries({ queryKey: queryKeys.cart.all })
}

async function completeSignIn(queryClient: QueryClient, { user, session }: AuthResponse) {
  if (sessionStore.getUserId() !== user.id) clearPrivateData(queryClient)
  sessionStore.signIn({ token: session.token, userId: user.id, expiresAt: session.expiresAt })
  queryClient.setQueryData(queryKeys.private.session(user.id), { user })

  const guestCartId = guestCart.getId()
  if (guestCartId) {
    try {
      const merged = await cartApi.merge(guestCartId)
      queryClient.setQueryData(queryKeys.cart.detail(user.id), merged)
      guestCart.clear()
    } catch {
      return { mergeFailed: true }
    }
  }
  await queryClient.invalidateQueries({ queryKey: queryKeys.cart.all })
  return { mergeFailed: false }
}

export function useCurrentUser() {
  const state = useSessionState()
  const userId = state.status === 'authenticated' ? state.session.userId : null
  const query = useQuery({
    queryKey: queryKeys.private.session(userId ?? 'anonimo'),
    queryFn: ({ signal }) => authApi.session(signal),
    enabled: userId !== null,
    staleTime: 5 * 60_000,
    select: (data) => data.user,
  })
  return {
    user: userId ? query.data : undefined,
    userId,
    sessionStatus: state.status,
    isAuthenticated: userId !== null,
    isLoading: userId !== null && query.isPending,
  }
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: LoginBody) => completeSignIn(queryClient, await authApi.login(body)),
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: RegisterBody) => completeSignIn(queryClient, await authApi.register(body)),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      try {
        await authApi.logout()
      } finally {
        sessionStore.signOut()
        guestCart.clear()
        clearPrivateData(queryClient)
      }
    },
  })
}

export function safeRedirect(target: string | undefined) {
  return target && target.startsWith('/') && !target.startsWith('//') ? target : '/'
}
