import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_privado/carteiras')({
  head: () => ({ meta: [{ title: 'Carteiras — Kurio' }] }),
  staticData: { nav: 'inicio', tab: 'perfil', headerDivider: true },
  component: WalletsPage,
})

function WalletsPage() {
  return (
    <section className="page-container py-10">
      <h1 className="text-2xl font-bold">Carteiras</h1>
    </section>
  )
}
