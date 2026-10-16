import type { CreateOrderBody } from '@/api/contracts'
import { storage } from '@/lib/storage'

const STORAGE_KEY = 'kurio:pending-checkout'
const DRAFT_KEY = 'kurio:checkout-draft'

export type PendingCheckout = {
  userId: string
  idempotencyKey: string
  body: CreateOrderBody
  orderId: string | null
  createdAt: string
}

export const pendingCheckout = {
  get(userId: string) {
    const value = storage.get<PendingCheckout>(STORAGE_KEY)
    return value && value.userId === userId ? value : null
  },
  save(value: PendingCheckout) {
    storage.set(STORAGE_KEY, value)
  },
  clear() {
    storage.remove(STORAGE_KEY)
  },
}

export type CheckoutDraft<T> = { userId: string; values: T }

export const checkoutDraft = {
  get<T>(userId: string) {
    const value = storage.get<CheckoutDraft<T>>(DRAFT_KEY)
    return value && value.userId === userId ? value.values : null
  },
  save<T>(userId: string, values: T) {
    storage.set(DRAFT_KEY, { userId, values })
  },
  clear() {
    storage.remove(DRAFT_KEY)
  },
}
