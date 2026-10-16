import type { Network, NftListParams } from './contracts'

export const queryKeys = {
  nfts: {
    all: ['nfts'] as const,
    list: (params: NftListParams) => ['nfts', 'list', params] as const,
    detail: (id: string) => ['nfts', 'detail', id] as const,
    highlights: () => ['nfts', 'highlights'] as const,
  },
  cart: {
    all: ['cart'] as const,
    detail: (owner: string) => ['cart', owner] as const,
    quote: (owner: string, network: Network) => ['cart', owner, 'quote', network] as const,
  },
  private: {
    all: ['private'] as const,
    session: (userId: string) => ['private', userId, 'session'] as const,
    favorites: (userId: string) => ['private', userId, 'favorites'] as const,
    profile: (userId: string) => ['private', userId, 'profile'] as const,
    wallets: (userId: string) => ['private', userId, 'wallets'] as const,
    order: (userId: string, orderId: string) => ['private', userId, 'orders', orderId] as const,
  },
}
