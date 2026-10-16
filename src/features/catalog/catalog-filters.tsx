import { useState } from 'react'
import type { NftPage } from '@/api/contracts'
import { Slider } from '@/components/ui/slider'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { CatalogSearch } from './search-params'
import { useCatalogNavigation } from './use-catalog-navigation'

type CatalogFiltersProps = {
  search: CatalogSearch
  facets: NftPage['facets'] | undefined
  className?: string
  onApplied?: () => void
}

const toNumber = (value: string | undefined, fallback: number) => (value ? Number(value) : fallback)
const toEthString = (value: number) => value.toFixed(2)
const formatBr = (value: number) => value.toFixed(2).replace('.', ',')

export function CatalogFilters({ search, facets, className, onApplied }: CatalogFiltersProps) {
  const { update, toggleInList, clearFilters } = useCatalogNavigation(search)
  const min = toNumber(facets?.priceRange.min, 0)
  const max = toNumber(facets?.priceRange.max, 10)
  const hasFilters = Boolean(search.colecoes?.length || search.redes?.length || search.precoMin || search.precoMax)

  return (
    <div className={cn('flex flex-col gap-10 bg-card p-5', className)}>
      <FilterGroup
        title="Coleções"
        items={facets?.collections}
        selected={search.colecoes ?? []}
        onToggle={(id) => toggleInList('colecoes', id)}
        boldCount
      />

      <PriceFilter
        key={`${search.precoMin}-${search.precoMax}-${min}-${max}`}
        min={min}
        max={max}
        loaded={Boolean(facets)}
        initial={[toNumber(search.precoMin, min), toNumber(search.precoMax, max)]}
        onApply={([low, high]) => {
          update({ precoMin: low > min ? toEthString(low) : undefined, precoMax: high < max ? toEthString(high) : undefined })
          onApplied?.()
        }}
      />

      <FilterGroup
        title="Rede"
        items={facets?.networks}
        selected={search.redes ?? []}
        onToggle={(id) => toggleInList('redes', id)}
      />

      {hasFilters && (
        <button type="button" onClick={clearFilters} className="self-start text-sm text-text-accent underline underline-offset-4">
          Limpar filtros
        </button>
      )}
    </div>
  )
}

type PriceFilterProps = {
  min: number
  max: number
  loaded: boolean
  initial: [number, number]
  onApply: (range: [number, number]) => void
}

function PriceFilter({ min, max, loaded, initial, onApply }: PriceFilterProps) {
  const [range, setRange] = useState<[number, number]>(initial)
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-lg leading-4 font-bold">Faixa de preço</legend>
      <div className="flex flex-col gap-3 pl-3">
        {loaded ? (
          <Slider
            min={min}
            max={max}
            step={0.01}
            value={range}
            onValueChange={(value) => setRange([value[0], value[1]])}
            aria-label="Faixa de preço em ETH"
            thumbLabels={['Preço mínimo', 'Preço máximo']}
          />
        ) : (
          <Skeleton className="h-4 w-full" />
        )}
        <p className="text-[15px]" aria-live="polite">
          Preço: {formatBr(range[0])} - {formatBr(range[1])} ETH
        </p>
        <button
          type="button"
          onClick={() => onApply(range)}
          disabled={!loaded}
          className="self-start rounded-[6px] bg-primary px-3 py-2 text-base leading-5 font-bold text-primary-foreground hover:bg-primary/85 disabled:opacity-60"
        >
          Aplicar
        </button>
      </div>
    </fieldset>
  )
}

type FilterGroupProps = {
  title: string
  items: NftPage['facets']['collections'] | undefined
  selected: string[]
  onToggle: (id: string) => void
  boldCount?: boolean
}

function FilterGroup({ title, items, selected, onToggle, boldCount }: FilterGroupProps) {
  return (
    <fieldset className="flex flex-col">
      <legend className="mb-3 text-lg leading-4 font-bold">{title}</legend>
      <ul className="flex flex-col px-3">
        {items
          ? items.map((item) => {
              const checked = selected.includes(item.id)
              return (
                <li key={item.id}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-3 text-[15px] leading-10 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-ring',
                      checked ? 'text-text-accent' : 'text-text-secondary hover:text-foreground',
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <input type="checkbox" checked={checked} onChange={() => onToggle(item.id)} className="peer sr-only" />
                      <span aria-hidden="true" className={cn('size-1.5 rounded-full', checked ? 'bg-text-accent' : 'bg-transparent')} />
                      {item.label}
                    </span>
                    <span className={cn(boldCount && 'font-bold')}>
                      <span className="sr-only">, </span>({item.count})
                    </span>
                  </label>
                </li>
              )
            })
          : Array.from({ length: 4 }, (_, index) => (
              <li key={index} className="py-3">
                <Skeleton className="h-4 w-full" />
              </li>
            ))}
      </ul>
    </fieldset>
  )
}
