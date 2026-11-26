import { z } from 'zod'

/**
 * Page design tokens. Every value that reaches the rendered <style> is an enum, a clamped number,
 * a #rrggbb color, or a vetted image URL, never free CSS, so a stored value can't break out of the sink.
 */

export interface FontPair {
  id: string
  name: string
  display: string
  body: string
  displayAr: string
  bodyAr: string
}

export const FONT_PAIRS: FontPair[] = [
  { id: 'inter', name: 'Inter', display: 'Inter', body: 'Inter', displayAr: 'Cairo', bodyAr: 'Cairo' },
  { id: 'fraunces', name: 'Fraunces', display: 'Fraunces', body: 'Inter', displayAr: 'Rubik', bodyAr: 'Cairo' },
  { id: 'space', name: 'Space Grotesk', display: '"Space Grotesk"', body: 'Inter', displayAr: 'Rubik', bodyAr: 'Cairo' },
  { id: 'plex', name: 'IBM Plex', display: '"IBM Plex Sans"', body: '"IBM Plex Sans"', displayAr: '"IBM Plex Sans Arabic"', bodyAr: '"IBM Plex Sans Arabic"' },
  { id: 'sora', name: 'Sora', display: 'Sora', body: 'Inter', displayAr: 'Tajawal', bodyAr: 'Tajawal' },
]

export const RADII = ['none', 'sm', 'md', 'lg', 'full'] as const
export const SHADOWS = ['none', 'sm', 'md', 'lg'] as const
export const BUTTON_STYLES = ['solid', 'outline', 'glass'] as const
export const MODES = ['light', 'dark'] as const
export const DIRECTIONS = ['ltr', 'rtl'] as const
export const BG_KINDS = ['color', 'gradient', 'image'] as const
export const GLOW_MODES = ['logo', 'color'] as const

const hex = (def: string) => z.string().regex(/^#[0-9a-fA-F]{6}$/).catch(def)
const pct = (def: number) => z.number().int().min(0).max(100).catch(def)

// Background images come only from our uploads or plain https; no quotes, parens or backslashes can reach url().
export const SAFE_IMAGE_URL = /^(https:\/\/[^\s"'()\\<>]{1,900}|\/uploads\/[A-Za-z0-9._-]{1,120})$/

export const SiteTokens = z.object({
  fontPair: z.string().max(24).default('inter'),
  mode: z.enum(MODES).catch('light'),
  direction: z.enum(DIRECTIONS).catch('ltr'),
  accent: hex('#2563eb'),
  textColor: hex('#111111'),
  bgKind: z.enum(BG_KINDS).catch('color'),
  bgColor: hex('#f4f4f5'),
  bgColor2: hex('#dbeafe'),
  bgImage: z.string().max(1000).catch('').transform((v) => (SAFE_IMAGE_URL.test(v) ? v : '')),
  overlayColor: hex('#000000'),
  overlayOpacity: pct(0),
  buttonStyle: z.enum(BUTTON_STYLES).catch('solid'),
  buttonColor: hex('#ffffff'),
  buttonText: hex('#111111'),
  glassOpacity: pct(18),
  glassBlur: z.number().int().min(0).max(30).catch(12),
  radius: z.enum(RADII).catch('lg'),
  shadow: z.enum(SHADOWS).catch('sm'),
  textShadow: z.boolean().catch(false),
  avatarGlow: z.boolean().catch(false),
  avatarGlowMode: z.enum(GLOW_MODES).catch('logo'),
  avatarGlowColor: hex('#f5c542'),
  avatarGlowStrength: pct(60),
  glowAll: z.boolean().catch(false),
  glassPanel: z.boolean().catch(false),
})
export type SiteTokens = z.infer<typeof SiteTokens>

export const SiteSeo = z.object({
  title: z.string().max(120).default(''),
  description: z.string().max(300).default(''),
  favicon: z.string().max(1000).default(''),
})
export type SiteSeo = z.infer<typeof SiteSeo>

export function getFontPair(id: string): FontPair {
  return FONT_PAIRS.find((f) => f.id === id) ?? FONT_PAIRS[0]
}

/** Reserved path segments that can never be a username. */
export const RESERVED_USERNAMES = new Set([
  'app', 'api', 'www', 'admin', 'dashboard', 'login', 'signup', 'logout', 'auth',
  'assets', 'static', 'public', 'cdn', 'media', 'img', 'images', 'fonts', 'favicon', 'uploads',
  'about', 'terms', 'privacy', 'help', 'support', 'docs', 'status', 'c',
  'settings', 'account', 'u', 'p', 's', 'go', 'r', 'health', 'robots', 'sitemap',
])

export function isValidUsername(u: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(u) && !RESERVED_USERNAMES.has(u)
}
