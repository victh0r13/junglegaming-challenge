import { COLLECTIONS, NETWORKS, type Edition, type NftDetail } from '@/api/contracts'
import { formatEth, multiplyEth } from '@/lib/eth'

type ArtFamily = 'emerald-ape' | 'sage-nomad' | 'ivory-baron' | 'golden-beat'

const ART_ALT: Record<ArtFamily, string> = {
  'emerald-ape': 'Ilustração de um macaco marrom com óculos escuros redondos e jaqueta college verde',
  'sage-nomad': 'Ilustração de um gorila cinza com chapéu bucket verde-claro e moletom lilás',
  'ivory-baron': 'Ilustração de um gorila preto com gola alta verde e blazer bege',
  'golden-beat': 'Ilustração de um orangotango dourado com fones de ouvido verdes e jaqueta clara',
}

const FAMILIES = Object.keys(ART_ALT) as ArtFamily[]

const FIGMA_ITEMS: { name: string; tokenId: string; family: ArtFamily; price: string; previous?: string }[] = [
  { name: 'Emerald Ape #042', tokenId: '0042', family: 'emerald-ape', price: '1.19' },
  { name: 'Sage Nomad #009', tokenId: '0009', family: 'sage-nomad', price: '1.69' },
  { name: 'Neon Vessel #552', tokenId: '0552', family: 'ivory-baron', price: '1.99', previous: '2.29' },
  { name: 'Cosmic Bloom #118', tokenId: '0118', family: 'sage-nomad', price: '1.29' },
  { name: 'Violet Nomad #314', tokenId: '0314', family: 'sage-nomad', price: '1.39' },
  { name: 'Ivory Baron #088', tokenId: '0088', family: 'ivory-baron', price: '1.79' },
  { name: 'Golden Beat #207', tokenId: '0207', family: 'golden-beat', price: '0.99' },
  { name: 'Golden Signal #160', tokenId: '0160', family: 'golden-beat', price: '0.39' },
]

const GENERATED_NAMES: [string, ArtFamily][] = [
  ['Amber Monk', 'emerald-ape'],
  ['Jade Rider', 'emerald-ape'],
  ['Velvet Sage', 'sage-nomad'],
  ['Copper Muse', 'golden-beat'],
  ['Obsidian Duke', 'ivory-baron'],
  ['Solar Drifter', 'golden-beat'],
  ['Mint Crown', 'emerald-ape'],
  ['Lilac Wanderer', 'sage-nomad'],
  ['Onyx Patron', 'ivory-baron'],
  ['Honey Pulse', 'golden-beat'],
  ['Forest Dandy', 'emerald-ape'],
  ['Misty Pilgrim', 'sage-nomad'],
  ['Midnight Regent', 'ivory-baron'],
  ['Sunlit Echo', 'golden-beat'],
  ['Laurel Scout', 'emerald-ape'],
  ['Pearl Hermit', 'sage-nomad'],
  ['Graphite Count', 'ivory-baron'],
  ['Saffron Tune', 'golden-beat'],
  ['Moss Captain', 'emerald-ape'],
  ['Cloud Seeker', 'sage-nomad'],
  ['Ebony Marquis', 'ivory-baron'],
  ['Citrus Groove', 'golden-beat'],
  ['Clover Baron', 'emerald-ape'],
  ['Haze Nomad', 'sage-nomad'],
  ['Slate Envoy', 'ivory-baron'],
  ['Brass Melody', 'golden-beat'],
  ['Fern Voyager', 'emerald-ape'],
  ['Dusk Sage', 'sage-nomad'],
  ['Ink Chancellor', 'ivory-baron'],
  ['Marigold Wave', 'golden-beat'],
  ['Emerald Oracle', 'emerald-ape'],
  ['Lavender Monk', 'sage-nomad'],
  ['Charcoal Knight', 'ivory-baron'],
  ['Topaz Rhythm', 'golden-beat'],
  ['Olive Sentinel', 'emerald-ape'],
  ['Violet Sage', 'sage-nomad'],
  ['Shadow Consul', 'ivory-baron'],
]

const NEWEST_DATE = Date.UTC(2026, 8, 30, 12)
const DAY = 86_400_000
export const NEW_RELEASE_WINDOW_DAYS = 14

export function isNewRelease(createdAt: string, newest: number) {
  return newest - Date.parse(createdAt) <= NEW_RELEASE_WINDOW_DAYS * DAY
}

function editionsFor(index: number, basePrice: string): Edition[] {
  return [
    { id: '1-1', label: '1/1', priceEth: multiplyEth(basePrice, 4), available: index % 4 === 1 ? 0 : 1, supply: 1, maxPerOrder: 1 },
    { id: '1-10', label: '1/10', priceEth: multiplyEth(basePrice, 2), available: (index * 3) % 10, supply: 10, maxPerOrder: 2 },
    { id: '1-50', label: '1/50', priceEth: basePrice, available: 5 + ((index * 7) % 36), supply: 50, maxPerOrder: 5 },
    { id: 'aberta', label: 'ABERTA', priceEth: basePrice, available: 999, supply: null, maxPerOrder: 10 },
  ]
}

export type SeedNft = NftDetail & { trending: number }

export function createNftFixtures(): SeedNft[] {
  const items = [
    ...FIGMA_ITEMS,
    ...GENERATED_NAMES.map(([name, family], i) => {
      const tokenNumber = String(600 + i * 13).padStart(4, '0')
      const cents = 9 + ((i * 37) % 300)
      return { name: `${name} #${tokenNumber.slice(1)}`, tokenId: tokenNumber, family, price: formatEth(String(cents / 100)) }
    }),
  ]

  return items.map((item, index): SeedNft => {
    const editions = editionsFor(index, item.price)
    const createdAt = new Date(NEWEST_DATE - index * 2 * DAY).toISOString()
    const id = item.name
      .toLowerCase()
      .replace(/#/g, '')
      .trim()
      .replace(/\s+/g, '-')
    const collection = index === 0 ? 'arte-digital' : COLLECTIONS[(index * 5) % COLLECTIONS.length]
    const network = index < 8 ? 'ethereum' : NETWORKS[index % NETWORKS.length]
    const otherFamilies = FAMILIES.filter((family) => family !== item.family)
    const gallery = [item.family, ...otherFamilies].map((family, i) => ({
      src: `/nfts/${family}`,
      alt: i === 0 ? `${item.name}: ${ART_ALT[family]}` : `Variação da coleção: ${ART_ALT[family]}`,
    }))

    return {
      id,
      name: item.name,
      tokenId: `#${item.tokenId}`,
      collection,
      network,
      image: gallery[0],
      priceEth: item.price,
      previousPriceEth: 'previous' in item && typeof item.previous === 'string' ? item.previous : null,
      available: editions.reduce((sum, edition) => sum + edition.available, 0),
      badge: isNewRelease(createdAt, NEWEST_DATE) ? 'novo' : index % 7 === 3 ? 'raro' : null,
      version: 1,
      createdAt,
      description:
        'Um colecionável digital finalizado à mão da coleção Kurio Editions, verificado na Ethereum, com arte desbloqueável e acesso para colecionadores.',
      details: [
        `${item.name} é uma obra digital finalizada à mão da coleção Kurio Editions. Cada atributo fica armazenado nos metadados do token e verificado na rede. A obra explora identidade, movimento e luz em um mundo digital sem fronteiras.`,
        'A propriedade inclui a arte em alta resolução, lançamentos exclusivos para colecionadores e um registro permanente de procedência. O criador recebe 5% de direitos autorais nas vendas secundárias, apoiando novos trabalhos e lançamentos da comunidade.',
      ],
      gallery,
      editions,
      attributes: ['Óculos', 'Esmeralda', 'Raro', 'Fones', 'Chapéu', 'Gola alta'].filter((_, i) => (index + i) % 2 === 0).slice(0, 3),
      rating: 4 + ((index * 3) % 10) / 10,
      reviewsCount: 5 + ((index * 11) % 40),
      collectionName: 'Kurio Apes',
      creator: ['Nova Sato', 'Iris Moreau', 'Kai Duarte', 'Lua Ferraz'][index % 4],
      contractAddress: `0x7A42${(index * 2654435761).toString(16).slice(0, 4).toUpperCase().padStart(4, '0')}...19E8`,
      royaltyPercent: 5,
      trending: (index * 53) % 100,
    }
  })
}
