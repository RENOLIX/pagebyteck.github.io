import { eq, asc } from 'drizzle-orm'
import { createHash } from 'node:crypto'
import { db } from '../db/client'
import { sites, sections } from '../db/schema'
import type { SiteRow, SectionRow } from '../db/schema'
import { cache, siteCacheKey } from '../lib/cache'
import { renderPortfolioHtml } from '../render/render-portfolio'

function build(site: SiteRow, secs: SectionRow[], previewMode = false): string {
  return renderPortfolioHtml({
    username: site.username,
    title: site.title,
    tokens: site.tokens,
    seo: site.seo,
    sections: secs.filter((s) => s.visible).map((s) => ({ id: s.id, type: s.type, data: s.data })),
    previewMode,
  })
}

async function load(siteId: string) {
  const site = (await db.select().from(sites).where(eq(sites.id, siteId)).limit(1))[0]
  if (!site) return null
  const secs = await db.select().from(sections).where(eq(sections.siteId, siteId)).orderBy(asc(sections.position))
  return { site, secs }
}

/** Render-on-save: build once, persist on the row, prime the cache. */
export async function renderSiteById(siteId: string): Promise<{ html: string; etag: string } | null> {
  const loaded = await load(siteId)
  if (!loaded) return null
  const html = build(loaded.site, loaded.secs)
  const etag = '"' + createHash('sha1').update(html).digest('hex').slice(0, 16) + '"'
  await db.update(sites).set({ renderedHtml: html, renderedEtag: etag, renderedAt: new Date() }).where(eq(sites.id, siteId))
  await cache.set(siteCacheKey(loaded.site.username), JSON.stringify({ html, etag }))
  return { html, etag }
}

/** Draft preview for the editor iframe: current DB state, not persisted or cached. */
export async function renderSitePreview(siteId: string): Promise<string | null> {
  const loaded = await load(siteId)
  return loaded ? build(loaded.site, loaded.secs, true) : null
}

export async function invalidateSite(username: string): Promise<void> {
  await cache.del(siteCacheKey(username))
}
