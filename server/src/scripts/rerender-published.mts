/** One-off: re-render every published page after a renderer change, then restart the app container. */
import { db, pool } from '../db/client.js'
import { sites } from '../db/schema.js'
import { eq } from 'drizzle-orm'
import { renderSiteById, invalidateSite } from '../services/render.js'

const published = await db.select({ id: sites.id, username: sites.username }).from(sites).where(eq(sites.status, 'published'))
let ok = 0, fail = 0
for (const s of published) {
  try {
    await renderSiteById(s.id)
    await invalidateSite(s.username)
    ok++
  } catch (e) {
    fail++
    console.error(`FAIL ${s.username}:`, (e as Error).message)
  }
}
console.log(`re-rendered ${ok}/${published.length} published pages (${fail} failed)`)
await pool.end()
process.exit(fail ? 1 : 0)
