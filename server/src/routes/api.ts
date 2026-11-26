import { Hono } from 'hono'
import type { Context, Next } from 'hono'
import { and, eq, asc, gte, sql } from 'drizzle-orm'
import { z } from 'zod'
import { auth } from '../auth'
import { config, isAdminEmail, PUBLIC_BASE_URL } from '../config'
import { db } from '../db/client'
import { sites, sections, user, media, siteDailyStats, clickDailyStats } from '../db/schema'
import type { SiteRow, SectionRow } from '../db/schema'
import { storage, probeImage, IMAGE_MAX_BYTES } from '../lib/storage'
import { searchIcons, iconSvg, getIcon } from '../lib/icons'
import { renderSiteById, renderSitePreview, invalidateSite } from '../services/render'
import { isSectionType, parseSectionData, SiteTokens, SiteSeo, USER_EDITABLE_TYPES, type SectionType } from '@portfolio/shared'

type Env = { Variables: { userId: string; isAdmin: boolean } }
export const apiRoutes = new Hono<Env>()

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_MEDIA_PER_USER = 300

/* ------------------------------- auth guard ------------------------------- */
apiRoutes.use('*', async (c, next) => {
  // skip the 5-minute cookie cache so a suspension applies on the next request
  const s = await auth.api.getSession({ headers: c.req.raw.headers, query: { disableCookieCache: true } })
  if (!s?.user) {
    console.error('[api] no session', c.req.method, c.req.path)
    return c.json({ error: 'unauthorized' }, 401)
  }
  const u = s.user as { id: string; email: string; suspended?: boolean }
  if (u.suspended) {
    console.error('[api] suspended account', u.email, c.req.method, c.req.path)
    return c.json({ error: 'suspended' }, 403)
  }
  c.set('userId', u.id)
  c.set('isAdmin', isAdminEmail(u.email))
  await next()
})
const adminOnly = async (c: Context<Env>, next: Next) => {
  if (!c.get('isAdmin')) return c.json({ error: 'forbidden' }, 403)
  await next()
}

async function accessibleSite(c: Context<Env>, id: string): Promise<SiteRow | null> {
  if (!UUID.test(id)) return null
  const where = c.get('isAdmin') ? eq(sites.id, id) : and(eq(sites.id, id), eq(sites.userId, c.get('userId')))
  return (await db.select().from(sites).where(where).limit(1))[0] ?? null
}
const editableBy = (c: Context<Env>, type: string) => c.get('isAdmin') || (USER_EDITABLE_TYPES as readonly string[]).includes(type)
const touch = (id: string) => db.update(sites).set({ updatedAt: new Date() }).where(eq(sites.id, id))
const pubSite = (s: SiteRow) => ({ id: s.id, username: s.username, title: s.title, status: s.status, publishedAt: s.publishedAt, updatedAt: s.updatedAt })
const pubSection = (s: SectionRow) => ({ id: s.id, type: s.type, position: s.position, visible: s.visible, data: s.data })

/* --------------------------------- me ------------------------------------ */
apiRoutes.get('/me', async (c) => {
  const u = (await db.select().from(user).where(eq(user.id, c.get('userId'))).limit(1))[0]
  return c.json({ id: u.id, email: u.email, name: u.name, isAdmin: c.get('isAdmin'), publicBaseUrl: PUBLIC_BASE_URL, brand: config.BRAND_NAME })
})

/* -------------------------------- media ---------------------------------- */
apiRoutes.post('/media', async (c) => {
  const body = await c.req.parseBody().catch(() => ({}))
  const file = (body as Record<string, unknown>).file
  // every refusal is logged: without it a client saying "upload failed" is not diagnosable
  const refuse = (reason: string, status: 400 | 413 | 415) => {
    const name = file instanceof File ? file.name.replace(/[\u0000-\u001f]/g, '').slice(0, 80) : ''
    const f = file instanceof File ? `${name} type=${file.type || 'none'} bytes=${file.size}` : 'no file'
    console.error('[media] refused', reason, f)
    return c.json({ error: reason }, status)
  }
  if (!(file instanceof File)) return refuse('no_file', 400)
  if (file.size > IMAGE_MAX_BYTES) return refuse('too_large', 413)
  const userId = c.get('userId')
  const count = Number((await db.select({ n: sql<number>`count(*)::int` }).from(media).where(eq(media.userId, userId)))[0]?.n ?? 0)
  if (count >= MAX_MEDIA_PER_USER) return refuse('too_many_files', 413)

  const buf = Buffer.from(await file.arrayBuffer())
  if (buf.length > IMAGE_MAX_BYTES) return refuse('too_large', 413)
  const img = probeImage(buf)
  if (!img) return refuse('bad_type', 415)

  const stored = await storage.put(buf, img.ext, img.contentType)
  try {
    const row = (await db.insert(media).values({ userId, key: stored.key, url: stored.url, width: img.width, height: img.height, bytes: buf.length }).returning())[0]
    console.log('[media] stored', stored.key, `${img.width}x${img.height}`, `bytes=${buf.length}`)
    return c.json({ id: row.id, url: stored.url, width: img.width, height: img.height })
  } catch (e) {
    await storage.del(stored.key).catch((err) => console.error('[media] rollback delete failed', stored.key, (err as Error).message))
    throw e
  }
})

/* -------------------------------- icons ---------------------------------- */
apiRoutes.get('/icons/search', (c) => c.json({ icons: searchIcons(c.req.query('q') ?? '') }))
apiRoutes.get('/icons/:slug', (c) => {
  const slug = c.req.param('slug').replace(/\.svg$/, '')
  const icon = getIcon(slug)
  if (!icon) return c.notFound()
  c.header('content-type', 'image/svg+xml; charset=utf-8')
  c.header('cache-control', 'public, max-age=86400')
  return c.body(iconSvg(slug, '#' + icon.hex) ?? '')
})

/* -------------------------------- pages ---------------------------------- */
apiRoutes.get('/sites', async (c) => {
  const rows = c.get('isAdmin')
    ? await db.select({ site: sites, email: user.email }).from(sites).leftJoin(user, eq(sites.userId, user.id)).orderBy(asc(sites.createdAt))
    : (await db.select().from(sites).where(eq(sites.userId, c.get('userId'))).orderBy(asc(sites.createdAt))).map((site) => ({ site, email: null }))
  return c.json({ sites: rows.map((r) => ({ ...pubSite(r.site), ownerEmail: r.email })) })
})

apiRoutes.get('/sites/:id', async (c) => {
  const site = await accessibleSite(c, c.req.param('id') ?? '')
  if (!site) return c.json({ error: 'not_found' }, 404)
  const secs = (await db.select().from(sections).where(eq(sections.siteId, site.id)).orderBy(asc(sections.position)))
    .filter((s) => editableBy(c, s.type))
  return c.json({ site: { ...pubSite(site), tokens: site.tokens, seo: site.seo }, sections: secs.map(pubSection) })
})

const UpdateSite = z.object({ title: z.string().max(120).optional(), tokens: z.unknown().optional(), seo: z.unknown().optional() })
apiRoutes.patch('/sites/:id', adminOnly, async (c) => {
  const site = await accessibleSite(c, c.req.param('id') ?? '')
  if (!site) return c.json({ error: 'not_found' }, 404)
  const b = UpdateSite.safeParse(await c.req.json().catch(() => ({})))
  if (!b.success) return c.json({ error: 'bad_request' }, 400)
  const patch: Record<string, unknown> = { updatedAt: new Date() }
  if (b.data.title !== undefined) patch.title = b.data.title
  if (b.data.tokens !== undefined) patch.tokens = SiteTokens.parse(b.data.tokens)
  if (b.data.seo !== undefined) patch.seo = SiteSeo.parse(b.data.seo)
  // no live re-render: Publish is the one path that pushes admin drafts live
  const row = (await db.update(sites).set(patch).where(eq(sites.id, site.id)).returning())[0]
  return c.json({ site: { ...pubSite(row), tokens: row.tokens, seo: row.seo } })
})

apiRoutes.get('/sites/:id/preview', async (c) => {
  const site = await accessibleSite(c, c.req.param('id') ?? '')
  if (!site) return c.json({ error: 'not_found' }, 404)
  return c.html((await renderSitePreview(site.id)) ?? '<!doctype html><p>empty</p>')
})

apiRoutes.post('/sites/:id/publish', adminOnly, async (c) => {
  const site = await accessibleSite(c, c.req.param('id') ?? '')
  if (!site) return c.json({ error: 'not_found' }, 404)
  await db.update(sites).set({ status: 'published', publishedAt: new Date() }).where(eq(sites.id, site.id))
  await renderSiteById(site.id)
  await invalidateSite(site.username)
  return c.json({ ok: true, url: `${PUBLIC_BASE_URL}/${site.username}` })
})

apiRoutes.post('/sites/:id/unpublish', adminOnly, async (c) => {
  const site = await accessibleSite(c, c.req.param('id') ?? '')
  if (!site) return c.json({ error: 'not_found' }, 404)
  await db.update(sites).set({ status: 'draft' }).where(eq(sites.id, site.id))
  await invalidateSite(site.username)
  return c.json({ ok: true })
})

/* ------------------------------- sections -------------------------------- */
const AddSection = z.object({ type: z.string() })
apiRoutes.post('/sites/:id/sections', adminOnly, async (c) => {
  const site = await accessibleSite(c, c.req.param('id') ?? '')
  if (!site) return c.json({ error: 'not_found' }, 404)
  const b = AddSection.safeParse(await c.req.json().catch(() => ({})))
  if (!b.success || !isSectionType(b.data.type)) return c.json({ error: 'bad_request' }, 400)
  const cnt = Number((await db.select({ n: sql<number>`count(*)::int` }).from(sections).where(eq(sections.siteId, site.id)))[0]?.n ?? 0)
  if (cnt >= 40) return c.json({ error: 'too_many_blocks' }, 400)
  const row = (await db.insert(sections).values({ siteId: site.id, type: b.data.type, position: cnt, data: parseSectionData(b.data.type, {}) }).returning())[0]
  await touch(site.id)
  return c.json({ section: pubSection(row) }, 201)
})

async function accessibleSection(c: Context<Env>, id: string) {
  if (!UUID.test(id)) return null
  const sec = (await db.select().from(sections).where(eq(sections.id, id)).limit(1))[0]
  if (!sec) return null
  const site = await accessibleSite(c, sec.siteId)
  return site ? { sec, site, editable: editableBy(c, sec.type) } : null
}

const UpdateSection = z.object({ data: z.unknown().optional(), visible: z.boolean().optional() })
apiRoutes.patch('/sections/:id', async (c) => {
  const found = await accessibleSection(c, c.req.param('id') ?? '')
  if (!found || !isSectionType(found.sec.type)) return c.json({ error: 'not_found' }, 404)
  if (!found.editable) return c.json({ error: 'admin_only' }, 403)
  const b = UpdateSection.safeParse(await c.req.json().catch(() => ({})))
  if (!b.success) return c.json({ error: 'bad_request' }, 400)
  if (b.data.visible !== undefined && !c.get('isAdmin')) return c.json({ error: 'forbidden' }, 403)
  const patch: Record<string, unknown> = { updatedAt: new Date() }
  if (b.data.data !== undefined) {
    const parsed = parseSectionData(found.sec.type as SectionType, b.data.data)
    patch.data = parsed
  }
  if (b.data.visible !== undefined) patch.visible = b.data.visible
  const row = (await db.update(sections).set(patch).where(eq(sections.id, found.sec.id)).returning())[0]
  await touch(found.site.id)
  // a user's icon edit goes live at once (users have no publish button); this also publishes pending admin drafts
  if (!c.get('isAdmin') && found.site.status === 'published') {
    await renderSiteById(found.site.id)
    await invalidateSite(found.site.username)
  }
  return c.json({ section: pubSection(row) })
})

apiRoutes.delete('/sections/:id', adminOnly, async (c) => {
  const found = await accessibleSection(c, c.req.param('id') ?? '')
  if (!found) return c.json({ error: 'not_found' }, 404)
  await db.delete(sections).where(eq(sections.id, found.sec.id))
  await touch(found.site.id)
  return c.json({ ok: true })
})

const Reorder = z.object({ order: z.array(z.string().regex(UUID)).max(40) })
apiRoutes.post('/sites/:id/reorder', adminOnly, async (c) => {
  const site = await accessibleSite(c, c.req.param('id') ?? '')
  if (!site) return c.json({ error: 'not_found' }, 404)
  const b = Reorder.safeParse(await c.req.json().catch(() => ({})))
  if (!b.success) return c.json({ error: 'bad_request' }, 400)
  const owned = new Set((await db.select({ id: sections.id }).from(sections).where(eq(sections.siteId, site.id))).map((r) => r.id))
  const ids = b.data.order.filter((id) => owned.has(id))
  if (ids.length) {
    await db.execute(sql`
      update sections set position = v.pos
      from (values ${sql.join(ids.map((id, i) => sql`(${id}::uuid, ${i}::int)`), sql`, `)}) as v(id, pos)
      where sections.id = v.id and sections.site_id = ${site.id}
    `)
  }
  await touch(site.id)
  return c.json({ ok: true })
})

/* -------------------------------- stats ---------------------------------- */
const RANGE_DAYS: Record<string, number | null> = { '7d': 7, '30d': 30, all: null }
apiRoutes.get('/sites/:id/stats', async (c) => {
  const site = await accessibleSite(c, c.req.param('id') ?? '')
  if (!site) return c.json({ error: 'not_found' }, 404)
  const days = RANGE_DAYS[c.req.query('range') ?? '7d'] ?? 7
  const since = days === null ? null : new Date(Date.now() - (days - 1) * 86_400_000).toISOString().slice(0, 10)

  const views = await db.select({ date: siteDailyStats.date, views: siteDailyStats.views }).from(siteDailyStats)
    .where(since ? and(eq(siteDailyStats.siteId, site.id), gte(siteDailyStats.date, since)) : eq(siteDailyStats.siteId, site.id))
    .orderBy(asc(siteDailyStats.date))
  const clicks = await db.select({ item: clickDailyStats.item, clicks: sql<number>`sum(${clickDailyStats.clicks})::int` }).from(clickDailyStats)
    .where(since ? and(eq(clickDailyStats.siteId, site.id), gte(clickDailyStats.date, since)) : eq(clickDailyStats.siteId, site.id))
    .groupBy(clickDailyStats.item)

  // item ids -> human labels from the current blocks
  const labels = new Map<string, { label: string; kind: string }>([['phone', { label: 'Phone', kind: 'phone' }], ['vcard', { label: 'Save contact', kind: 'vcard' }]])
  for (const s of await db.select({ type: sections.type, data: sections.data }).from(sections).where(eq(sections.siteId, site.id))) {
    const items = ((s.data as { items?: { id?: string; label?: string; icon?: string; url?: string }[] }).items ?? [])
    for (const it of items) if (it.id) labels.set(it.id, { label: it.label || it.icon || it.url || it.id, kind: s.type })
  }
  return c.json({
    views,
    clicks: clicks.map((r) => ({ item: r.item, clicks: Number(r.clicks), ...(labels.get(r.item) ?? { label: 'Removed item', kind: 'removed' }) }))
      .sort((a, b) => b.clicks - a.clicks),
  })
})
