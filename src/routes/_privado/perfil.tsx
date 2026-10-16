import { createFileRoute } from '@tanstack/react-router'
import { ProfilePage } from '@/features/account/profile-page'

export const Route = createFileRoute('/_privado/perfil')({
  head: () => ({ meta: [{ title: 'Perfil do colecionador — Kurio' }] }),
  staticData: { nav: 'inicio', tab: 'perfil', headerDivider: true },
  component: ProfilePage,
})
