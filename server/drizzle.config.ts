import { defineConfig } from 'drizzle-kit'
import dotenv from 'dotenv'
import path from 'node:path'
import fs from 'node:fs'

// Load the repo-root .env regardless of the cwd drizzle-kit runs us from.
for (const p of ['../.env', '.env', '../../.env']) {
  const abs = path.resolve(process.cwd(), p)
  if (fs.existsSync(abs)) { dotenv.config({ path: abs }); break }
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
})
