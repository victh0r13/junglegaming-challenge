import { Suspense, lazy } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import type { User } from '@/api/contracts'
import { LoginIcon } from '@/components/icons'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/use-auth'
import { cn } from '@/lib/utils'

const AccountDropdown = lazy(() => import('./account-dropdown'))

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

  return (
    <Suspense fallback={<span className="h-[35px] w-[100px] rounded-[6px] border border-border-soft" aria-hidden="true" />}>
      <AccountDropdown user={user} />
    </Suspense>
  )
}
