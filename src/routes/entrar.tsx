import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthDialog } from '@/features/auth/auth-dialog'
import { authSearchSchema } from '@/features/auth/auth-search'
import { sessionStore } from '@/features/auth/session-store'
import { safeRedirect } from '@/features/auth/use-auth'
import { HomePage } from '@/features/catalog/home-page'

export const Route = createFileRoute('/entrar')({
  validateSearch: authSearchSchema,
  beforeLoad: ({ search }) => {
    if (sessionStore.getToken()) throw redirect({ href: safeRedirect(search.redirect) })
  },
  head: () => ({ meta: [{ title: 'Entrar — Kurio' }] }),
  staticData: { nav: 'inicio', tab: 'perfil', headerDivider: true },
  component: LoginPage,
})

function LoginPage() {
  const { redirect: target, motivo } = Route.useSearch()
  return (
    <>
      <HomePage search={{}} />
      <AuthDialog mode="login" redirect={target} reason={motivo} />
    </>
  )
}
