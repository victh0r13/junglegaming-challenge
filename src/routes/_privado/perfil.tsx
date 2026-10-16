import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_privado/perfil')({
  head: () => ({ meta: [{ title: 'Perfil do colecionador — Kurio' }] }),
  staticData: { nav: 'inicio', tab: 'perfil', headerDivider: true },
  component: ProfilePage,
})

function ProfilePage() {
  return (
    <section className="page-container py-10">
      <h1 className="text-2xl font-bold">Perfil do colecionador</h1>
    </section>
  )
}
