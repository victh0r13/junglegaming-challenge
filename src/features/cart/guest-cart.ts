import { useSyncExternalStore } from 'react'
import { storage } from '@/lib/storage'

const STORAGE_KEY = 'kurio:guest-cart-id'

type Listener = () => void

const listeners = new Set<Listener>()
let currentId = storage.get<string>(STORAGE_KEY)

function emit(next: string | null) {
  currentId = next
  listeners.forEach((listener) => listener())
}

export const guestCart = {
  getId: () => currentId,
  setId(id: string) {
    storage.set(STORAGE_KEY, id)
    emit(id)
  },
  clear() {
    storage.remove(STORAGE_KEY)
    emit(null)
  },
  subscribe(listener: Listener) {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  },
}

export function useGuestCartId() {
  return useSyncExternalStore(guestCart.subscribe, guestCart.getId)
}
