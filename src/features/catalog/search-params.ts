import { z } from 'zod'

export const CATALOG_TABS = ['todos', 'novos', 'alta'] as const
export const CATALOG_SORTS = ['recentes', 'preco-asc', 'preco-desc', 'nome'] as const

export type CatalogTab = (typeof CATALOG_TABS)[number]
export type CatalogSort = (typeof CATALOG_SORTS)[number]

const ethAmount = z.string().regex(/^\d+(\.\d{1,18})?$/)
const slugList = z.array(z.string().regex(/^[a-z0-9-]+$/)).max(20)

/**
 * Estado do catálogo na URL. Cada campo usa `.catch` para que valores inválidos
 * (URL editada à mão, link antigo) caiam no padrão em vez de quebrar a tela.
 */
export const catalogSearchSchema = z.object({
  busca: z.string().trim().max(80).optional().catch(undefined),
  colecoes: slugList.optional().catch(undefined),
  redes: slugList.optional().catch(undefined),
  precoMin: ethAmount.optional().catch(undefined),
  precoMax: ethAmount.optional().catch(undefined),
  aba: z.enum(CATALOG_TABS).optional().catch(undefined),
  ordem: z.enum(CATALOG_SORTS).optional().catch(undefined),
  pagina: z.number().int().min(1).max(500).optional().catch(undefined),
})

export type CatalogSearch = z.infer<typeof catalogSearchSchema>

export const CATALOG_PAGE_SIZE = 9
