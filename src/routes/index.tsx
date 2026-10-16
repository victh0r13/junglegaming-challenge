import { createFileRoute } from '@tanstack/react-router'
import { catalogSearchSchema } from '@/features/catalog/search-params'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  staticData: { nav: 'inicio', tab: 'inicio', headerDivider: true },
  component: HomePage,
})

function HomePage() {
  return (
    <section className="page-container py-10">
      <h1 className="text-2xl font-bold">Início</h1>
    </section>
  )
}
