/**
 * Bootstrap the first admin login (public signup is disabled).
 * Usage: NEW_ADMIN_EMAIL=... NEW_ADMIN_PASSWORD=... tsx src/scripts/create-admin.mts
 * The email must already be listed in ADMIN_EMAILS. Idempotent: an existing account is left untouched.
 */
import { eq } from 'drizzle-orm'
import { auth } from '../auth.js'
import { db, pool } from '../db/client.js'
import { user } from '../db/schema.js'
import { isAdminEmail } from '../config.js'

const email = (process.env.NEW_ADMIN_EMAIL ?? '').trim().toLowerCase()
const password = process.env.NEW_ADMIN_PASSWORD ?? ''
if (!isAdminEmail(email)) { console.error('NEW_ADMIN_EMAIL must be listed in ADMIN_EMAILS'); process.exit(1) }
if (password.length < 12) { console.error('NEW_ADMIN_PASSWORD must be at least 12 characters'); process.exit(1) }

if ((await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1)).length) {
  console.log('admin account already exists, nothing changed')
} else {
  await auth.api.createUser({ body: { email, password, name: 'Admin', role: 'admin' } })
  console.log('admin account created; sign in on the dashboard or the admin panel')
}
await pool.end()
