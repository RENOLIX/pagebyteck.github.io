import * as si from 'simple-icons'

interface Icon { title: string; slug: string; hex: string; path: string; stroke?: boolean }

// Simple Icons (CC0) — ~3.4k brand icons. Loaded once; inlined at render (no external requests).
const BRAND: Icon[] = (Object.values(si) as any[]).filter((x) => x && x.slug && x.path)
// simple-icons ships brand logos only, so generic and renamed entries live here (globe outline from lucide, ISC)
const EXTRA: Icon[] = [
  {
    slug: 'website', title: 'Website', hex: '64748b', stroke: true,
    path: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20',
  },
  { slug: 'googlereview', title: 'Google review', hex: '4285f4', path: BRAND.find((i) => i.slug === 'google')?.path ?? '' },
]
const ALL: Icon[] = [...EXTRA, ...BRAND]
const BY_SLUG = new Map(ALL.map((i) => [i.slug, i]))

export function getIcon(slug: string): Icon | null {
  return BY_SLUG.get(slug) ?? null
}

export function searchIcons(q: string, limit = 48): { slug: string; title: string; hex: string }[] {
  const s = q.trim().toLowerCase()
  if (!s) return []
  const starts = ALL.filter((i) => i.slug.startsWith(s) || i.title.toLowerCase().startsWith(s))
  const rest = ALL.filter((i) => !i.slug.startsWith(s) && !i.title.toLowerCase().startsWith(s) && (i.slug.includes(s) || i.title.toLowerCase().includes(s)))
  return [...starts, ...rest].slice(0, limit).map((i) => ({ slug: i.slug, title: i.title, hex: i.hex }))
}

/** Inline SVG for a slug. color defaults to currentColor (monochrome, inherits text color). */
export function iconSvg(slug: string, color = 'currentColor', size = 22): string | null {
  const i = BY_SLUG.get(slug)
  if (!i) return null
  const paint = i.stroke ? `fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"` : `fill="${color}"`
  return `<svg role="img" viewBox="0 0 24 24" width="${size}" height="${size}" ${paint} xmlns="http://www.w3.org/2000/svg"><title>${i.title}</title><path d="${i.path}"/></svg>`
}
