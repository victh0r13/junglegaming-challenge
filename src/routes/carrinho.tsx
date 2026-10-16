import { createFileRoute } from '@tanstack/react-router'
import { CartPage } from '@/features/cart/cart-page'

export const Route = createFileRoute('/carrinho')({
  head: () => ({ meta: [{ title: 'Carrinho — Kurio' }] }),
  staticData: { nav: 'mercado', tab: 'carrinho', hideTabBar: true },
  component: CartPage,
})
