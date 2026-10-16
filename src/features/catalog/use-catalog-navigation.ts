import { useNavigate } from '@tanstack/react-router'
import type { CatalogSearch } from './search-params'

function clean(search: CatalogSearch): CatalogSearch {
  return Object.fromEntries(
    Object.entries(search).filter(([, value]) => value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0)),
  ) as CatalogSearch
}

export function useCatalogNavigation(current: CatalogSearch) {
  const navigate = useNavigate()

  function update(patch: Partial<CatalogSearch>, options: { keepPage?: boolean; replace?: boolean } = {}) {
    const next = clean({ ...current, ...patch, pagina: options.keepPage ? (patch.pagina ?? current.pagina) : undefined })
    navigate({ to: '/', search: next, replace: options.replace, resetScroll: false })
  }

  function toggleInList(key: 'colecoes' | 'redes', value: string) {
    const list = current[key] ?? []
    update({ [key]: list.includes(value) ? list.filter((item) => item !== value) : [...list, value] })
  }

  function clearFilters() {
    navigate({ to: '/', search: clean({ busca: current.busca, aba: current.aba, ordem: current.ordem }), resetScroll: false })
  }

  return { update, toggleInList, clearFilters }
}
