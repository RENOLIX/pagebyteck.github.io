import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'

// .env lives at the repo root (../../.env relative to /server/src); in Docker the env comes from app.env
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) })

const host = z.string().regex(/^[a-z0-9.-]+\.[a-z]{2,}$/i)

const Env = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().default(3100),
  HOST: z.enum(['127.0.0.1', '0.0.0.0']).default('127.0.0.1'),

  BRAND_NAME: z.string().min(1).max(40),
  PUBLIC_BASE_DOMAIN: host,
  DASHBOARD_DOMAIN: host,
  ADMIN_DOMAIN: host,

  // Accounts with these emails get admin rights in the dashboard and the admin panel.
  ADMIN_EMAILS: z.string().optional(),
  ADMIN_IP_ALLOWLIST: z.string().optional(),

  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),

  STORAGE_DRIVER: z.enum(['local', 'r2']).default('local'),
  LOCAL_STORAGE_DIR: z.string().default('./data/uploads'),
  R2_ACCOUNT_ID: z.string().regex(/^[a-f0-9]{32}$/).optional(),
  R2_ACCESS_KEY_ID: z.string().min(1).optional(),
  R2_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  R2_BUCKET: z.string().regex(/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/).optional(),
  R2_PUBLIC_BASE: z.string().regex(/^https:\/\/[a-z0-9.-]+(\/[A-Za-z0-9._-]+)*$/).optional(),
}).superRefine((e, ctx) => {
  if (e.STORAGE_DRIVER !== 'r2') return
  for (const k of ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_BASE'] as const) {
    if (!e[k]) ctx.addIssue({ code: z.ZodIssueCode.custom, path: [k], message: 'required when STORAGE_DRIVER=r2' })
  }
})

export const config = Env.parse(process.env)
export type Config = z.infer<typeof Env>
export const PUBLIC_BASE_URL = `https://${config.PUBLIC_BASE_DOMAIN}`

// isAdminEmail is the one source of truth for who is admin.
const ADMIN_EMAIL_SET = new Set(
  (config.ADMIN_EMAILS ?? '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
)
export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAIL_SET.has(email.trim().toLowerCase())
}
const ADMIN_IP_SET = new Set(
  (config.ADMIN_IP_ALLOWLIST ?? '').split(',').map((s) => s.trim()).filter(Boolean),
)
export function isAdminIpAllowed(ip?: string | null): boolean {
  if (ADMIN_IP_SET.size === 0) return true // no allowlist: any IP, still gated by sign-in
  return !!ip && ADMIN_IP_SET.has(ip.trim())
}
