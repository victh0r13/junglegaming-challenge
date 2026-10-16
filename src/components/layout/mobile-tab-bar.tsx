import type { ComponentType, SVGProps } from 'react'
import { Link, type LinkProps } from '@tanstack/react-router'
import { HeartIcon, HomeIcon, ScanIcon, ShopIcon, UserIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import type { TabSection } from './app-layout'

type Tab = {
  id: TabSection
  label: string
  to: LinkProps['to']
  hash?: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}

const LEFT_TABS: Tab[] = [
  { id: 'inicio', label: 'Início', to: '/', Icon: HomeIcon },
  { id: 'favoritos', label: 'Favoritos', to: '/perfil', hash: 'favoritos', Icon: HeartIcon },
]

const RIGHT_TABS: Tab[] = [
  { id: 'carrinho', label: 'Carrinho', to: '/carrinho', Icon: ShopIcon },
  { id: 'perfil', label: 'Perfil', to: '/perfil', Icon: UserIcon },
]

const NOTCH_PATH =
  'M0 0C13.75 0 25.98 8.2 31.83 20.65C39.59 37.18 56.39 48.62 75.85 48.62C95.31 48.62 112.11 37.17 119.87 20.65C125.72 8.2 137.94 0 151.7 0V95H0Z'

type MobileTabBarProps = {
  active?: TabSection
  cartCount?: number
}

export function MobileTabBar({ active, cartCount = 0 }: MobileTabBarProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 h-[126px] drop-shadow-[0_-10px_15px_rgba(10,6,4,0.45)] md:hidden"
    >
      <div className="absolute inset-x-0 top-[31px] bottom-0 flex pb-[env(safe-area-inset-bottom)] text-card">
        <TabGroup tabs={LEFT_TABS} active={active} cartCount={cartCount} className="rounded-tl-[29px]" />
        <svg width="152" height="95" viewBox="0 0 151.7 95" preserveAspectRatio="none" aria-hidden="true" className="-mx-px h-full shrink-0">
          <path d={NOTCH_PATH} fill="currentColor" />
        </svg>
        <TabGroup tabs={RIGHT_TABS} active={active} cartCount={cartCount} className="rounded-tr-[29px]" />
      </div>

      <Link
        to="/"
        hash="catalogo"
        aria-label="Explorar coleções"
        className="absolute top-0 left-1/2 grid size-[65px] -translate-x-1/2 place-items-center rounded-full bg-linear-to-b from-primary/40 to-primary text-foreground"
      >
        <ScanIcon />
      </Link>
    </nav>
  )
}

type TabGroupProps = {
  tabs: Tab[]
  active?: TabSection
  cartCount: number
  className?: string
}

function TabGroup({ tabs, active, cartCount, className }: TabGroupProps) {
  return (
    <ul className={cn('flex flex-1 items-start justify-around bg-card pt-10', className)}>
      {tabs.map(({ id, label, to, hash, Icon }) => {
        const isActive = id === active
        const showBadge = id === 'carrinho' && cartCount > 0
        return (
          <li key={id}>
            <Link
              to={to}
              hash={hash}
              aria-current={isActive ? 'page' : undefined}
              aria-label={showBadge ? `${label}, ${cartCount} ${cartCount === 1 ? 'item' : 'itens'}` : label}
              className={cn(
                'relative grid size-11 -translate-y-3 place-items-center rounded-md transition-colors',
                isActive ? 'text-text-accent' : 'text-text-secondary hover:text-foreground',
              )}
            >
              <Icon className="size-5" />
              {showBadge && (
                <span
                  aria-hidden="true"
                  className="absolute top-1 right-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] leading-4 font-bold text-primary-foreground"
                >
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
