import type { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { NotFoundPage } from '@/components/not-found-page'
import { routeTree } from '@/routeTree.gen'
import type { NavSection, TabSection } from '@/components/layout/app-layout'

export type RouterContext = {
  queryClient: QueryClient
}

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: 'intent',
    // Os dados ficam sob responsabilidade do TanStack Query; o router só dispara o carregamento
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: () => <NotFoundPage />,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }

  /** Metadados estáticos por rota usados pelo layout (item ativo e divisória). */
  interface StaticDataRouteOption {
    nav?: NavSection
    tab?: TabSection
    headerDivider?: boolean
  }
}
