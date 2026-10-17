import { createFileRoute } from '@tanstack/react-router'
import { CheckoutPage } from '@/features/checkout/checkout-page'

export const Route = createFileRoute('/_privado/pagamento')({
  head: () => ({ meta: [{ title: 'Pagamento — Kurio' }, { name: 'description', content: 'Confirme seus dados de colecionador, conecte a carteira e finalize a compra.' }] }),
  staticData: { nav: 'mercado', tab: 'carrinho', hideTabBar: true },
  component: CheckoutPage,
})
