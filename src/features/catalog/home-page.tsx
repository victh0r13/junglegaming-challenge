import { CatalogSection } from './catalog-section'
import { BlogSection, PromoSection } from './editorial-sections'
import { Hero } from './hero'
import type { CatalogSearch } from './search-params'

export function HomePage({ search }: { search: CatalogSearch }) {
  return (
    <>
      <Hero />
      <CatalogSection search={search} />
      <PromoSection />
      <BlogSection />
    </>
  )
}
