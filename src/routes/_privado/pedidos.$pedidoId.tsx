import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_privado/pedidos/$pedidoId')({
  head: () => ({ meta: [{ title: 'Pedido — Kurio' }] }),
  staticData: { nav: 'mercado', tab: 'carrinho' },
  component: OrderPage,
})

function OrderPage() {
  const { pedidoId } = Route.useParams()
  return (
    <section className="page-container py-10">
      <h1 className="text-2xl font-bold">Pedido {pedidoId}</h1>
    </section>
  )
}
