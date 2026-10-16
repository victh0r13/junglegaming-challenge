import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '@/features/catalog/home-page'
import { catalogSearchSchema } from '@/features/catalog/search-params'

export const Route = createFileRoute('/')({
  validateSearch: catalogSearchSchema,
  staticData: { nav: 'inicio', tab: 'inicio', headerDivider: true },
  component: HomeRoute,
})

function HomeRoute() {
  return <HomePage search={Route.useSearch()} />
}
