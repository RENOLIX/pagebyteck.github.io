import { Hono } from 'hono'
import type { Context } from 'hono'
import { auth } from '../auth'
import { config } from '../config'
import { adminGuard, csrfToken, csrfOk, type AdminEnv } from './guard'
import * as data from './data'
import * as act from './actions'
import * as ui from './pages'

export const adminApp = new Hono<AdminEnv>()

// Better-Auth on the admin host for login; host-only cookie on the admin domain.
adminApp.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw))
adminApp.get('/login', (c) => c.html(ui.loginPage()))
adminApp.get('/logout', async (c) => {
  await auth.api.signOut({ headers: c.req.raw.headers }).catch(() => {})
  return c.redirect('/login')
})
adminApp.get('/robots.txt', (c) => { c.header('content-type', 'text/plain'); return c.body('User-agent: *\nDisallow: /\n') })

// everything below requires a signed-in admin (email allowlist)
adminApp.use('*', adminGuard)

const actor = (c: Context<AdminEnv>) => ({ adminEmail: c.get('adminEmail'), ip: c.get('ip') })
const pageNum = (c: Context<AdminEnv>) => Math.max(0, parseInt(c.req.query('page') || '0', 10) || 0)
const csrf = (c: Context<AdminEnv>) => csrfToken(c.get('sessionToken'))
// POST body with CSRF (token bound to session) + same-origin check; null means reject.
async function guardedBody(c: Context<AdminEnv>): Promise<Record<string, string> | null> {
  const origin = c.req.header('origin')
  if (origin && origin !== `https://${config.ADMIN_DOMAIN}`) return null
  const b = await c.req.parseBody().catch(() => ({}))
  if (!csrfOk(c.get('sessionToken'), String((b as Record<string, unknown>)._csrf ?? ''))) return null
  return b as Record<string, string>
}
const str = (v: unknown) => (typeof v === 'string' ? v : '')

adminApp.get('/', async (c) => c.html(ui.overviewPage(await data.overview(), c.get('adminEmail'))))
adminApp.get('/users', async (c) => c.html(ui.usersPage(await data.listUsers(c.req.query('q') ?? '', pageNum(c)), csrf(c), c.get('adminEmail'))))
adminApp.get('/users/:id', async (c) => {
  const d = await data.getUserDetail(c.req.param('id'))
  if (!d) return c.html(ui.forbiddenPage('User not found.'), 404)
  return c.html(ui.userDetailPage(d, csrf(c), c.get('adminEmail'), c.req.query('msg') ?? ''))
})
adminApp.get('/analytics', async (c) => c.html(ui.analyticsPage(await data.topSites(), c.get('adminEmail'))))
adminApp.get('/audit', async (c) => c.html(ui.auditPage(await data.recentAudit(), c.get('adminEmail'))))

adminApp.post('/users/create', async (c) => {
  const b = await guardedBody(c); if (!b) return c.text('forbidden', 403)
  const r = await act.createAccount(actor(c), { email: str(b.email), name: str(b.name), password: str(b.password), username: str(b.username) })
  if (r.ok) return c.redirect('/users/' + r.userId)
  return c.html(ui.usersPage(await data.listUsers('', 0), csrf(c), c.get('adminEmail'), r.reason), 400)
})
adminApp.post('/users/:id/suspend', async (c) => {
  const b = await guardedBody(c); if (!b) return c.text('forbidden', 403)
  await act.setSuspended(actor(c), c.req.param('id'), b.suspend === '1')
  return c.redirect('/users/' + c.req.param('id'))
})
adminApp.post('/users/:id/password', async (c) => {
  const b = await guardedBody(c); if (!b) return c.text('forbidden', 403)
  const r = await act.setPassword(actor(c), c.req.param('id'), str(b.password))
  return c.redirect(`/users/${c.req.param('id')}?msg=${encodeURIComponent(r.ok ? 'Password updated.' : r.reason)}`)
})
adminApp.post('/users/:id/delete', async (c) => {
  const b = await guardedBody(c); if (!b) return c.text('forbidden', 403)
  const r = await act.deleteUser(actor(c), c.req.param('id'), str(b.confirm))
  return r.ok ? c.redirect('/users') : c.redirect(`/users/${c.req.param('id')}?msg=${encodeURIComponent('Not deleted: ' + r.reason)}`)
})
adminApp.post('/sites/:id/delete', async (c) => {
  const b = await guardedBody(c); if (!b) return c.text('forbidden', 403)
  const r = await act.deleteSite(actor(c), c.req.param('id'), str(b.confirm))
  if ('userId' in r && r.userId) return c.redirect(`/users/${r.userId}${r.ok ? '' : '?msg=' + encodeURIComponent('Type the page name to confirm.')}`)
  return c.redirect('/users')
})
