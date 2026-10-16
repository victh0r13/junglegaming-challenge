import type { QueryClient } from '@tanstack/react-query'
import { createRouter } from '@tanstack/react-router'
import { NotFoundPage } from '@/components/not-found-page'
import { routeTree } from '@/routeTree.gen'
import { parseSearch, stringifySearch } from './search-serializer'
import type { NavSection, TabSection } from '@/components/layout/app-layout'

export type RouterContext = {
  queryClient: QueryClient
}

export function createAppRouter(queryClient: QueryClient) {
  return createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    parseSearch,
    stringifySearch,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: () => <NotFoundPage />,
  })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createAppRouter>
  }

  interface StaticDataRouteOption {
    nav?: NavSection
    tab?: TabSection
    headerDivider?: boolean
    hideTabBar?: boolean
  }
}
