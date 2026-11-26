// Admin mutations. None are reachable without adminGuard (session + admin email) and CSRF at the
// route layer. Every call writes an admin_actions audit row.
import { and, eq } from 'drizzle-orm'
import { db } from '../db/client'
import { user, session, account, sites, sections, media, adminActions } from '../db/schema'
import { auth } from '../auth'
import { invalidateSite } from '../services/render'
import { storage } from '../lib/storage'
import { isAdminEmail } from '../config'
import { isValidUsername } from '@portfolio/shared'

type Ctx = { adminEmail: string; ip: string }
async function audit(ctx: Ctx, action: string, targetUserId: string | null, targetId: string | null, detail: Record<string, unknown> = {}) {
  await db.insert(adminActions).values({ adminEmail: ctx.adminEmail, action, targetUserId, targetId, detail, ip: ctx.ip || null })
}

async function bustUserSiteCaches(userId: string) {
  const rows = await db.select({ username: sites.username }).from(sites).where(eq(sites.userId, userId))
  for (const r of rows) await invalidateSite(r.username)
}

export async function setSuspended(ctx: Ctx, userId: string, suspend: boolean) {
  await db.update(user).set({ suspended: suspend, updatedAt: new Date() }).where(eq(user.id, userId))
  if (suspend) await db.delete(session).where(eq(session.userId, userId))
  await bustUserSiteCaches(userId)
  await audit(ctx, suspend ? 'suspend_user' : 'unsuspend_user', userId, null)
}

const STARTER_SECTIONS = (name: string) => [
  { type: 'profile', data: { name, bio: '' } },
  { type: 'socials', data: { items: [] } },
  { type: 'links', data: { items: [] } },
  { type: 'phone', data: { label: 'Call', numbers: [] } },
]

export type CreateResult = { ok: true; userId: string; siteId: string } | { ok: false; reason: string }

/** Create a login + its page in one step. A failed page insert removes the half-created user. */
export async function createAccount(ctx: Ctx, input: { email: string; name: string; password: string; username: string }): Promise<CreateResult> {
  const email = input.email.trim().toLowerCase()
  const name = input.name.trim().slice(0, 80)
  const username = input.username.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, reason: 'Invalid email.' }
  if (input.password.length < 8) return { ok: false, reason: 'Password must be at least 8 characters.' }
  if (!isValidUsername(username)) return { ok: false, reason: 'Page name: 3 to 32 lowercase letters, digits or hyphens.' }
  if ((await db.select({ id: sites.id }).from(sites).where(eq(sites.username, username)).limit(1)).length) return { ok: false, reason: 'That page name is taken.' }

  let userId: string
  try {
    const r = await auth.api.createUser({ body: { email, password: input.password, name: name || username, role: 'user' } })
    userId = r.user.id
  } catch (e) {
    return { ok: false, reason: (e as Error).message || 'Could not create the login.' }
  }
  try {
    const site = (await db.insert(sites).values({ userId, username, title: name || username }).returning())[0]
    await db.insert(sections).values(STARTER_SECTIONS(name || username).map((s, i) => ({ siteId: site.id, type: s.type, position: i, data: s.data })))
    await audit(ctx, 'create_account', userId, site.id, { email, username })
    return { ok: true, userId, siteId: site.id }
  } catch (e) {
    console.error('[admin] page insert failed, removing new user', (e as Error).message)
    await db.delete(user).where(eq(user.id, userId))
    return { ok: false, reason: 'That page name is taken.' }
  }
}

export async function setPassword(ctx: Ctx, userId: string, password: string) {
  if (password.length < 8) return { ok: false as const, reason: 'Password must be at least 8 characters.' }
  const hash = await (await auth.$context).password.hash(password)
  const r = await db.update(account).set({ password: hash, updatedAt: new Date() })
    .where(and(eq(account.userId, userId), eq(account.providerId, 'credential'))).returning({ id: account.id })
  if (!r.length) return { ok: false as const, reason: 'This account has no password login.' }
  await db.delete(session).where(eq(session.userId, userId))
  await audit(ctx, 'set_password', userId, null)
  return { ok: true as const }
}

export async function deleteSite(ctx: Ctx, siteId: string, confirm: string) {
  const s = (await db.select().from(sites).where(eq(sites.id, siteId)).limit(1))[0]
  if (!s) return { ok: false as const, reason: 'not_found' as const }
  if (confirm.trim().toLowerCase() !== s.username.toLowerCase()) return { ok: false as const, reason: 'confirm_mismatch' as const, userId: s.userId }
  await invalidateSite(s.username)
  await db.delete(sites).where(eq(sites.id, siteId))
  await audit(ctx, 'delete_site', s.userId, siteId, { username: s.username })
  return { ok: true as const, userId: s.userId }
}

// Type-to-confirm with the exact email; refuses admin accounts.
export async function deleteUser(ctx: Ctx, userId: string, confirmEmail: string) {
  const u = (await db.select().from(user).where(eq(user.id, userId)).limit(1))[0]
  if (!u) return { ok: false as const, reason: 'not_found' as const }
  if (isAdminEmail(u.email)) return { ok: false as const, reason: 'is_admin' as const }
  if (confirmEmail.trim().toLowerCase() !== u.email.toLowerCase()) return { ok: false as const, reason: 'confirm_mismatch' as const }

  await bustUserSiteCaches(userId)
  const mediaRows = await db.select({ key: media.key }).from(media).where(eq(media.userId, userId))
  await db.delete(user).where(eq(user.id, userId)) // cascades sessions, pages, sections, media rows
  for (const m of mediaRows) {
    await storage.del(m.key).catch((e) => console.error('[admin] media delete failed', m.key, (e as Error).message))
  }
  await audit(ctx, 'delete_user', userId, null, { email: u.email })
  return { ok: true as const }
}
