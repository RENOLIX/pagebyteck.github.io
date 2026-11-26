import {
  pgTable, pgEnum, uuid, text, timestamp, integer, boolean, jsonb, index, primaryKey,
} from 'drizzle-orm/pg-core'

/* ============================ Better-Auth core ============================ */
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull().default(''),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  // admin plugin fields (only server code sets them)
  role: text('role'),
  banned: boolean('banned').notNull().default(false),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires', { mode: 'date', withTimezone: true }),
  suspended: boolean('suspended').notNull().default(false), // admin ban: blocks login + hides pages
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
})

// Append-only audit trail of every admin action.
export const adminActions = pgTable('admin_actions', {
  id: uuid('id').defaultRandom().primaryKey(),
  adminEmail: text('admin_email').notNull(),
  action: text('action').notNull(),
  targetUserId: text('target_user_id'),
  targetId: text('target_id'),
  detail: jsonb('detail').notNull().default({}),
  ip: text('ip'),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ createdIdx: index('admin_actions_created_idx').on(t.createdAt) }))

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { mode: 'date', withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  impersonatedBy: text('impersonated_by'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { mode: 'date', withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { mode: 'date', withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { mode: 'date', withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
})

/* =============================== pages =================================== */
export const siteStatusEnum = pgEnum('site_status', ['draft', 'published'])

export const sites = pgTable('sites', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  username: text('username').notNull().unique(),
  title: text('title').notNull().default(''),
  tokens: jsonb('tokens').notNull().default({}),
  seo: jsonb('seo').notNull().default({}),
  status: siteStatusEnum('status').notNull().default('draft'),
  renderedHtml: text('rendered_html'),
  renderedEtag: text('rendered_etag'),
  renderedAt: timestamp('rendered_at', { mode: 'date', withTimezone: true }),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp('published_at', { mode: 'date', withTimezone: true }),
}, (t) => ({ userIdx: index('sites_user_idx').on(t.userId) }))

export const sections = pgTable('sections', {
  id: uuid('id').defaultRandom().primaryKey(),
  siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  position: integer('position').notNull().default(0),
  visible: boolean('visible').notNull().default(true),
  data: jsonb('data').notNull().default({}),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ siteIdx: index('sections_site_idx').on(t.siteId, t.position) }))

// Uploaded images. key -> storage object (R2 or local).
export const media = pgTable('media', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  url: text('url').notNull(),
  width: integer('width'),
  height: integer('height'),
  bytes: integer('bytes'),
  createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }).notNull().defaultNow(),
}, (t) => ({ userIdx: index('media_user_idx').on(t.userId) }))

// Batched counters, never a row per view or click.
export const siteDailyStats = pgTable('site_daily_stats', {
  siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  views: integer('views').notNull().default(0),
}, (t) => ({ pk: primaryKey({ columns: [t.siteId, t.date] }) }))

// item = link/social/embed item id, or "phone" / "vcard"
export const clickDailyStats = pgTable('click_daily_stats', {
  siteId: uuid('site_id').notNull().references(() => sites.id, { onDelete: 'cascade' }),
  item: text('item').notNull(),
  date: text('date').notNull(),
  clicks: integer('clicks').notNull().default(0),
}, (t) => ({ pk: primaryKey({ columns: [t.siteId, t.item, t.date] }) }))

export type UserRow = typeof user.$inferSelect
export type SiteRow = typeof sites.$inferSelect
export type SectionRow = typeof sections.$inferSelect
export type MediaRow = typeof media.$inferSelect
