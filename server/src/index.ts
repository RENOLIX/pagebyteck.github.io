import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { existsSync, readFileSync } from 'node:fs'
import { Hono } from 'hono'
import type { Context, Next } from 'hono'
import { config } from './config'
import { auth } from './auth'
import { apiRoutes } from './routes/api'
import { publicRoutes } from './routes/public'
import { adminApp } from './admin/routes'

const immutable = async (c: Context, next: Next) => {
  await next()
  c.header('cache-control', 'public, max-age=31536000, immutable')
}
const uploads = async (c: Context, next: Next) => {
  await next()
  c.header('cache-control', 'public, max-age=31536000, immutable')
  c.header('x-content-type-options', 'nosniff')
  // an uploaded SVG opened directly is a document on our own origin; the sandbox keeps it inert
  c.header('content-security-policy', "default-src 'none'; style-src 'unsafe-inline'; sandbox")
}
// files uploaded before a switch to R2 keep their /uploads URLs, so keep serving them while the folder exists
const localUploads = config.STORAGE_DRIVER === 'local' || existsSync(config.LOCAL_STORAGE_DIR)

/* ---------------------------- public page host ---------------------------- */
const publicApp = new Hono()
publicApp.use('/assets/*', immutable)
publicApp.use('/assets/*', serveStatic({ root: './public' }))
if (localUploads) {
  publicApp.use('/uploads/*', uploads)
  publicApp.use('/uploads/*', serveStatic({ root: './data' }))
}
publicApp.route('/', publicRoutes)

/* ------------------------------ dashboard host ---------------------------- */
const DASH = '../web/dist'
const dashApp = new Hono()
dashApp.on(['GET', 'POST'], '/api/auth/*', (c) => auth.handler(c.req.raw))
dashApp.route('/api', apiRoutes)
dashApp.get('/robots.txt', (c) => { c.header('content-type', 'text/plain'); return c.body('User-agent: *\nDisallow: /\n') })
// fonts for the editor preview iframe
dashApp.use('/assets/fonts/*', immutable)
dashApp.use('/assets/fonts/*', serveStatic({ root: './public' }))
if (localUploads) {
  dashApp.use('/uploads/*', uploads)
  dashApp.use('/uploads/*', serveStatic({ root: './data' }))
}
if (!existsSync(`${DASH}/index.html`)) throw new Error(`dashboard build missing at ${DASH}; run npm run build -w web`)
const indexHtml = readFileSync(`${DASH}/index.html`, 'utf8')
dashApp.use('/assets/*', immutable)
dashApp.use('/*', serveStatic({ root: DASH }))
dashApp.get('*', (c) => c.html(indexHtml)) // SPA fallback

/* ------------------------------ host dispatch ----------------------------- */
const app = new Hono()
app.all('*', (c) => {
  const h = (c.req.header('host') ?? '').split(':')[0].toLowerCase()
  const target = h === config.ADMIN_DOMAIN ? adminApp : h === config.DASHBOARD_DOMAIN ? dashApp : publicApp
  return target.fetch(c.req.raw)
})

const server = serve(
  { fetch: app.fetch, port: config.PORT, hostname: config.HOST },
  (info) => console.log(`[app] listening on http://${config.HOST}:${info.port} storage=${config.STORAGE_DRIVER}`),
)
const shutdown = () => server.close(() => process.exit(0))
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
