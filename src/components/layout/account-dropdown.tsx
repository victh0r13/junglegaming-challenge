import { Link, useNavigate } from '@tanstack/react-router'
import { LogOut, User as UserIcon, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import type { User } from '@/api/contracts'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useLogout } from '@/features/auth/use-auth'
import { UserAvatar } from './account-menu'

export default function AccountDropdown({ user }: { user: User | undefined }) {
  const logout = useLogout()
  const navigate = useNavigate()

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
