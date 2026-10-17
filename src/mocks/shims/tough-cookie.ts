type SerializedCookie = { key?: string; domain?: string | null; path?: string | null }

export class Cookie {
  key = ''
  domain: string | null = null
  path: string | null = null

  static fromJSON(value: SerializedCookie | string | null | undefined) {
    if (!value || typeof value === 'string') return null
    return Object.assign(new Cookie(), value)
  }

  toJSON() {
    return { key: this.key, domain: this.domain, path: this.path }
  }
}

export class MemoryCookieStore {
  idx: Record<string, Record<string, Record<string, Cookie>>> = {}
}

export class CookieJar {
  readonly store: MemoryCookieStore

  constructor(store: MemoryCookieStore) {
    this.store = store
  }

  getCookiesSync(): Cookie[] {
    return []
  }

  async setCookie() {
    return undefined
  }
}
