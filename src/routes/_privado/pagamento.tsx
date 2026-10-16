import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_privado/pagamento')({
  head: () => ({ meta: [{ title: 'Pagamento — Kurio' }] }),
  staticData: { nav: 'mercado', tab: 'carrinho' },
  component: CheckoutPage,
})

function CheckoutPage() {
  return (
    <section className="page-container py-10">
      <h1 className="text-2xl font-bold">Pagamento</h1>
    </section>
  )
}
