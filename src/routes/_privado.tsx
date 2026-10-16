import { Outlet, createFileRoute } from '@tanstack/react-router'

/** Rota de layout sem caminho que agrupa as telas que exigem autenticação. */
export const Route = createFileRoute('/_privado')({
  component: Outlet,
})
