import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer, type IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'

process.env.BRAND_NAME ??= 'Test'
process.env.PUBLIC_BASE_DOMAIN ??= 'pages.example.com'
process.env.DASHBOARD_DOMAIN ??= 'app.example.com'
process.env.ADMIN_DOMAIN ??= 'admin.example.com'
process.env.DATABASE_URL ??= 'postgres://x:y@127.0.0.1:1/x'
process.env.SESSION_SECRET ??= 'x'.repeat(32)
process.env.STORAGE_DRIVER = 'local'

type Seen = { method?: string; url?: string; headers: IncomingMessage['headers']; body: Buffer }

async function stub(status: number) {
  const seen: Seen[] = []
  const srv = createServer((req, res) => {
    const chunks: Buffer[] = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', () => { seen.push({ method: req.method, url: req.url, headers: req.headers, body: Buffer.concat(chunks) }); res.statusCode = status; res.end() })
  })
  await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r))
  return { seen, endpoint: `http://127.0.0.1:${(srv.address() as AddressInfo).port}`, close: () => srv.close() }
}

const opts = (endpoint: string) => ({ accountId: 'a'.repeat(32), accessKeyId: 'AKTEST', secretAccessKey: 'secret', bucket: 'media', publicBase: 'https://media.example.com/', endpoint })

test('put signs a PUT to bucket/i/<key> and returns the public url', async () => {
  const { R2Storage } = await import('./storage')
  const s = await stub(200)
  try {
    const r2 = new R2Storage(opts(s.endpoint))
    const out = await r2.put(Buffer.from('pngbytes'), 'png', 'image/png')
    assert.match(out.key, /^i\/[a-z0-9]+-[a-f0-9]{16}\.png$/)
    assert.equal(out.url, `https://media.example.com/${out.key}`)
    const req = s.seen[0]
    assert.equal(req.method, 'PUT')
    assert.equal(req.url, `/media/${out.key}`)
    assert.equal(req.headers['content-type'], 'image/png')
    assert.match(String(req.headers.authorization), /^AWS4-HMAC-SHA256 Credential=AKTEST\/\d{8}\/auto\/s3\/aws4_request/)
    assert.ok(req.headers['x-amz-content-sha256'])
    assert.equal(req.body.toString(), 'pngbytes')
  } finally { s.close() }
})

test('put throws on a non-2xx response', async () => {
  const { R2Storage } = await import('./storage')
  const s = await stub(403)
  try {
    await assert.rejects(new R2Storage(opts(s.endpoint)).put(Buffer.from('x'), 'png', 'image/png'), /r2_put_failed_403/)
  } finally { s.close() }
})

test('del sends DELETE, tolerates 404 and refuses keys outside i/', async () => {
  const { R2Storage } = await import('./storage')
  const s = await stub(404)
  try {
    const r2 = new R2Storage(opts(s.endpoint))
    await r2.del('i/abc123-0123456789abcdef.png')
    assert.equal(s.seen[0].method, 'DELETE')
    await assert.rejects(r2.del('../other/secret.txt'), /r2_bad_key/)
    assert.equal(s.seen.length, 1)
  } finally { s.close() }
})

// real one-pixel-ish files, so the probe is exercised on bytes browsers actually send
const FIXTURES: Record<string, string> = {
  png: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGPgEpEDAABoAD1UCKP3AAAAAElFTkSuQmCC',
  gif: 'R0lGODdhBAAFAIEAAAoUHgAAAAAAAAAAACwAAAAABAAFAAAICQABCBxIsGDBgAA7',
  webp: 'UklGRi4AAABXRUJQVlA4ICIAAABwAQCdASoGAAcAAUAmJZQCdAFAAAD+/DeBV/fU6D4r4AAA',
}

test('probeImage reads the format from the bytes, not from what the browser claims', async () => {
  const { probeImage } = await import('./storage')
  assert.deepEqual(probeImage(Buffer.from(FIXTURES.png, 'base64')), { ext: 'png', contentType: 'image/png', width: 1, height: 1 })
  assert.deepEqual(probeImage(Buffer.from(FIXTURES.gif, 'base64')), { ext: 'gif', contentType: 'image/gif', width: 4, height: 5 })
  assert.deepEqual(probeImage(Buffer.from(FIXTURES.webp, 'base64')), { ext: 'webp', contentType: 'image/webp', width: 6, height: 7 })
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="60"><circle r="10"/></svg>')
  assert.deepEqual(probeImage(svg), { ext: 'svg', contentType: 'image/svg+xml', width: 120, height: 60 })
})

test('probeImage refuses anything a browser cannot display', async () => {
  const { probeImage } = await import('./storage')
  assert.equal(probeImage(Buffer.from('not an image at all')), null)
  assert.equal(probeImage(Buffer.alloc(0)), null)
  // iPhone HEIC: a real image, but no browser renders it, so it must not be stored
  assert.equal(probeImage(Buffer.concat([Buffer.from('\0\0\0\x18ftypheic'), Buffer.alloc(64)])), null)
})
