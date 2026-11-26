/**
 * Rendered page HTML is cached here so a public read never touches Postgres.
 * The memory driver is per process: restart the app after re-rendering pages from a script.
 */
export interface CacheDriver {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSec?: number): Promise<void>
  del(key: string): Promise<void>
}

class MemoryCache implements CacheDriver {
  private store = new Map<string, { v: string; exp: number }>()
  private max = 5000

  async get(key: string): Promise<string | null> {
    const e = this.store.get(key)
    if (!e) return null
    if (e.exp && e.exp < Date.now()) { this.store.delete(key); return null }
    // touch for LRU recency
    this.store.delete(key); this.store.set(key, e)
    return e.v
  }
  async set(key: string, value: string, ttlSec?: number): Promise<void> {
    if (this.store.size >= this.max) {
      const oldest = this.store.keys().next().value
      if (oldest) this.store.delete(oldest)
    }
    this.store.set(key, { v: value, exp: ttlSec ? Date.now() + ttlSec * 1000 : 0 })
  }
  async del(key: string): Promise<void> { this.store.delete(key) }
}

export const cache: CacheDriver = new MemoryCache()

export const siteCacheKey = (username: string) => `site:html:${username.toLowerCase()}`
