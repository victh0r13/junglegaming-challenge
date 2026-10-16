import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { LogOut, User as UserIcon, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import type { User } from '@/api/contracts'
import { LoginIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useCurrentUser, useLogout } from '@/features/auth/use-auth'
import { cn } from '@/lib/utils'

export function UserAvatar({ user, className }: { user: Pick<User, 'displayName' | 'avatarUrl'>; className?: string }) {
  const initials = user.displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
  return user.avatarUrl ? (
    <img src={user.avatarUrl} alt="" className={cn('size-8 rounded-full object-cover', className)} />
  ) : (
    <span aria-hidden="true" className={cn('grid size-8 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground', className)}>
      {initials || '?'}
    </span>
  )
}

export function AccountMenu() {
  const { user, isAuthenticated } = useCurrentUser()
  const logout = useLogout()
  const navigate = useNavigate()
  const location = useLocation()

  if (!isAuthenticated) {
    return (
      <Button asChild className="h-[35px] w-[100px] gap-1 rounded-[6px] text-base font-medium">
        <Link to="/entrar" search={{ redirect: location.pathname === '/' ? undefined : location.href }}>
          <LoginIcon className="size-5" />
          Entrar
        </Link>
      </Button>
    )
  }

  async function signOut() {
    await logout.mutateAsync().catch(() => undefined)
    toast.success('Você saiu da sua conta.')
    navigate({ to: '/' })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-[35px] items-center gap-2 rounded-[6px] border border-border-soft px-2 text-sm hover:border-primary"
        aria-label={user ? `Conta de ${user.displayName}` : 'Conta'}
      >
        {user ? <UserAvatar user={user} className="size-6" /> : <span className="size-6 rounded-full bg-surface-card" />}
        <span className="max-w-28 truncate max-lg:hidden">{user?.displayName ?? 'Carregando'}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        {user && (
          <DropdownMenuLabel className="flex flex-col">
            <span className="text-foreground">{user.displayName}</span>
            <span className="text-xs font-normal text-text-secondary">@{user.username}</span>
          </DropdownMenuLabel>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/perfil">
            <UserIcon aria-hidden="true" />
            Perfil do colecionador
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/carteiras">
            <Wallet aria-hidden="true" />
            Carteiras
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={signOut} disabled={logout.isPending}>
          <LogOut aria-hidden="true" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
