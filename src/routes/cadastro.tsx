import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthDialog } from '@/features/auth/auth-dialog'
import { authSearchSchema } from '@/features/auth/auth-search'
import { sessionStore } from '@/features/auth/session-store'
import { safeRedirect } from '@/features/auth/use-auth'
import { HomePage } from '@/features/catalog/home-page'

export const Route = createFileRoute('/cadastro')({
  validateSearch: authSearchSchema,
  beforeLoad: ({ search }) => {
    if (sessionStore.getToken()) throw redirect({ href: safeRedirect(search.redirect) })
  },
  head: () => ({ meta: [{ title: 'Criar conta — Kurio' }, { name: 'description', content: 'Crie seu perfil de colecionador na Kurio e conecte uma carteira quando quiser.' }] }),
  staticData: { nav: 'inicio', tab: 'perfil', headerDivider: true },
  component: RegisterPage,
})

function RegisterPage() {
  const { redirect: target } = Route.useSearch()
  return (
    <>
      <HomePage search={{}} />
      <AuthDialog mode="register" redirect={target} />
    </>
  )
}
