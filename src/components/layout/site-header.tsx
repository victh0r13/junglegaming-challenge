import { CartIcon, LoginIcon, SearchIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { label: 'Início', href: '/' },
  { label: 'Mercado', href: '/mercado' },
  { label: 'Criadores', href: '/criadores' },
  { label: 'Aprenda', href: '/aprenda' },
] as const

type NavLabel = (typeof NAV_ITEMS)[number]['label']

type SiteHeaderProps = {
  /** Item de navegação destacado, conforme a tela atual. */
  active?: NavLabel
  /** Quantidade de itens no carrinho exibida no badge. */
  cartCount?: number
  /** Exibe a linha divisória sob o cabeçalho (home, perfil e carteiras). */
  withDivider?: boolean
}

/** Cabeçalho desktop/tablet. No mobile a navegação fica na barra inferior. */
export function SiteHeader({ active = 'Início', cartCount = 0, withDivider = false }: SiteHeaderProps) {
  return (
    <header className="page-container hidden pt-6 md:block">
      <div className={cn('flex items-start justify-between gap-6', withDivider && 'border-b border-foreground/80')}>
        <a
          href="/"
          className="pt-2 text-sm font-bold tracking-[0.1em] text-foreground lg:w-40"
          aria-label="Kurio, página inicial"
        >
          KURIO
        </a>

        <nav aria-label="Principal">
          <ul className="flex gap-6 lg:gap-10">
            {NAV_ITEMS.map((item) => {
              const isActive = item.label === active
              return (
                <li key={item.label}>
                  <a
                    href={item.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'block border-b-[3px] pb-[21px] text-base whitespace-nowrap transition-colors',
                      isActive
                        ? 'border-primary font-bold text-text-accent'
                        : 'border-transparent text-foreground hover:text-text-accent',
                    )}
                  >
                    {item.label}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-7">
          <button
            type="button"
            aria-label="Buscar NFTs"
            className="rounded-sm text-foreground transition-colors hover:text-text-accent"
          >
            <SearchIcon />
          </button>

          <a
            href="/carrinho"
            aria-label={`Carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`}
            className="relative rounded-sm text-foreground transition-colors hover:text-text-accent"
          >
            <CartIcon />
            {cartCount > 0 && (
              <span
                aria-hidden="true"
                className="absolute -top-0.5 left-[13px] grid size-5 place-items-center rounded-full border-2 border-background bg-primary text-[10px] font-medium text-primary-foreground"
              >
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </a>

          <Button asChild className="h-[35px] w-[100px] gap-1 rounded-[6px] text-base font-medium">
            <a href="/entrar">
              <LoginIcon className="size-5" />
              Entrar
            </a>
          </Button>
        </div>
      </div>
    </header>
  )
}
