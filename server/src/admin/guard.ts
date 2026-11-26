import type { Context, Next } from 'hono'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { auth } from '../auth'
import { config, isAdminEmail, isAdminIpAllowed } from '../config'
import { forbiddenPage } from './pages'

export type AdminEnv = { Variables: { adminEmail: string; sessionToken: string; ip: string } }

export function clientIp(c: Context): string {
  return (c.req.header('cf-connecting-ip') || (c.req.header('x-forwarded-for') ?? '').split(',')[0] || '').trim()
}

// CSRF synchronizer token bound to the (httpOnly, cross-site-unreadable) session token.
export function csrfToken(sessionToken: string): string {
  return createHmac('sha256', config.SESSION_SECRET).update('admin-csrf:' + sessionToken).digest('base64url')
}
export function csrfOk(sessionToken: string, provided: string): boolean {
  const a = Buffer.from(csrfToken(sessionToken))
  const b = Buffer.from(provided || '')
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Gate order: IP allowlist (if set), valid session, not suspended, admin email. */
export async function adminGuard(c: Context<AdminEnv>, next: Next) {
  const ip = clientIp(c)
  if (!isAdminIpAllowed(ip)) return c.text('Forbidden', 403)
  const s = await auth.api.getSession({ headers: c.req.raw.headers, query: { disableCookieCache: true } })
  if (!s?.user) return c.redirect('/login')
  const u = s.user as { email?: string; suspended?: boolean }
  if (u.suspended || !isAdminEmail(u.email)) return c.html(forbiddenPage('This account is not authorized for admin access.'), 403)
  c.set('adminEmail', u.email!)
  c.set('sessionToken', s.session.token)
  c.set('ip', ip)
  await next()
}
