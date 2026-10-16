import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

export const Route = createFileRoute('/entrar')({
  validateSearch: z.object({ redirect: z.string().startsWith('/').optional().catch(undefined) }),
  head: () => ({ meta: [{ title: 'Entrar — Kurio' }] }),
  staticData: { nav: 'inicio', tab: 'perfil', headerDivider: true },
  component: LoginPage,
})

function LoginPage() {
  return (
    <section className="page-container py-10">
      <h1 className="text-2xl font-bold">Entrar</h1>
    </section>
  )
}
