import { createFileRoute } from '@tanstack/react-router'
import { OrderPage } from '@/features/orders/order-page'

export const Route = createFileRoute('/_privado/pedidos/$pedidoId')({
  head: () => ({ meta: [{ title: 'Confirmação do pedido — Kurio' }] }),
  staticData: { nav: 'mercado', tab: 'carrinho' },
  component: OrderRoute,
})

function OrderRoute() {
  const { pedidoId } = Route.useParams()
  return <OrderPage orderId={pedidoId} />
}
