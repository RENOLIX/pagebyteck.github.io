/**
 * End-to-end smoke test for a running box. Run inside the app container:
 *   node_modules/.bin/tsx src/scripts/smoke.mts
 * Needs ADMIN_EMAILS to contain smoke-admin@example.test. Creates throwaway accounts and removes them.
 */
import http from 'node:http'
import { randomUUID } from 'node:crypto'
import { and, eq, inArray } from 'drizzle-orm'
import { db, pool } from '../db/client.js'
import { user, sites, sections, clickDailyStats } from '../db/schema.js'
import { createAccount, setSuspended } from '../admin/actions.js'
import { renderSiteById } from '../services/render.js'
import { auth } from '../auth.js'
import { config, isAdminEmail } from '../config.js'

type Res = { status: number; headers: http.IncomingHttpHeaders; body: string }
function call(host: string, method: string, path: string, opts: { body?: unknown; cookie?: string } = {}): Promise<Res> {
  const body = opts.body === undefined ? undefined : JSON.stringify(opts.body)
  const headers: Record<string, string | number> = { host, origin: `https://${host}` }
  if (body !== undefined) { headers['content-type'] = 'application/json'; headers['content-length'] = Buffer.byteLength(body) }
  if (opts.cookie) headers.cookie = opts.cookie
  return new Promise((resolve, reject) => {
    const r = http.request({ host: '127.0.0.1', port: config.PORT, method, path, headers }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }))
    })
    r.on('error', reject)
    if (body !== undefined) r.write(body)
    r.end()
  })
}
const cookieOf = (r: Res) => (r.headers['set-cookie'] ?? []).map((c) => c.split(';')[0]).join('; ')

let failed = 0
function check(name: string, ok: boolean, detail = '') {
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? '  ' + detail : ''}`)
}

const PUB = config.PUBLIC_BASE_DOMAIN
const DASH = config.DASHBOARD_DOMAIN
const stamp = Date.now().toString(36)
const ctx = { adminEmail: 'smoke', ip: '127.0.0.1' }
const password = 'smoke-' + randomUUID()
const created: string[] = []

async function signIn(email: string) {
  const r = await call(DASH, 'POST', '/api/auth/sign-in/email', { body: { email, password } })
  return { status: r.status, cookie: cookieOf(r) }
}

try {
  check('public host serves /health', (await call(PUB, 'GET', '/health')).status === 200)
  check('admin panel redirects without a session', (await call(config.ADMIN_DOMAIN, 'GET', '/')).status === 302)
  const signup = await call(DASH, 'POST', '/api/auth/sign-up/email', { body: { email: `x-${stamp}@example.test`, password, name: 'x' } })
  check('public signup is refused', signup.status >= 400, `status ${signup.status}`)

  const a = await createAccount(ctx, { email: `smoke-a-${stamp}@example.test`, name: 'Smoke A', password, username: `smoke-a-${stamp}` })
  const b = await createAccount(ctx, { email: `smoke-b-${stamp}@example.test`, name: 'Smoke B', password, username: `smoke-b-${stamp}` })
  check('admin creates two accounts with pages', a.ok && b.ok, JSON.stringify({ a, b }))
  if (!a.ok || !b.ok) throw new Error('account creation failed')
  created.push(a.userId, b.userId)
  const dupe = await createAccount(ctx, { email: `smoke-c-${stamp}@example.test`, name: 'dupe', password, username: `smoke-a-${stamp}` })
  check('duplicate page name is rejected and leaves no login', !dupe.ok && !(await db.select().from(user).where(eq(user.email, `smoke-c-${stamp}@example.test`))).length)

  // admin publishes A with a vCard and an embed (done at the data layer)
  await db.insert(sections).values([
    { siteId: a.siteId, type: 'vcard', position: 10, data: { label: 'Save', firstName: 'Smoke', lastName: 'A', phones: [{ label: '', number: '+213 555 00 00 00' }] } },
    { siteId: a.siteId, type: 'embed', position: 11, data: { heading: '', items: [{ id: 'emb1', url: 'https://youtube.com/shorts/abcDEF12345' }] } },
  ])
  await db.update(sites).set({ status: 'published', publishedAt: new Date() }).where(eq(sites.id, a.siteId))
  await renderSiteById(a.siteId)

  const s = await signIn(`smoke-a-${stamp}@example.test`)
  check('user signs in', s.status === 200 && s.cookie.includes('session_token'), `status ${s.status}`)
  const me = JSON.parse((await call(DASH, 'GET', '/api/me', { cookie: s.cookie })).body)
  check('user is not admin', me.isAdmin === false && me.brand === config.BRAND_NAME)

  const list = JSON.parse((await call(DASH, 'GET', '/api/sites', { cookie: s.cookie })).body)
  check('user sees only their page', list.sites.length === 1 && list.sites[0].id === a.siteId)
  const full = JSON.parse((await call(DASH, 'GET', `/api/sites/${a.siteId}`, { cookie: s.cookie })).body)
  const types = full.sections.map((x: { type: string }) => x.type).sort()
  check('user gets only icon blocks', JSON.stringify(types) === JSON.stringify(['links', 'phone', 'socials']), types.join(','))

  check("user can't open another account's page", (await call(DASH, 'GET', `/api/sites/${b.siteId}`, { cookie: s.cookie })).status === 404)
  check("user can't publish", (await call(DASH, 'POST', `/api/sites/${a.siteId}/publish`, { cookie: s.cookie })).status === 403)
  check("user can't change the design", (await call(DASH, 'PATCH', `/api/sites/${a.siteId}`, { cookie: s.cookie, body: { title: 'x' } })).status === 403)
  const [profile] = await db.select().from(sections).where(and(eq(sections.siteId, a.siteId), eq(sections.type, 'profile')))
  const profileEdit = await call(DASH, 'PATCH', `/api/sections/${profile.id}`, { cookie: s.cookie, body: { data: { name: 'hacked' } } })
  check("user can't edit the profile block, and is told why", profileEdit.status === 403 && profileEdit.body.includes('admin_only'), `status ${profileEdit.status} ${profileEdit.body.slice(0, 40)}`)
  const [linksB] = await db.select().from(sections).where(and(eq(sections.siteId, b.siteId), eq(sections.type, 'links')))
  check('2FA endpoints are gone', (await call(DASH, 'POST', '/api/auth/two-factor/enable', { cookie: s.cookie, body: { password } })).status === 404)
  const userPanel = cookieOf(await call(config.ADMIN_DOMAIN, 'POST', '/api/auth/sign-in/email', { body: { email: `smoke-a-${stamp}@example.test`, password } }))
  check('normal user is refused by the admin panel', (await call(config.ADMIN_DOMAIN, 'GET', '/', { cookie: userPanel })).status === 403)
  check("user can't edit another page's links", (await call(DASH, 'PATCH', `/api/sections/${linksB.id}`, { cookie: s.cookie, body: { data: { items: [] } } })).status === 404)

  const [links] = await db.select().from(sections).where(and(eq(sections.siteId, a.siteId), eq(sections.type, 'links')))
  const patch = await call(DASH, 'PATCH', `/api/sections/${links.id}`, { cookie: s.cookie, body: { data: { items: [{ id: 'lnk1', label: 'Smoke link', url: 'https://example.com', icon: 'instagram' }] } } })
  check('user edits their links', patch.status === 200, `status ${patch.status}`)
  const [phone] = await db.select().from(sections).where(and(eq(sections.siteId, a.siteId), eq(sections.type, 'phone')))
  await call(DASH, 'PATCH', `/api/sections/${phone.id}`, { cookie: s.cookie, body: { data: { label: 'Call', numbers: [{ label: 'Office', number: '+213555111111' }, { label: 'Mobile', number: '0661222222' }] } } })

  const page = await call(PUB, 'GET', `/smoke-a-${stamp}`)
  check('user edit is live on the public page', page.status === 200 && page.body.includes('Smoke link') && page.body.includes('<details class="phone">'))
  check('page has vCard button and embed facade', page.body.includes('/contact.vcf') && page.body.includes('youtube-nocookie.com/embed/abcDEF12345'))

  const vcf = await call(PUB, 'GET', `/smoke-a-${stamp}/contact.vcf`)
  check('vCard downloads as text/vcard', vcf.status === 200 && String(vcf.headers['content-type']).startsWith('text/vcard') && vcf.body.startsWith('BEGIN:VCARD\r\n') && vcf.body.includes('TEL;TYPE=CELL:+213555000000'))
  check('unpublished page returns 404', (await call(PUB, 'GET', `/smoke-b-${stamp}`)).status === 404)

  check('click beacon accepted', (await call(PUB, 'POST', `/c?u=smoke-a-${stamp}&k=lnk1`)).status === 204)
  check('click beacon with junk key ignored', (await call(PUB, 'POST', `/c?u=smoke-a-${stamp}&k=%3Cscript%3E`)).status === 204)
  const stats = JSON.parse((await call(DASH, 'GET', `/api/sites/${a.siteId}/stats?range=7d`, { cookie: s.cookie })).body)
  const views = stats.views.reduce((n: number, r: { views: number }) => n + r.views, 0)
  const lnk = stats.clicks.find((c: { item: string }) => c.item === 'lnk1')
  check('stats show the view and the labelled click', views >= 1 && lnk?.clicks === 1 && lnk?.label === 'Smoke link', JSON.stringify(stats))

  await setSuspended(ctx, a.userId, true)
  const afterSuspend = await call(DASH, 'GET', '/api/me', { cookie: s.cookie })
  check('suspension cuts API access immediately', afterSuspend.status === 401 || afterSuspend.status === 403, `status ${afterSuspend.status}`)
  // page takedown busts the server's in-process cache, so it is checked through the admin panel in the browser run
  check('suspended user cannot sign in', (await signIn(`smoke-a-${stamp}@example.test`)).status >= 400)

  if (isAdminEmail('smoke-admin@example.test')) {
    // sign-in allows 3 tries per 10 s per IP and the checks above used them up
    await new Promise((r) => setTimeout(r, 11_000))
    await db.delete(user).where(eq(user.email, 'smoke-admin@example.test'))
    await auth.api.createUser({ body: { email: 'smoke-admin@example.test', password, name: 'Smoke admin', role: 'admin' } })
    const adm = await signIn('smoke-admin@example.test')
    const admMe = JSON.parse((await call(DASH, 'GET', '/api/me', { cookie: adm.cookie })).body)
    check('allowlisted admin gets admin rights', admMe.isAdmin === true)
    const panel = await call(config.ADMIN_DOMAIN, 'GET', '/', { cookie: (await call(config.ADMIN_DOMAIN, 'POST', '/api/auth/sign-in/email', { body: { email: 'smoke-admin@example.test', password } })).headers['set-cookie']?.map((c) => c.split(';')[0]).join('; ') })
    check('admin panel opens for the admin', panel.status === 200 && panel.body.includes('Overview'), `status ${panel.status}`)
  } else {
    check('smoke-admin@example.test is in ADMIN_EMAILS', false)
  }
} catch (e) {
  check('smoke run completed', false, (e as Error).stack ?? String(e))
} finally {
  const ids = [...created, ...(await db.select({ id: user.id }).from(user).where(inArray(user.email, ['smoke-admin@example.test']))).map((r) => r.id)]
  if (ids.length) await db.delete(user).where(inArray(user.id, ids))
  const left = await db.select({ id: sites.id }).from(sites).innerJoin(user, eq(sites.userId, user.id)).where(inArray(user.id, ids.length ? ids : ['none']))
  await db.delete(clickDailyStats).where(inArray(clickDailyStats.siteId, left.map((l) => l.id).concat(['00000000-0000-0000-0000-000000000000'])))
  console.log(`cleanup: removed ${ids.length} smoke accounts, ${left.length} pages left`)
  await pool.end()
  console.log(failed ? `SMOKE FAILED (${failed})` : 'SMOKE OK')
  process.exit(failed ? 1 : 0)
}
