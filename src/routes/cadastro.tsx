import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

export const Route = createFileRoute('/cadastro')({
  validateSearch: z.object({ redirect: z.string().startsWith('/').optional().catch(undefined) }),
  head: () => ({ meta: [{ title: 'Criar conta — Kurio' }] }),
  staticData: { nav: 'inicio', tab: 'perfil', headerDivider: true },
  component: RegisterPage,
})

function RegisterPage() {
  return (
    <section className="page-container py-10">
      <h1 className="text-2xl font-bold">Criar conta</h1>
    </section>
  )
}
