import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins'
import { eq } from 'drizzle-orm'
import { APIError } from 'better-auth/api'
import { db } from './db/client'
import { user, session, account, verification } from './db/schema'
import { config } from './config'

const secureCookies = config.NODE_ENV === 'production'

export const auth = betterAuth({
  appName: config.BRAND_NAME,
  baseURL: `https://${config.DASHBOARD_DOMAIN}`,
  secret: config.SESSION_SECRET,
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, account, verification },
  }),
  plugins: [
    // accounts are created only by the admin panel (server-side auth.api.createUser)
    admin(),
  ],
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 8,
  },
  user: {
    additionalFields: {
      suspended: { type: 'boolean', required: false, defaultValue: false, input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  databaseHooks: {
    // a suspended account cannot mint a new session; existing ones are deleted at suspend time
    session: {
      create: {
        before: async (s) => {
          const u = (await db.select({ suspended: user.suspended }).from(user).where(eq(user.id, s.userId)).limit(1))[0]
          if (u?.suspended) throw new APIError('FORBIDDEN', { message: 'This account has been suspended.' })
          return { data: s }
        },
      },
    },
  },
  advanced: {
    // host-only cookie: the public page host stays cookieless, so a page-render XSS can't reach a session
    crossSubDomainCookies: { enabled: false },
    defaultCookieAttributes: { sameSite: 'lax', secure: secureCookies },
  },
  trustedOrigins: [
    `https://${config.DASHBOARD_DOMAIN}`,
    `https://${config.ADMIN_DOMAIN}`,
    ...(config.NODE_ENV === 'production' ? [] : ['http://localhost:5173', 'http://127.0.0.1:5173']),
  ],
})

export type Auth = typeof auth
