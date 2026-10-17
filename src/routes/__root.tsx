import { Suspense, lazy } from 'react'
import { HeadContent, Outlet, createRootRouteWithContext, useMatches } from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { Toaster } from '@/components/ui/sonner'
import { SessionWatcher } from '@/features/auth/session-watcher'
import { useCartCount } from '@/features/cart/use-cart'
import type { RouterContext } from '@/app/router'

const RealtimeBridge = lazy(() => import('@/features/realtime/realtime-bridge').then((module) => ({ default: module.RealtimeBridge })))
const ScenarioPanel = import.meta.env.VITE_ENABLE_MOCKS === 'true' ? lazy(() => import('@/mocks/ui/scenario-panel')) : null

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [{ title: 'Kurio — Marketplace de NFTs' }],
  }),
  component: RootComponent,
})

function RootComponent() {
  const staticData = useMatches({ select: (matches) => matches.at(-1)?.staticData ?? {} })
  const cartCount = useCartCount()

  return (
    <>
      <HeadContent />
      <AppLayout nav={staticData.nav} tab={staticData.tab} headerDivider={staticData.headerDivider} hideTabBar={staticData.hideTabBar} cartCount={cartCount}>
        <Outlet />
      </AppLayout>
      <Toaster />
      <SessionWatcher />
      <Suspense fallback={null}>
        <RealtimeBridge />
      </Suspense>
      {ScenarioPanel && (
        <Suspense fallback={null}>
          <ScenarioPanel />
        </Suspense>
      )}
    </>
  )
}
