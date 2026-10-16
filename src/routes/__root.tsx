import { Suspense, lazy } from 'react'
import { HeadContent, Outlet, createRootRouteWithContext, useMatches } from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { Toaster } from '@/components/ui/sonner'
import { SessionWatcher } from '@/features/auth/session-watcher'
import type { RouterContext } from '@/app/router'

const ScenarioPanel = import.meta.env.VITE_ENABLE_MOCKS === 'true' ? lazy(() => import('@/mocks/ui/scenario-panel')) : null

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [{ title: 'Kurio — Marketplace de NFTs' }],
  }),
  component: RootComponent,
})

function RootComponent() {
  const staticData = useMatches({ select: (matches) => matches.at(-1)?.staticData ?? {} })

  return (
    <>
      <HeadContent />
      <AppLayout nav={staticData.nav} tab={staticData.tab} headerDivider={staticData.headerDivider}>
        <Outlet />
      </AppLayout>
      <Toaster />
      <SessionWatcher />
      {ScenarioPanel && (
        <Suspense fallback={null}>
          <ScenarioPanel />
        </Suspense>
      )}
    </>
  )
}
