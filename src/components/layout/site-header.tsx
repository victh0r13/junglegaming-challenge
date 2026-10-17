import { Link } from '@tanstack/react-router'
import { CartIcon, SearchIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { AccountMenu } from './account-menu'
import type { NavSection } from './app-layout'

type SiteHeaderProps = {
  active?: NavSection
  cartCount?: number
  withDivider?: boolean
}

const navItemClass =
  'relative block pb-6 text-base whitespace-nowrap transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:bg-primary after:transition-[scale] after:duration-300 after:ease-out'

export function SiteHeader({ active, cartCount = 0, withDivider = false }: SiteHeaderProps) {
  const itemClass = (section: NavSection) =>
    cn(
      navItemClass,
      active === section
        ? 'font-bold text-text-accent after:scale-x-100'
        : 'text-foreground after:scale-x-0 hover:text-text-accent hover:after:scale-x-100',
    )

  return (
    <header className="page-container hidden pt-6 md:block">
      <div className={cn('flex items-start justify-between gap-6', withDivider && 'border-b border-foreground/80')}>
        <Link to="/" className="pt-2 text-sm font-bold tracking-[0.1em] text-foreground lg:w-40" aria-label="Kurio, página inicial">
          KURIO
        </Link>

        <nav aria-label="Principal">
          <ul className="flex gap-6 lg:gap-10">
            <li>
              <Link to="/" className={itemClass('inicio')} aria-current={active === 'inicio' ? 'page' : undefined}>
                Início
              </Link>
            </li>
            <li>
              <Link
                to="/"
                hash="catalogo"
                className={itemClass('mercado')}
                aria-current={active === 'mercado' ? 'page' : undefined}
              >
                Mercado
              </Link>
            </li>
            {['Criadores', 'Aprenda'].map((label) => (
              <li key={label}>
                <span
                  aria-disabled="true"
                  title="Disponível em breve"
                  className={cn(navItemClass, 'cursor-not-allowed text-foreground after:scale-x-0')}
                >
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-7">
          <Link
            to="/"
            hash="catalogo"
            aria-label="Buscar NFTs"
            className="rounded-sm text-foreground transition-colors hover:text-text-accent"
          >
            <SearchIcon />
          </Link>

          <Link
            to="/carrinho"
            aria-label={`Carrinho, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}`}
            className="relative rounded-sm text-foreground transition-colors hover:text-text-accent"
          >
            <CartIcon />
            {cartCount > 0 && (
              <span
                key={cartCount}
                aria-hidden="true"
                className="absolute -top-0.5 left-[13px] grid size-5 animate-badge-bump place-items-center rounded-full border-2 border-background bg-primary text-[10px] font-medium text-primary-foreground"
              >
                {cartCount > 9 ? '9+' : cartCount}
              </span>
            )}
          </Link>

          <AccountMenu />
        </div>
      </div>
    </header>
  )
}
