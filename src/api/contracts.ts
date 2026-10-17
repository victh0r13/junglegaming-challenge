import { z } from 'zod'

z.config({ jitless: true })

export const ethSchema = z.string().regex(/^\d+(\.\d{1,18})?$/, 'Valor em ETH inválido')

export const NETWORKS = ['ethereum', 'polygon', 'solana'] as const
export const networkSchema = z.enum(NETWORKS)
export type Network = z.infer<typeof networkSchema>

export const NETWORK_LABELS: Record<Network, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  solana: 'Solana',
}

export const COLLECTIONS = [
  'arte-digital',
  'fotografia',
  'musica',
  'arte-3d',
  'colecionaveis',
  'generativa',
  'jogos',
  'assinaturas',
  'utilidade',
] as const
export const collectionSchema = z.enum(COLLECTIONS)
export type Collection = z.infer<typeof collectionSchema>

export const COLLECTION_LABELS: Record<Collection, string> = {
  'arte-digital': 'Arte digital',
  fotografia: 'Fotografia',
  musica: 'Música',
  'arte-3d': 'Arte 3D',
  colecionaveis: 'Colecionáveis',
  generativa: 'Generativa',
  jogos: 'Jogos',
  assinaturas: 'Assinaturas',
  utilidade: 'Utilidade',
}

export const WALLET_TYPES = ['metamask', 'walletconnect', 'coinbase'] as const
export const walletTypeSchema = z.enum(WALLET_TYPES)
export type WalletType = z.infer<typeof walletTypeSchema>

export const WALLET_TYPE_LABELS: Record<WalletType, string> = {
  metamask: 'MetaMask',
  walletconnect: 'WalletConnect',
  coinbase: 'Coinbase Wallet',
}

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHENTICATED',
  'SESSION_EXPIRED',
  'INVALID_CREDENTIALS',
  'FORBIDDEN',
  'NOT_FOUND',
  'EMAIL_TAKEN',
  'USERNAME_TAKEN',
  'AVAILABILITY_CONFLICT',
  'EDITION_UNAVAILABLE',
  'QUANTITY_LIMIT',
  'COUPON_INVALID',
  'COUPON_EXPIRED',
  'QUOTE_OUTDATED',
  'IDEMPOTENCY_CONFLICT',
  'WALLET_REJECTED',
  'WALLET_LIMIT',
  'SERVICE_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const
export type ErrorCode = (typeof ERROR_CODES)[number]

export const apiErrorBodySchema = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    message: z.string(),
    fields: z.record(z.string(), z.string()).optional(),
  }),
})
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>

export const imageSchema = z.object({
  src: z.string(),
  alt: z.string(),
})
export type NftImage = z.infer<typeof imageSchema>

export const editionSchema = z.object({
  id: z.string(),
  label: z.string(),
  priceEth: ethSchema,
  available: z.number().int().min(0),
  supply: z.number().int().positive().nullable(),
  maxPerOrder: z.number().int().positive(),
})
export type Edition = z.infer<typeof editionSchema>

export const nftSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  tokenId: z.string(),
  collection: collectionSchema,
  network: networkSchema,
  image: imageSchema,
  priceEth: ethSchema,
  previousPriceEth: ethSchema.nullable(),
  available: z.number().int().min(0),
  badge: z.enum(['raro', 'novo']).nullable(),
  version: z.number().int().min(1),
  createdAt: z.string(),
})
export type NftSummary = z.infer<typeof nftSummarySchema>

export const nftDetailSchema = nftSummarySchema.extend({
  description: z.string(),
  details: z.array(z.string()),
  gallery: z.array(imageSchema).min(1),
  editions: z.array(editionSchema).min(1),
  attributes: z.array(z.string()),
  rating: z.number().min(0).max(5),
  reviewsCount: z.number().int().min(0),
  collectionName: z.string(),
  creator: z.string(),
  contractAddress: z.string(),
  royaltyPercent: z.number(),
})
export type NftDetail = z.infer<typeof nftDetailSchema>

const facetSchema = z.object({ id: z.string(), label: z.string(), count: z.number().int().min(0) })

export const nftPageSchema = z.object({
  items: z.array(nftSummarySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  facets: z.object({
    collections: z.array(facetSchema),
    networks: z.array(facetSchema),
    priceRange: z.object({ min: ethSchema, max: ethSchema }),
  }),
})
export type NftPage = z.infer<typeof nftPageSchema>

export const highlightsSchema = z.object({
  hero: z.array(nftSummarySchema).min(1),
  spotlight: nftSummarySchema,
})
export type Highlights = z.infer<typeof highlightsSchema>

export type NftListParams = {
  busca?: string
  colecoes?: string[]
  redes?: string[]
  precoMin?: string
  precoMax?: string
  aba?: 'todos' | 'novos' | 'alta'
  ordem?: 'recentes' | 'preco-asc' | 'preco-desc' | 'nome'
  pagina?: number
  porPagina?: number
  excluir?: string
  ids?: string[]
}

export const userSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  username: z.string(),
  email: z.email(),
  avatarUrl: z.string().nullable(),
  bio: z.string(),
  ensName: z.string(),
  walletNickname: z.string(),
})
export type User = z.infer<typeof userSchema>

export const sessionSchema = z.object({
  token: z.string(),
  expiresAt: z.string(),
})
export type Session = z.infer<typeof sessionSchema>

export const authResponseSchema = z.object({ user: userSchema, session: sessionSchema })
export type AuthResponse = z.infer<typeof authResponseSchema>

export type LoginBody = { email: string; password: string }
export type RegisterBody = { displayName?: string; username: string; email: string; password: string }
export type ProfileUpdateBody = Partial<Pick<User, 'displayName' | 'username' | 'email' | 'bio' | 'ensName' | 'walletNickname'>>
export type AvatarUpdateBody = { dataUrl: string | null }
export type PasswordChangeBody = { currentPassword: string; newPassword: string }

export const favoritesSchema = z.object({ nftIds: z.array(z.string()) })
export type Favorites = z.infer<typeof favoritesSchema>

export const CART_ITEM_STATUSES = ['ok', 'price_changed', 'insufficient', 'sold_out'] as const

export const cartItemSchema = z.object({
  id: z.string(),
  nftId: z.string(),
  editionId: z.string(),
  editionLabel: z.string(),
  name: z.string(),
  tokenId: z.string(),
  image: imageSchema,
  quantity: z.number().int().min(1),
  unitPriceEth: ethSchema,
  acknowledgedPriceEth: ethSchema,
  available: z.number().int().min(0),
  maxQuantity: z.number().int().min(0),
  status: z.enum(CART_ITEM_STATUSES),
  nftVersion: z.number().int(),
})
export type CartItem = z.infer<typeof cartItemSchema>

export const cartSchema = z.object({
  id: z.string().nullable(),
  items: z.array(cartItemSchema),
  coupon: z.object({ code: z.string(), percentOff: z.number() }).nullable(),
  version: z.number().int().min(0),
  updatedAt: z.string(),
})
export type Cart = z.infer<typeof cartSchema>

export type AddCartItemBody = { nftId: string; editionId: string; quantity: number }
export type UpdateCartItemBody = { quantity: number }

export const quoteIssueSchema = z.object({
  itemId: z.string(),
  code: z.enum(['PRICE_CHANGED', 'INSUFFICIENT', 'SOLD_OUT']),
  message: z.string(),
})
export type QuoteIssue = z.infer<typeof quoteIssueSchema>

export const quoteSchema = z.object({
  id: z.string(),
  cartVersion: z.number().int(),
  network: networkSchema,
  items: z.array(
    z.object({
      itemId: z.string(),
      nftId: z.string(),
      editionId: z.string(),
      quantity: z.number().int().min(1),
      unitPriceEth: ethSchema,
      lineTotalEth: ethSchema,
    }),
  ),
  coupon: z.string().nullable(),
  subtotalEth: ethSchema,
  discountEth: ethSchema,
  networkFeeEth: ethSchema,
  totalEth: ethSchema,
  issues: z.array(quoteIssueSchema),
  createdAt: z.string(),
  expiresAt: z.string(),
})
export type Quote = z.infer<typeof quoteSchema>

export const walletSchema = z.object({
  id: z.string(),
  role: z.enum(['primary', 'secondary']),
  label: z.string(),
  type: walletTypeSchema,
  network: networkSchema,
  address: z.string(),
  secondaryRef: z.string().nullable(),
  displayName: z.string(),
  profileName: z.string(),
  email: z.string(),
  referralCode: z.string(),
  ensName: z.string(),
  updatedAt: z.string(),
})
export type Wallet = z.infer<typeof walletSchema>
export const walletListSchema = z.object({ items: z.array(walletSchema) })

export type WalletBody = Omit<Wallet, 'id' | 'updatedAt' | 'secondaryRef'> & { secondaryRef?: string | null }

export const walletConnectionSchema = z.object({
  walletId: z.string(),
  status: z.literal('connected'),
  connectedAt: z.string(),
})
export type WalletConnection = z.infer<typeof walletConnectionSchema>

export const ORDER_STATUSES = ['pending', 'confirmed', 'declined'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const orderSchema = z.object({
  id: z.string(),
  status: z.enum(ORDER_STATUSES),
  version: z.number().int().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  quoteId: z.string(),
  network: networkSchema,
  wallet: z.object({ id: z.string(), label: z.string(), type: walletTypeSchema, address: z.string() }),
  collector: z.object({
    displayName: z.string(),
    username: z.string(),
    profileName: z.string(),
    email: z.string(),
    ensName: z.string(),
    referralCode: z.string(),
    note: z.string(),
  }),
  items: z.array(
    z.object({
      nftId: z.string(),
      editionId: z.string(),
      editionLabel: z.string(),
      name: z.string(),
      tokenId: z.string(),
      image: imageSchema,
      quantity: z.number().int().min(1),
      unitPriceEth: ethSchema,
      lineTotalEth: ethSchema,
    }),
  ),
  coupon: z.string().nullable(),
  subtotalEth: ethSchema,
  discountEth: ethSchema,
  networkFeeEth: ethSchema,
  totalEth: ethSchema,
  transaction: z.object({ hash: z.string(), explorerUrl: z.string() }).nullable(),
  failureReason: z.string().nullable(),
})
export type Order = z.infer<typeof orderSchema>

export type CreateOrderBody = {
  quoteId: string
  walletId: string
  network: Network
  collector: {
    displayName: string
    username: string
    profileName: string
    email: string
    ensName: string
    referralCode: string
    note: string
  }
}

export const nftUpdatedEventSchema = z.object({
  eventId: z.string(),
  type: z.literal('nft.updated'),
  resource: z.object({ type: z.literal('nft'), id: z.string() }),
  version: z.number().int(),
  occurredAt: z.string(),
  data: z.object({
    priceEth: ethSchema,
    available: z.number().int().min(0),
    editions: z.array(editionSchema.pick({ id: true, priceEth: true, available: true })),
  }),
})
export type NftUpdatedEvent = z.infer<typeof nftUpdatedEventSchema>

export const orderUpdatedEventSchema = z.object({
  eventId: z.string(),
  type: z.literal('order.updated'),
  resource: z.object({ type: z.literal('order'), id: z.string() }),
  version: z.number().int(),
  occurredAt: z.string(),
  data: z.object({ status: z.enum(ORDER_STATUSES), userId: z.string() }),
})
export type OrderUpdatedEvent = z.infer<typeof orderUpdatedEventSchema>
