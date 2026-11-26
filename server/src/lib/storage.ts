import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import path from 'node:path'
import { AwsClient } from 'aws4fetch'
import { imageSize } from 'image-size'
import { config } from '../config'

export interface StoredFile { key: string; url: string }
export interface StorageDriver {
  put(buf: Buffer, ext: string, contentType: string): Promise<StoredFile>
  del(key: string): Promise<void>
}

const newName = (ext: string) => `${Date.now().toString(36)}-${randomBytes(8).toString('hex')}.${ext}`

// Local disk (dev). URL is relative /uploads/<name>, served on the public and dashboard hosts.
class LocalStorage implements StorageDriver {
  private dir = path.resolve(config.LOCAL_STORAGE_DIR)
  async put(buf: Buffer, ext: string): Promise<StoredFile> {
    mkdirSync(this.dir, { recursive: true })
    const name = newName(ext)
    writeFileSync(path.join(this.dir, name), buf)
    return { key: name, url: `/uploads/${name}` }
  }
  // basename() blocks traversal through a crafted key
  async del(key: string): Promise<void> {
    rmSync(path.join(this.dir, path.basename(key)), { force: true })
  }
}

// Cloudflare R2 over its S3 API; objects are served from the bucket's public custom domain.
export class R2Storage implements StorageDriver {
  private aws: AwsClient
  private endpoint: string
  private publicBase: string
  constructor(o: { accountId: string; accessKeyId: string; secretAccessKey: string; bucket: string; publicBase: string; endpoint?: string }) {
    this.aws = new AwsClient({ accessKeyId: o.accessKeyId, secretAccessKey: o.secretAccessKey, service: 's3', region: 'auto', retries: 2 })
    this.endpoint = `${o.endpoint ?? `https://${o.accountId}.r2.cloudflarestorage.com`}/${o.bucket}`
    this.publicBase = o.publicBase.replace(/\/$/, '')
  }
  async put(buf: Buffer, ext: string, contentType: string): Promise<StoredFile> {
    const key = `i/${newName(ext)}`
    const res = await this.aws.fetch(`${this.endpoint}/${key}`, {
      method: 'PUT',
      body: buf,
      headers: { 'content-type': contentType, 'cache-control': 'public, max-age=31536000, immutable' },
    })
    if (!res.ok) throw new Error(`r2_put_failed_${res.status}`)
    return { key, url: `${this.publicBase}/${key}` }
  }
  async del(key: string): Promise<void> {
    if (!/^i\/[a-z0-9]+-[a-f0-9]{16}\.[a-z]{3,4}$/.test(key)) throw new Error('r2_bad_key')
    const res = await this.aws.fetch(`${this.endpoint}/${key}`, { method: 'DELETE' })
    if (!res.ok && res.status !== 404) throw new Error(`r2_delete_failed_${res.status}`)
  }
}

export const storage: StorageDriver = config.STORAGE_DRIVER === 'r2'
  ? new R2Storage({
    accountId: config.R2_ACCOUNT_ID!, accessKeyId: config.R2_ACCESS_KEY_ID!, secretAccessKey: config.R2_SECRET_ACCESS_KEY!,
    bucket: config.R2_BUCKET!, publicBase: config.R2_PUBLIC_BASE!,
  })
  : new LocalStorage()

// Images only (video comes from embed links). Max 5 MB each.
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024

// What a browser claims is unreliable: a logo shared through a chat app arrives as
// application/octet-stream, and some phones send image/jpg. The format comes from the bytes,
// and only formats every browser can display are stored, so HEIC photos are refused here.
const DISPLAYABLE: Record<string, { ext: string; contentType: string }> = {
  png: { ext: 'png', contentType: 'image/png' },
  jpg: { ext: 'jpg', contentType: 'image/jpeg' },
  webp: { ext: 'webp', contentType: 'image/webp' },
  gif: { ext: 'gif', contentType: 'image/gif' },
  svg: { ext: 'svg', contentType: 'image/svg+xml' },
}

export function probeImage(buf: Buffer): { ext: string; contentType: string; width: number; height: number } | null {
  let d: { type?: string; width?: number; height?: number }
  try { d = imageSize(buf) } catch { return null }
  const kind = d.type ? DISPLAYABLE[d.type] : undefined
  if (!kind || !d.width || !d.height) return null
  return { ...kind, width: d.width, height: d.height }
}
