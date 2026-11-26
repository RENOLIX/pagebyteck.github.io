export type EmbedKind = 'youtube' | 'tiktok' | 'instagram' | 'x' | 'facebook'
export interface Embed { kind: EmbedKind; src: string; ratio: '16/9' | '9/16' | '4/5'; thumb?: string }

// Iframe hosts the page script may ever load; parseEmbed only produces these.
export const EMBED_HOSTS = [
  'https://www.youtube-nocookie.com/embed/',
  'https://www.tiktok.com/player/v1/',
  'https://www.instagram.com/',
  'https://platform.twitter.com/embed/',
  'https://www.facebook.com/plugins/',
]

/**
 * Turn a pasted social link into an iframe src on a fixed provider host, built from a validated id.
 * A raw user URL never reaches an iframe. Instagram, X and Facebook iframe URLs are the providers'
 * long-standing public embed endpoints (their docs push script widgets, which we avoid for weight).
 */
export function parseEmbed(raw: string): Embed | null {
  let u: URL
  try { u = new URL(String(raw).trim()) } catch { return null }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null
  const host = u.hostname.toLowerCase().replace(/^(www|m|mobile)\./, '')
  const seg = u.pathname.split('/').filter(Boolean)

  if (host === 'youtube.com' || host === 'youtu.be' || host === 'youtube-nocookie.com') {
    let id = ''
    let short = false
    if (host === 'youtu.be') id = seg[0] ?? ''
    else if (seg[0] === 'watch') id = u.searchParams.get('v') ?? ''
    else if (seg[0] === 'shorts') { id = seg[1] ?? ''; short = true }
    else if (seg[0] === 'embed' || seg[0] === 'live') id = seg[1] ?? ''
    if (!/^[\w-]{11}$/.test(id)) return null
    return { kind: 'youtube', src: `https://www.youtube-nocookie.com/embed/${id}`, ratio: short ? '9/16' : '16/9', thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` }
  }

  if (host === 'tiktok.com') {
    const id = seg[1] === 'video' ? seg[2] ?? '' : ''
    if (!/^\d{8,25}$/.test(id)) return null
    return { kind: 'tiktok', src: `https://www.tiktok.com/player/v1/${id}`, ratio: '9/16' }
  }

  if (host === 'instagram.com') {
    const type = seg[0] === 'p' ? 'p' : seg[0] === 'reel' || seg[0] === 'reels' ? 'reel' : ''
    const code = seg[1] ?? ''
    if (!type || !/^[\w-]{5,40}$/.test(code)) return null
    return { kind: 'instagram', src: `https://www.instagram.com/${type}/${code}/embed/`, ratio: type === 'p' ? '4/5' : '9/16' }
  }

  if (host === 'x.com' || host === 'twitter.com') {
    const id = seg[1] === 'status' ? seg[2] ?? '' : ''
    if (!/^\d{5,25}$/.test(id)) return null
    return { kind: 'x', src: `https://platform.twitter.com/embed/Tweet.html?id=${id}`, ratio: '4/5' }
  }

  if (host === 'facebook.com' || host === 'fb.watch') {
    if (!seg.length) return null
    const path = u.pathname.replace(/[^\w\-./%]/g, '')
    const href = `https://${u.hostname.toLowerCase()}${path}${seg[0] === 'watch' ? `?v=${(u.searchParams.get('v') ?? '').replace(/\D/g, '')}` : ''}`
    const video = host === 'fb.watch' || seg[0] === 'watch' || seg[0] === 'reel' || seg.includes('videos')
    return video
      ? { kind: 'facebook', src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(href)}&show_text=false`, ratio: '16/9' }
      : { kind: 'facebook', src: `https://www.facebook.com/plugins/post.php?href=${encodeURIComponent(href)}&show_text=true`, ratio: '4/5' }
  }

  return null
}
