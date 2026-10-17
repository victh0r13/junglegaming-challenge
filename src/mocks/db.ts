import type { Order, Quote, User, Wallet } from '@/api/contracts'
import { storage } from '@/lib/storage'
import { createNftFixtures, type SeedNft } from './fixtures/nfts'

export type DbUser = User & { passwordHash: string; salt: string }
export type DbSession = { token: string; userId: string; expiresAt: number }
export type DbCartItem = { id: string; nftId: string; editionId: string; quantity: number; acknowledgedPriceEth: string }
export type DbCart = {
  id: string
  ownerId: string | null
  items: DbCartItem[]
  coupon: string | null
  version: number
  updatedAt: string
}
export type DbQuote = Quote & { cartId: string | null }
export type DbOrder = Order & {
  userId: string
  idempotencyKey: string
  requestHash: string
  settlesAt: number
  outcome: 'confirmed' | 'declined'
}
export type DbWallet = Wallet & { userId: string }

export type DbState = {
  schema: 4
  seq: number
  users: DbUser[]
  sessions: DbSession[]
  nfts: SeedNft[]
  favorites: Record<string, string[]>
  carts: Record<string, DbCart>
  quotes: Record<string, DbQuote>
  orders: Record<string, DbOrder>
  wallets: DbWallet[]
  idempotency: Record<string, string>
  connectedWallets: Record<string, string>
  triggered: Record<string, boolean>
}

const STORAGE_KEY = 'kurio:mock-db'

export const SEED_USERS = [
  {
    id: 'usr_ana',
    displayName: 'Ana Souza',
    username: 'ana.souza',
    email: 'ana@kurio.dev',
    password: 'Kurio@2026',
    bio: 'Coleciono arte generativa e retratos digitais.',
    ensName: 'anasouza.eth',
    walletNickname: 'Cofre da Ana',
  },
  {
    id: 'usr_bruno',
    displayName: 'Bruno Lima',
    username: 'bruno.lima',
    email: 'bruno@kurio.dev',
    password: 'Kurio@2026',
    bio: '',
    ensName: 'brunolima.eth',
    walletNickname: 'Carteira do Bruno',
  },
] as const

export async function hashPassword(password: string, salt: string) {
  const data = new TextEncoder().encode(`${salt}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function createSeed(): Promise<DbState> {
  const users: DbUser[] = await Promise.all(
    SEED_USERS.map(async ({ password, ...user }) => {
      const salt = `seed-${user.id}`
      return { ...user, avatarUrl: null, salt, passwordHash: await hashPassword(password, salt) }
    }),
  )
  const updatedAt = '2026-10-01T12:00:00.000Z'
  return {
    schema: 4,
    seq: 1000,
    users,
    sessions: [],
    nfts: createNftFixtures(),
    favorites: { usr_ana: ['emerald-ape-042', 'golden-beat-207'], usr_bruno: [] },
    carts: {},
    quotes: {},
    orders: {},
    wallets: [
      {
        id: 'wal_ana_main',
        userId: 'usr_ana',
        role: 'primary',
        label: 'Carteira principal',
        type: 'metamask',
        network: 'ethereum',
        address: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
        secondaryRef: null,
        displayName: 'Ana Souza',
        profileName: 'Ana Coleciona',
        email: 'ana@kurio.dev',
        referralCode: 'ANA2026',
        ensName: 'anasouza.eth',
        updatedAt,
      },
      {
        id: 'wal_ana_alt',
        userId: 'usr_ana',
        role: 'secondary',
        label: 'Carteira de viagem',
        type: 'coinbase',
        network: 'polygon',
        address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
        secondaryRef: 'anasouza.eth',
        displayName: 'Ana Souza',
        profileName: 'Ana Coleciona',
        email: 'ana@kurio.dev',
        referralCode: 'ANA2026',
        ensName: 'anaviagem.eth',
        updatedAt,
      },
      {
        id: 'wal_bruno_main',
        userId: 'usr_bruno',
        role: 'primary',
        label: 'Principal',
        type: 'walletconnect',
        network: 'ethereum',
        address: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
        secondaryRef: null,
        displayName: 'Bruno Lima',
        profileName: 'Bruno Lima',
        email: 'bruno@kurio.dev',
        referralCode: 'BRUNO26',
        ensName: 'brunolima.eth',
        updatedAt,
      },
    ],
    idempotency: {},
    connectedWallets: {},
    triggered: {},
  }
}

let state: DbState | null = null

export const db = {
  async init() {
    const saved = storage.get<DbState>(STORAGE_KEY)
    state = saved?.schema === 4 ? saved : await createSeed()
    db.persist()
  },
  async reset() {
    state = await createSeed()
    db.persist()
  },
  get data(): DbState {
    if (!state) throw new Error('Banco simulado não inicializado')
    return state
  },
  persist() {
    if (state) storage.set(STORAGE_KEY, state)
  },
  nextId(prefix: string) {
    db.data.seq += 1
    return `${prefix}_${db.data.seq.toString(36)}`
  },
}
