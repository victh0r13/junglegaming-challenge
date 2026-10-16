import type { ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { Heart, LogOut, User, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { useLogout } from '@/features/auth/use-auth'

const LINKS = [
  { to: '/perfil', label: 'Perfil do colecionador', Icon: User },
  { to: '/carteiras', label: 'Carteiras', Icon: Wallet },
] as const

export function AccountLayout({ title, children }: { title: string; children: ReactNode }) {
  const logout = useLogout()
  const navigate = useNavigate()

  async function signOut() {
    await logout.mutateAsync().catch(() => undefined)
    toast.success('Você saiu da sua conta.')
    navigate({ to: '/' })
  }

  return (
    <div className="page-container mt-6 flex flex-col gap-7 md:mt-8 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-[310px]">
        <nav aria-label="Conta" className="bg-card p-3 lg:p-5">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col">
            {LINKS.map(({ to, label, Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  activeProps={{ 'aria-current': 'page', className: 'bg-surface-dark text-text-accent' }}
                  className="flex items-center gap-3 rounded-[6px] px-3 py-3 text-sm whitespace-nowrap hover:text-text-accent"
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </Link>
              </li>
            ))}
            <li>
              <Link to="/perfil" hash="favoritos" className="flex items-center gap-3 rounded-[6px] px-3 py-3 text-sm whitespace-nowrap hover:text-text-accent">
                <Heart className="size-4" aria-hidden="true" />
                Favoritos
              </Link>
            </li>
            <li className="lg:mt-6">
              <button
                type="button"
                onClick={signOut}
                disabled={logout.isPending}
                className="flex items-center gap-3 rounded-[6px] border border-border-soft px-4 py-3 text-sm whitespace-nowrap hover:border-primary"
              >
                <LogOut className="size-4" aria-hidden="true" />
                Sair
              </button>
            </li>
          </ul>
        </nav>
      </aside>
      <section aria-labelledby="conta-titulo" className="min-w-0 flex-1">
        <h1 id="conta-titulo" className="text-lg leading-4 font-bold">
          {title}
        </h1>
        {children}
      </section>
    </div>
  )
}
