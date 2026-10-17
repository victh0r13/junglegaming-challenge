import { useSyncExternalStore } from 'react'
import { storage } from '@/lib/storage'

const STORAGE_KEY = 'kurio:session'
const EXPIRED_KEY = 'kurio:session-expired'

export type StoredSession = {
  token: string
  userId: string
  expiresAt: string
}

export type SessionState =
  | { status: 'anonymous' }
  | { status: 'authenticated'; session: StoredSession }
  | { status: 'expired'; previousUserId: string }

type Listener = () => void

function createSessionStore() {
  const listeners = new Set<Listener>()
  const saved = storage.get<StoredSession>(STORAGE_KEY)
  const expiredUserId = storage.get<string>(EXPIRED_KEY)
  let state: SessionState = saved
    ? { status: 'authenticated', session: saved }
    : expiredUserId
      ? { status: 'expired', previousUserId: expiredUserId }
      : { status: 'anonymous' }

  function emit(next: SessionState) {
    state = next
    listeners.forEach((listener) => listener())
  }

  return {
    getState: () => state,
    getToken: () => (state.status === 'authenticated' ? state.session.token : null),
    getUserId: () => (state.status === 'authenticated' ? state.session.userId : null),
    subscribe(listener: Listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    signIn(session: StoredSession) {
      storage.remove(EXPIRED_KEY)
      storage.set(STORAGE_KEY, session)
      emit({ status: 'authenticated', session })
    },
    signOut() {
      storage.remove(EXPIRED_KEY)
      storage.remove(STORAGE_KEY)
      emit({ status: 'anonymous' })
    },
    markExpired() {
      if (state.status !== 'authenticated') return
      const previousUserId = state.session.userId
      storage.set(EXPIRED_KEY, previousUserId)
      storage.remove(STORAGE_KEY)
      emit({ status: 'expired', previousUserId })
    },
  }
}

export const sessionStore = createSessionStore()

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return
    const next = storage.get<StoredSession>(STORAGE_KEY)
    if (next) sessionStore.signIn(next)
    else if (sessionStore.getState().status !== 'authenticated') return
    else if (storage.get<string>(EXPIRED_KEY)) sessionStore.markExpired()
    else sessionStore.signOut()
  })
}

export function useSessionState() {
  return useSyncExternalStore(sessionStore.subscribe, sessionStore.getState)
}
