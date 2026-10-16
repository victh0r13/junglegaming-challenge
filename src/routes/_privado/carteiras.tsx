import { createFileRoute } from '@tanstack/react-router'
import { WalletsPage } from '@/features/account/wallets-page'

export const Route = createFileRoute('/_privado/carteiras')({
  head: () => ({ meta: [{ title: 'Carteiras — Kurio' }] }),
  staticData: { nav: 'inicio', tab: 'perfil', headerDivider: true },
  component: WalletsPage,
})
