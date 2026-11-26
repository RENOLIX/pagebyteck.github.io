// Read queries for the admin panel. Every function is admin-gated at the route layer.
import { desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { db } from '../db/client'
import { user, sites, siteDailyStats, clickDailyStats, adminActions } from '../db/schema'

const PER = 25
const since30 = sql`to_char(now() - interval '30 days','YYYY-MM-DD')`

export async function overview() {
  const one = async (q: Promise<{ n: number }[]>) => Number((await q)[0]?.n ?? 0)
  const [users, suspended, pages, published, views30, clicks30] = await Promise.all([
    one(db.select({ n: sql<number>`count(*)::int` }).from(user)),
    one(db.select({ n: sql<number>`count(*)::int` }).from(user).where(eq(user.suspended, true))),
    one(db.select({ n: sql<number>`count(*)::int` }).from(sites)),
    one(db.select({ n: sql<number>`count(*)::int` }).from(sites).where(eq(sites.status, 'published'))),
    one(db.select({ n: sql<number>`coalesce(sum(${siteDailyStats.views}),0)::int` }).from(siteDailyStats).where(sql`${siteDailyStats.date} >= ${since30}`)),
    one(db.select({ n: sql<number>`coalesce(sum(${clickDailyStats.clicks}),0)::int` }).from(clickDailyStats).where(sql`${clickDailyStats.date} >= ${since30}`)),
  ])
  const recentUsers = await db.select({ id: user.id, email: user.email, name: user.name, suspended: user.suspended, createdAt: user.createdAt })
    .from(user).orderBy(desc(user.createdAt)).limit(8)
  return { users, suspended, pages, published, views30, clicks30, recentUsers }
}

export async function listUsers(qRaw: string, page: number) {
  const q = qRaw.trim()
  const where = q ? or(ilike(user.email, `%${q}%`), ilike(user.name, `%${q}%`)) : undefined
  const raw = await db.select({
    id: user.id, email: user.email, name: user.name, suspended: user.suspended, createdAt: user.createdAt,
  }).from(user).where(where).orderBy(desc(user.createdAt)).limit(PER + 1).offset(page * PER)
  const pageRows = raw.slice(0, PER)
  const ids = pageRows.map((r) => r.id)
  const pages = ids.length
    ? await db.select({ uid: sites.userId, username: sites.username }).from(sites).where(inArray(sites.userId, ids))
    : []
  const byUser = new Map<string, string[]>()
  for (const p of pages) byUser.set(p.uid, [...(byUser.get(p.uid) ?? []), p.username])
  return { rows: pageRows.map((r) => ({ ...r, pages: byUser.get(r.id) ?? [] })), page, hasNext: raw.length > PER, q }
}

export async function getUserDetail(id: string) {
  const u = (await db.select().from(user).where(eq(user.id, id)).limit(1))[0]
  if (!u) return null
  const userSites = await db.select().from(sites).where(eq(sites.userId, id)).orderBy(desc(sites.createdAt))
  return { u, sites: userSites }
}

export async function topSites(limit = 20) {
  const views = await db.select({
    siteId: siteDailyStats.siteId, username: sites.username, userId: sites.userId, email: user.email,
    views: sql<number>`coalesce(sum(${siteDailyStats.views}),0)::int`,
  }).from(siteDailyStats)
    .innerJoin(sites, eq(siteDailyStats.siteId, sites.id))
    .leftJoin(user, eq(sites.userId, user.id))
    .where(sql`${siteDailyStats.date} >= ${since30}`)
    .groupBy(siteDailyStats.siteId, sites.username, sites.userId, user.email)
    .orderBy(desc(sql`sum(${siteDailyStats.views})`)).limit(limit)
  const ids = views.map((v) => v.siteId)
  const clicks = ids.length
    ? await db.select({ siteId: clickDailyStats.siteId, n: sql<number>`coalesce(sum(${clickDailyStats.clicks}),0)::int` })
      .from(clickDailyStats).where(sql`${inArray(clickDailyStats.siteId, ids)} and ${clickDailyStats.date} >= ${since30}`).groupBy(clickDailyStats.siteId)
    : []
  const cmap = new Map(clicks.map((c) => [c.siteId, Number(c.n)]))
  return views.map((v) => ({ ...v, clicks: cmap.get(v.siteId) ?? 0 }))
}

export async function recentAudit(limit = 50) {
  return db.select().from(adminActions).orderBy(desc(adminActions.createdAt)).limit(limit)
}
