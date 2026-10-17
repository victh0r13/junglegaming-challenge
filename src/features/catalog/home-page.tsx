import { BREAKPOINTS, useMediaQuery } from '@/lib/use-media-query'
import { CatalogSection } from './catalog-section'
import { BlogSection, PromoSection } from './editorial-sections'
import { Hero } from './hero'
import type { CatalogSearch } from './search-params'

export function HomePage({ search }: { search: CatalogSearch }) {
  const isDesktop = useMediaQuery(BREAKPOINTS.md)

  return (
    <>
      <Hero />
      <CatalogSection search={search} />
      {isDesktop && <PromoSection />}
      {isDesktop && <BlogSection />}
    </>
  )
}
