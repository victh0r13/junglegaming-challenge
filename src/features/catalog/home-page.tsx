import type { CatalogSearch } from './search-params'

type HomePageProps = {
  search: CatalogSearch
}

export function HomePage({ search }: HomePageProps) {
  return (
    <section className="page-container py-10" data-search={JSON.stringify(search)}>
      <h1 className="text-2xl font-bold">Início</h1>
    </section>
  )
}
