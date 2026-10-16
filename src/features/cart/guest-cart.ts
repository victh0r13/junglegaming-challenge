import { storage } from '@/lib/storage'

const STORAGE_KEY = 'kurio:guest-cart-id'

export const guestCart = {
  getId: () => storage.get<string>(STORAGE_KEY),
  setId: (id: string) => storage.set(STORAGE_KEY, id),
  clear: () => storage.remove(STORAGE_KEY),
}
