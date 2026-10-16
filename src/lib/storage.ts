export const storage = {
  get<T>(key: string): T | null {
    try {
      const raw = window.localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : null
    } catch {
      return null
    }
  },
  set(key: string, value: unknown) {
    try {
      window.localStorage.setItem(key, JSON.stringify(value))
    } catch {
      return
    }
  },
  remove(key: string) {
    try {
      window.localStorage.removeItem(key)
    } catch {
      return
    }
  },
}
