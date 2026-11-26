import { Hono } from 'hono'
import type { Context } from 'hono'
import { eq, and, asc, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { sites, sections, siteDailyStats, clickDailyStats, user } from '../db/schema'
import { cache, siteCacheKey } from '../lib/cache'
import { renderSiteById } from '../services/render'
import { buildVcard, vcardFilename } from '../lib/vcard'
import { isValidUsername, parseSectionData } from '@portfolio/shared'
import { config, PUBLIC_BASE_URL } from '../config'

export const publicRoutes = new Hono()

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]!))
const today = () => new Date().toISOString().slice(0, 10)

function sendHtml(c: Context, html: string, etag: string | null) {
  if (etag && c.req.header('if-none-match') === etag) return c.body(null, 304)
  c.header('content-type', 'text/html; charset=utf-8')
  if (etag) c.header('etag', etag)
  // short edge TTL: there is no purge-on-save, so an edit must show within a minute
  c.header('cache-control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300')
  return c.body(html)
}

function notFound(c: Context) {
  return c.html(`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>Not found</title>
<style>body{font-family:ui-sans-serif,system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#fafafa;color:#18181b}</style>
<div style=text-align:center><h1>404</h1><p>This page does not exist.</p></div>`, 404)
}

// username -> id of a published page whose owner isn't suspended; 60 s in-process so beacons skip Postgres
const liveCache = new Map<string, { id: string | null; exp: number }>()
async function liveSiteId(username: string): Promise<string | null> {
  const hit = liveCache.get(username)
  if (hit && hit.exp > Date.now()) return hit.id
  const row = (await db.select({ id: sites.id }).from(sites).innerJoin(user, eq(sites.userId, user.id))
    .where(and(eq(sites.username, username), eq(sites.status, 'published'), eq(user.suspended, false))).limit(1))[0]
  if (liveCache.size > 10_000) liveCache.clear()
  liveCache.set(username, { id: row?.id ?? null, exp: Date.now() + 60_000 })
  return row?.id ?? null
}

async function serveSite(c: Context, username: string) {
  const cached = await cache.get(siteCacheKey(username))
  if (cached) {
    const { html, etag } = JSON.parse(cached)
    return sendHtml(c, html, etag)
  }
  const site = (await db.select().from(sites).where(eq(sites.username, username)).limit(1))[0]
  if (!site || site.status !== 'published') return notFound(c)
  // suspend busts the cache, so this miss-path check keeps a suspended owner's page down
  const owner = (await db.select({ suspended: user.suspended }).from(user).where(eq(user.id, site.userId)).limit(1))[0]
  if (owner?.suspended) return notFound(c)

  let html = site.renderedHtml
  let etag = site.renderedEtag
  if (!html) {
    const r = await renderSiteById(site.id)
    if (!r) return notFound(c)
    html = r.html; etag = r.etag
  } else {
    await cache.set(siteCacheKey(username), JSON.stringify({ html, etag }))
  }
  db.insert(siteDailyStats).values({ siteId: site.id, date: today(), views: 1 })
    .onConflictDoUpdate({ target: [siteDailyStats.siteId, siteDailyStats.date], set: { views: sql`${siteDailyStats.views} + 1` } })
    .catch((e) => console.error('[stats] view bump failed', (e as Error).message))
  return sendHtml(c, html!, etag ?? null)
}

publicRoutes.get('/health', (c) => c.json({ ok: true }))
// pages set their own icon; answer the browser's default probe without a lookup or a 404
publicRoutes.get('/favicon.ico', (c) => { c.header('cache-control', 'public, max-age=86400'); return c.body(null, 204) })

publicRoutes.get('/', (c) => {
  c.header('cache-control', 'public, max-age=300')
  return c.html(`<!doctype html><meta charset=utf-8><meta name=viewport content="width=device-width,initial-scale=1"><title>${esc(config.BRAND_NAME)}</title>
<style>body{font-family:ui-sans-serif,system-ui;display:grid;place-items:center;min-height:100vh;margin:0;background:#fafafa;color:#18181b}</style>
<h1>${esc(config.BRAND_NAME)}</h1>`)
})

publicRoutes.get('/robots.txt', (c) => {
  c.header('content-type', 'text/plain')
  return c.body(`User-agent: *\nAllow: /\nSitemap: ${PUBLIC_BASE_URL}/sitemap.xml\n`)
})

publicRoutes.get('/sitemap.xml', async (c) => {
  const rows = await db.select({ username: sites.username, publishedAt: sites.publishedAt })
    .from(sites).innerJoin(user, eq(sites.userId, user.id))
    .where(and(eq(sites.status, 'published'), eq(user.suspended, false))).limit(45_000)
  const urls = rows.map((r) => `<url><loc>${PUBLIC_BASE_URL}/${r.username}</loc><lastmod>${(r.publishedAt ?? new Date()).toISOString().slice(0, 10)}</lastmod></url>`)
  c.header('content-type', 'application/xml')
  c.header('cache-control', 'public, max-age=3600')
  return c.body(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join('')}</urlset>`)
})

// Click beacon from published pages: counters only, unauthenticated by design.
publicRoutes.post('/c', async (c) => {
  const u = c.req.query('u') ?? ''
  const k = c.req.query('k') ?? ''
  if (!isValidUsername(u) || !/^[A-Za-z0-9_-]{1,24}$/.test(k)) return c.body(null, 204)
  const siteId = await liveSiteId(u)
  if (siteId) {
    await db.insert(clickDailyStats).values({ siteId, item: k, date: today(), clicks: 1 })
      .onConflictDoUpdate({ target: [clickDailyStats.siteId, clickDailyStats.item, clickDailyStats.date], set: { clicks: sql`${clickDailyStats.clicks} + 1` } })
  }
  return c.body(null, 204)
})

// Reads the current vCard block, so its data is live as soon as it's saved.
publicRoutes.get('/:username/contact.vcf', async (c) => {
  const username = c.req.param('username').toLowerCase()
  if (!isValidUsername(username)) return notFound(c)
  const siteId = await liveSiteId(username)
  if (!siteId) return notFound(c)
  const row = (await db.select({ data: sections.data }).from(sections)
    .where(and(eq(sections.siteId, siteId), eq(sections.type, 'vcard'), eq(sections.visible, true))).orderBy(asc(sections.position)).limit(1))[0]
  if (!row) return notFound(c)
  const d = parseSectionData('vcard', row.data)
  c.header('content-type', 'text/vcard; charset=utf-8')
  c.header('content-disposition', `attachment; filename="${vcardFilename(`${d.firstName} ${d.lastName}`.trim() || d.org)}"`)
  c.header('cache-control', 'public, max-age=60')
  return c.body(buildVcard(d))
})

publicRoutes.get('/:username', async (c) => {
  const username = c.req.param('username').toLowerCase()
  if (!isValidUsername(username)) return notFound(c)
  return serveSite(c, username)
})
