import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { isApiError } from '@/api/http'

const MAX_RETRIES = 2

function shouldRetry(failureCount: number, error: unknown) {
  return isApiError(error) && error.isTransient && failureCount < MAX_RETRIES
}

export function createQueryClient() {
  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) => {
        if (query.state.data !== undefined && isApiError(error) && error.code !== 'SESSION_EXPIRED') {
          toast.error('Não foi possível atualizar os dados', { description: error.message, id: `refetch-${query.queryHash}` })
        }
      },
    }),
    mutationCache: new MutationCache(),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: shouldRetry,
        retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 4_000),
        refetchOnWindowFocus: true,
      },
      mutations: {
        retry: false,
      },
    },
  })
  return queryClient
}
