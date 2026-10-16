import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { sessionStore } from '@/features/auth/session-store'

export const Route = createFileRoute('/_privado')({
  beforeLoad: ({ location }) => {
    if (!sessionStore.getToken()) {
      const expired = sessionStore.getState().status === 'expired'
      throw redirect({ to: '/entrar', search: { redirect: location.href, motivo: expired ? 'expirada' : undefined } })
    }
  },
  component: Outlet,
})
