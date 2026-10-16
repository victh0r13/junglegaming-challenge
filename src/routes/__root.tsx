import { HeadContent, Outlet, createRootRouteWithContext, useMatches } from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/app-layout'
import type { RouterContext } from '@/app/router'

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [{ title: 'Kurio — Marketplace de NFTs' }],
  }),
  component: RootComponent,
})

function RootComponent() {
  // A rota mais profunda define o item ativo da navegação e a divisória do cabeçalho
  const staticData = useMatches({ select: (matches) => matches.at(-1)?.staticData ?? {} })

  return (
    <>
      <HeadContent />
      <AppLayout nav={staticData.nav} tab={staticData.tab} headerDivider={staticData.headerDivider}>
        <Outlet />
      </AppLayout>
    </>
  )
}
