import type { ReactNode } from 'react'
import { BREAKPOINTS, useMediaQuery } from '@/lib/use-media-query'
import { BackToTop } from './back-to-top'
import { useSameHashScroll } from './use-same-hash-scroll'
import { MobileTabBar } from './mobile-tab-bar'
import { SiteFooter } from './site-footer'
import { SiteHeader } from './site-header'

export type NavSection = 'inicio' | 'mercado'
export type TabSection = 'inicio' | 'favoritos' | 'carrinho' | 'perfil'

type AppLayoutProps = {
  children: ReactNode
  nav?: NavSection
  tab?: TabSection
  headerDivider?: boolean
  hideTabBar?: boolean
  cartCount?: number
}

export function AppLayout({ children, nav, tab, headerDivider = false, hideTabBar = false, cartCount = 0 }: AppLayoutProps) {
  const isDesktop = useMediaQuery(BREAKPOINTS.md)
  useSameHashScroll()

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Pular para o conteúdo
      </a>
      {isDesktop && <SiteHeader active={nav} withDivider={headerDivider} cartCount={cartCount} />}
      <main id="conteudo" tabIndex={-1} className="pb-[150px] outline-none md:pb-0">
        {children}
      </main>
      {isDesktop && <SiteFooter />}
      {isDesktop && <BackToTop />}
      {!isDesktop && !hideTabBar && <MobileTabBar active={tab} cartCount={cartCount} />}
    </>
  )
}
