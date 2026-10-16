import type { ReactNode } from 'react'
import { MobileTabBar } from './mobile-tab-bar'
import { SiteFooter } from './site-footer'
import { SiteHeader } from './site-header'

type AppLayoutProps = {
  children: ReactNode
}

/** Estrutura comum das telas: cabeçalho, conteúdo, rodapé e navegação mobile. */
export function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Pular para o conteúdo
      </a>
      <SiteHeader withDivider />
      <main id="conteudo" tabIndex={-1} className="pb-[150px] outline-none md:pb-0">
        {children}
      </main>
      <SiteFooter />
      <MobileTabBar />
    </>
  )
}
