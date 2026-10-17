import { createFileRoute } from '@tanstack/react-router'
import { CartPage } from '@/features/cart/cart-page'

export const Route = createFileRoute('/carrinho')({
  head: () => ({ meta: [{ title: 'Carrinho — Kurio' }, { name: 'description', content: 'Revise os NFTs do seu carrinho, aplique cupons e confira o total antes de finalizar.' }] }),
  staticData: { nav: 'mercado', tab: 'carrinho', hideTabBar: true },
  component: CartPage,
})
