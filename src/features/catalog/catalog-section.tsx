import { useEffect, useId, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react'
import { getErrorMessage } from '@/api/http'
import { NftCard, NftCardSkeleton } from '@/components/nft/nft-card'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { CatalogFilters } from './catalog-filters'
import { nftListQuery, toListParams } from './queries'
import { CATALOG_PAGE_SIZE, CATALOG_SORTS, CATALOG_TABS, type CatalogSearch, type CatalogSort, type CatalogTab } from './search-params'
import { SpotlightBanner } from './spotlight-banner'
import { useCatalogNavigation } from './use-catalog-navigation'

const TAB_LABELS: Record<CatalogTab, string> = { todos: 'Todos os NFTs', novos: 'Novos lançamentos', alta: 'Em alta' }
const SORT_LABELS: Record<CatalogSort, string> = {
  recentes: 'Listados recentemente',
  'preco-asc': 'Menor preço',
  'preco-desc': 'Maior preço',
  nome: 'Nome (A–Z)',
}

export function CatalogSection({ search }: { search: CatalogSearch }) {
  const params = toListParams(search)
  const query = useQuery(nftListQuery(params))
  const { update } = useCatalogNavigation(search)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const headingId = useId()
  const resultsRef = useRef<HTMLDivElement>(null)

  const data = query.data
  const isInitialLoading = query.isPending
  const isRefreshing = query.isFetching && !query.isPending
  const page = search.pagina ?? 1
  const activeFilterCount = (search.colecoes?.length ?? 0) + (search.redes?.length ?? 0) + (search.precoMin || search.precoMax ? 1 : 0)

  useEffect(() => {
    if (data && page > data.totalPages && data.totalPages > 0) update({ pagina: data.totalPages }, { keepPage: true, replace: true })
  }, [data, page, update])

  function goToPage(next: number) {
    update({ pagina: next === 1 ? undefined : next }, { keepPage: true })
    resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section id="catalogo" aria-labelledby={headingId} className="page-container mt-4 scroll-mt-6 md:mt-24">
      <h2 id={headingId} className="sr-only">
        Catálogo de NFTs
      </h2>

      <div className="flex gap-12">
        <aside className="hidden w-[310px] shrink-0 flex-col gap-6 lg:flex" aria-label="Filtros do catálogo">
          <CatalogFilters search={search} facets={data?.facets} />
          <SpotlightBanner />
        </aside>

        <div ref={resultsRef} className="flex min-w-0 flex-1 scroll-mt-6 flex-col gap-8">
          <div className="flex gap-3">
            <SearchBox value={search.busca ?? ''} onSearch={(busca) => update({ busca: busca || undefined }, { replace: true })} />
            <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
              <SheetTrigger
                className="relative grid size-[45px] shrink-0 place-items-center rounded-[10px] bg-linear-to-b from-primary/40 to-primary text-foreground lg:hidden"
                aria-label={activeFilterCount ? `Filtros, ${activeFilterCount} ativos` : 'Filtros'}
              >
                <SlidersHorizontal className="size-5" aria-hidden="true" />
                {activeFilterCount > 0 && (
                  <span aria-hidden="true" className="absolute -top-1 -right-1 grid size-5 place-items-center rounded-full bg-text-accent text-[10px] font-bold text-ink">
                    {activeFilterCount}
                  </span>
                )}
              </SheetTrigger>
              <SheetContent side="left" className="w-[min(340px,90vw)] overflow-y-auto border-border bg-background p-0">
                <SheetHeader className="px-5 pt-5">
                  <SheetTitle>Filtros</SheetTitle>
                  <SheetDescription>Os resultados são atualizados ao selecionar.</SheetDescription>
                </SheetHeader>
                <CatalogFilters search={search} facets={data?.facets} onApplied={() => setFiltersOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <nav aria-label="Seções do catálogo" className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
              <ul className="flex gap-3 text-sm leading-4 font-medium whitespace-nowrap sm:gap-5 sm:text-[15px]">
                {CATALOG_TABS.map((tab) => {
                  const active = (search.aba ?? 'todos') === tab
                  return (
                    <li key={tab}>
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => update({ aba: tab === 'todos' ? undefined : tab })}
                        className={cn(
                          'border-b-2 pb-1.5 transition-colors',
                          active ? 'border-primary text-text-accent' : 'border-transparent text-foreground hover:text-text-accent',
                        )}
                      >
                        {TAB_LABELS[tab]}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </nav>
            <SortSelect value={search.ordem ?? 'recentes'} onChange={(ordem) => update({ ordem: ordem === 'recentes' ? undefined : ordem })} />
          </div>

          <p className="sr-only" role="status" aria-live="polite">
            {isInitialLoading ? 'Carregando NFTs' : data ? `${data.total} NFTs encontrados. Página ${data.page} de ${Math.max(1, data.totalPages)}.` : ''}
          </p>

          {query.isError && !data ? (
            <CatalogError message={getErrorMessage(query.error)} onRetry={() => query.refetch()} retrying={query.isFetching} />
          ) : data && data.items.length === 0 ? (
            <EmptyState hasFilters={activeFilterCount > 0 || Boolean(search.busca)} search={search} />
          ) : (
            <div
              aria-busy={isInitialLoading || isRefreshing}
              className={cn(
                'grid grid-cols-2 gap-x-4 gap-y-10 transition-opacity md:grid-cols-3 md:gap-x-6 md:gap-y-[72px] xl:gap-x-[34px]',
                isRefreshing && 'opacity-60',
              )}
            >
              {isInitialLoading
                ? Array.from({ length: CATALOG_PAGE_SIZE }, (_, index) => <NftCardSkeleton key={index} />)
                : data?.items.map((nft, index) => <NftCard key={nft.id} nft={nft} priority={index < 3} />)}
            </div>
          )}

          {data && data.totalPages > 1 && <Pagination page={page} totalPages={data.totalPages} onChange={goToPage} />}
        </div>
      </div>
    </section>
  )
}

function SearchBox({ value, onSearch }: { value: string; onSearch: (value: string) => void }) {
  const [state, setState] = useState({ draft: value, base: value })
  const id = useId()
  if (state.base !== value) setState({ draft: value, base: value })
  const draft = state.base === value ? state.draft : value
  const setDraft = (next: string) => setState({ draft: next, base: value })

  useEffect(() => {
    if (draft.trim() === value) return
    const timer = window.setTimeout(() => onSearch(draft.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [draft, value, onSearch])

  return (
    <form role="search" className="relative flex-1" onSubmit={(event) => (event.preventDefault(), onSearch(draft.trim()))}>
      <label htmlFor={id} className="sr-only">
        Buscar NFTs
      </label>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
      <input
        id={id}
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Explorar coleções"
        autoComplete="off"
        className="h-[45px] w-full rounded-[10px] bg-card pr-3 pl-11 text-[15px] font-bold text-foreground placeholder:text-text-secondary focus-visible:outline-2 focus-visible:outline-ring md:font-normal"
      />
    </form>
  )
}

function SortSelect({ value, onChange }: { value: CatalogSort; onChange: (value: CatalogSort) => void }) {
  const id = useId()
  return (
    <div className="flex items-center gap-2 text-[15px]">
      <label htmlFor={id}>Ordenar por:</label>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value as CatalogSort)}
          className="appearance-none bg-transparent pr-6 text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          {CATALOG_SORTS.map((sort) => (
            <option key={sort} value={sort} className="bg-card">
              {SORT_LABELS[sort]}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-0 size-4 -translate-y-1/2" aria-hidden="true" />
      </div>
    </div>
  )
}

function Pagination({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).filter(
    (candidate) => candidate === 1 || candidate === totalPages || Math.abs(candidate - page) <= 1,
  )
  const itemClass = 'grid size-[35px] place-items-center rounded-[4px] border border-border text-lg leading-4 transition-colors'

  return (
    <nav aria-label="Paginação" className="flex justify-end">
      <ul className="flex items-center gap-2">
        <li>
          <button type="button" className={cn(itemClass, 'disabled:opacity-40')} onClick={() => onChange(page - 1)} disabled={page <= 1} aria-label="Página anterior">
            <ChevronLeft className="size-[18px]" aria-hidden="true" />
          </button>
        </li>
        {pages.map((candidate, index) => (
          <li key={candidate} className="flex items-center gap-2">
            {index > 0 && candidate - pages[index - 1] > 1 && (
              <span aria-hidden="true" className="text-text-secondary">
                …
              </span>
            )}
            <button
              type="button"
              onClick={() => onChange(candidate)}
              aria-current={candidate === page ? 'page' : undefined}
              aria-label={`Página ${candidate}`}
              className={cn(itemClass, candidate === page ? 'border-primary bg-primary font-bold text-primary-foreground' : 'hover:border-primary')}
            >
              {candidate}
            </button>
          </li>
        ))}
        <li>
          <button type="button" className={cn(itemClass, 'disabled:opacity-40')} onClick={() => onChange(page + 1)} disabled={page >= totalPages} aria-label="Próxima página">
            <ChevronRight className="size-[18px]" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </nav>
  )
}

function EmptyState({ hasFilters, search }: { hasFilters: boolean; search: CatalogSearch }) {
  const { clearFilters, update } = useCatalogNavigation(search)
  return (
    <div className="flex flex-col items-start gap-3 rounded-[6px] bg-card p-8">
      <p className="text-lg font-bold">Nenhum NFT encontrado</p>
      <p className="text-sm leading-6 text-text-secondary">
        {hasFilters ? 'Tente remover alguns filtros ou buscar por outro termo.' : 'Ainda não há NFTs listados nesta seção.'}
      </p>
      {hasFilters && (
        <button
          type="button"
          onClick={() => (search.busca ? update({ busca: undefined }) : clearFilters())}
          className="rounded-[6px] bg-primary px-4 py-2 font-bold text-primary-foreground"
        >
          {search.busca ? 'Limpar busca' : 'Limpar filtros'}
        </button>
      )}
    </div>
  )
}

function CatalogError({ message, onRetry, retrying }: { message: string; onRetry: () => void; retrying: boolean }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-[6px] border border-destructive/50 bg-card p-8">
      <p className="text-lg font-bold">Não foi possível carregar o catálogo</p>
      <p className="text-sm leading-6 text-text-secondary">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="rounded-[6px] bg-primary px-4 py-2 font-bold text-primary-foreground disabled:opacity-60"
      >
        {retrying ? 'Tentando…' : 'Tentar novamente'}
      </button>
    </div>
  )
}
