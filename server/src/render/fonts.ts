import { getFontPair } from '@portfolio/shared'
import { FONT_FACES, FONT_FILES } from './fonts-generated'

const strip = (s: string) => s.replace(/["']/g, '').trim()

/** @font-face CSS for ONLY the families a page's pair uses (display+body latin + Arabic fallbacks). */
export function fontFacesFor(pairId: string): string {
  const p = getFontPair(pairId)
  const families = [...new Set([p.display, p.body, p.displayAr, p.bodyAr].map(strip))]
  return families.map((f) => FONT_FACES[f] ?? '').join('')
}

/** The one font to preload (the display/LCP font). */
export function fontPreloadFor(pairId: string): string[] {
  const p = getFontPair(pairId)
  const url = FONT_FILES[strip(p.display)]
  return url ? [url] : []
}
