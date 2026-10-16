import { storage } from '@/lib/storage'

export const SCENARIOS = {
  padrao: { label: 'Padrão', description: 'Tudo funciona com latência curta.' },
  lento: { label: 'Rede lenta', description: 'Todas as respostas levam 2,5 s (exibe os skeletons).' },
  'latencia-variavel': { label: 'Latência variável', description: 'Atrasos entre 100 ms e 1,8 s com semente fixa.' },
  'fora-de-ordem': {
    label: 'Respostas fora de ordem',
    description: 'Buscas antigas do catálogo respondem depois das novas.',
  },
  offline: { label: 'Sem conexão', description: 'Toda requisição à API falha por rede.' },
  'erro-servidor': {
    label: 'Erro 503 no catálogo',
    description: 'As 3 primeiras consultas do catálogo e do detalhe falham; a seguinte funciona.',
  },
  'catalogo-vazio': { label: 'Catálogo vazio', description: 'A listagem de NFTs não retorna resultados.' },
  'sessao-curta': { label: 'Sessão curta', description: 'A sessão expira 30 s após o login.' },
  'falha-favoritos': { label: 'Falha nos favoritos', description: 'Adicionar ou remover favorito retorna 500.' },
  'preco-alterado': {
    label: 'Preço alterado na compra',
    description: 'Ao confirmar, o preço do primeiro item sobe e o pedido exige nova revisão.',
  },
  'edicao-esgotada': {
    label: 'Edição esgotada na compra',
    description: 'Ao confirmar, a edição do primeiro item esgota.',
  },
  'timeout-pedido': {
    label: 'Timeout após criar pedido',
    description: 'O pedido é criado, mas a resposta só chega depois do timeout do cliente.',
  },
  'pagamento-recusado': { label: 'Pagamento recusado', description: 'Pedidos terminam recusados.' },
  'confirmacao-lenta': {
    label: 'Confirmação lenta',
    description: 'Pedidos ficam pendentes por 20 s (teste de refresh e reconexão).',
  },
  'carteira-recusada': { label: 'Carteira recusa conexão', description: 'A carteira recusa a solicitação de conexão.' },
} as const

export type ScenarioId = keyof typeof SCENARIOS

const STORAGE_KEY = 'kurio:mock-scenario'

export function isScenarioId(value: unknown): value is ScenarioId {
  return typeof value === 'string' && value in SCENARIOS
}

function readInitialScenario(): ScenarioId {
  const fromUrl = new URLSearchParams(window.location.search).get('cenario')
  if (isScenarioId(fromUrl)) {
    storage.set(STORAGE_KEY, fromUrl)
    return fromUrl
  }
  const saved = storage.get<string>(STORAGE_KEY)
  return isScenarioId(saved) ? saved : 'padrao'
}

let current: ScenarioId = readInitialScenario()

export const scenario = {
  get: () => current,
  is: (id: ScenarioId) => current === id,
  set(id: ScenarioId) {
    current = id
    storage.set(STORAGE_KEY, id)
  },
}

export function createRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
