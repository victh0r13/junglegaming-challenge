import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { favoritesApi } from '@/api/favorites'
import type { Favorites } from '@/api/contracts'
import { getErrorMessage } from '@/api/http'
import { queryKeys } from '@/api/query-keys'
import { useSessionState } from '@/features/auth/session-store'

export function useFavorites() {
  const session = useSessionState()
  const userId = session.status === 'authenticated' ? session.session.userId : null
  const query = useQuery({
    queryKey: queryKeys.private.favorites(userId ?? 'anonimo'),
    queryFn: ({ signal }) => favoritesApi.list(signal),
    enabled: userId !== null,
    select: (data) => new Set(data.nftIds),
  })
  return { ids: query.data ?? new Set<string>(), userId, query }
}

export function useToggleFavorite() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const { ids, userId } = useFavorites()

  const mutation = useMutation({
    mutationFn: ({ nftId, favorite }: { nftId: string; favorite: boolean }) =>
      favorite ? favoritesApi.add(nftId) : favoritesApi.remove(nftId),
    onMutate: async ({ nftId, favorite }) => {
      if (!userId) return
      const key = queryKeys.private.favorites(userId)
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<Favorites>(key)
      queryClient.setQueryData<Favorites>(key, (current) => {
        const list = current?.nftIds ?? []
        return { nftIds: favorite ? [...new Set([...list, nftId])] : list.filter((id) => id !== nftId) }
      })
      return { previous, key }
    },
    onError: (error, { favorite }, context) => {
      if (context?.previous) queryClient.setQueryData(context.key, context.previous)
      toast.error(favorite ? 'Não foi possível favoritar' : 'Não foi possível remover dos favoritos', {
        description: getErrorMessage(error),
      })
    },
    onSuccess: (_data, { favorite }) => {
      toast.success(favorite ? 'Adicionado aos favoritos' : 'Removido dos favoritos')
    },
    onSettled: (_data, _error, _variables, context) => {
      if (context?.key) queryClient.invalidateQueries({ queryKey: context.key })
    },
  })

  function toggle(nftId: string) {
    if (!userId) {
      toast.info('Entre na sua conta para salvar favoritos.')
      navigate({ to: '/entrar', search: { redirect: location.href } })
      return
    }
    mutation.mutate({ nftId, favorite: !ids.has(nftId) })
  }

  return { toggle, isFavorite: (nftId: string) => ids.has(nftId), isPending: mutation.isPending, pendingId: mutation.variables?.nftId }
}
