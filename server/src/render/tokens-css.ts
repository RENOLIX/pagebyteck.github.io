import { getFontPair, SAFE_IMAGE_URL, type SiteTokens } from '@portfolio/shared'

const RADIUS: Record<SiteTokens['radius'], string> = { none: '0px', sm: '8px', md: '14px', lg: '20px', full: '999px' }
const SHADOW: Record<SiteTokens['shadow'], string> = {
  none: 'none',
  sm: '0 1px 2px rgba(0,0,0,.08),0 2px 6px rgba(0,0,0,.06)',
  md: '0 4px 14px rgba(0,0,0,.16)',
  lg: '0 12px 32px rgba(0,0,0,.26)',
}
const mix = (hex: string, pct: number) => `color-mix(in srgb,${hex} ${pct}%,transparent)`

/** Tokens (already validated by SiteTokens) to a small CSS block. */
export function renderTokensCss(t: SiteTokens): string {
  const font = getFontPair(t.fontPair)
  const button = t.buttonStyle === 'glass'
    ? `--btn-bg:${mix(t.buttonColor, t.glassOpacity)};--btn-border:${mix('#ffffff', 30)};--btn-blur:blur(${t.glassBlur}px) saturate(1.4)`
    : t.buttonStyle === 'outline'
      ? `--btn-bg:transparent;--btn-border:${t.buttonColor};--btn-blur:none`
      : `--btn-bg:${t.buttonColor};--btn-border:transparent;--btn-blur:none`

  let css = `:root{--fg:${t.textColor};--accent:${t.accent};--btn-fg:${t.buttonText};--radius:${RADIUS[t.radius]};--shadow:${SHADOW[t.shadow]};` +
    `--font-display:${font.display},${font.displayAr},ui-sans-serif,system-ui,sans-serif;` +
    `--font-body:${font.body},${font.bodyAr},ui-sans-serif,system-ui,sans-serif;${button}}`
  css += `body{background:${t.bgKind === 'gradient' ? `linear-gradient(160deg,${t.bgColor},${t.bgColor2})` : t.bgColor}}`
  // fixed pseudo-element instead of background-attachment:fixed, which iOS Safari ignores
  if (t.bgKind === 'image' && SAFE_IMAGE_URL.test(t.bgImage)) css += `body::before{background:url("${t.bgImage}") center/cover no-repeat}`
  if (t.overlayOpacity > 0) css += `body::after{background:${mix(t.overlayColor, t.overlayOpacity)}}`
  const s = t.avatarGlowStrength
  const r2 = (n: number) => Math.round(n * 100) / 100
  const glowBlur = r2(8 + s * 0.4)
  const glow = `0 0 ${glowBlur}px ${r2(s * 0.2)}px ${mix(t.avatarGlowColor, Math.round(30 + s * 0.7))}`
  if (t.avatarGlow) {
    css += t.avatarGlowMode === 'color'
      ? `.avatar-wrap .avatar{box-shadow:${glow},var(--shadow)}`
      : `.avatar-wrap .avatar-glow{display:block;opacity:${r2(0.3 + s * 0.007)};filter:blur(${glowBlur}px) saturate(1.6);transform:scale(${r2(1 + s * 0.004)})}`
  }
  // the base stylesheet is appended after these rules, so page-scoped selectors are needed to win
  if (t.glowAll) {
    css += `.page .btn,.page .soc{box-shadow:${glow},var(--shadow)}`
    css += `.page .profile h1{text-shadow:${t.textShadow ? '0 1px 3px rgba(0,0,0,.5),' : ''}0 0 ${Math.round(glowBlur * 0.6)}px ${t.avatarGlowColor}}`
  }
  if (t.glassPanel) {
    const blur = `blur(${t.glassBlur}px)`
    css += `.page .links{background:linear-gradient(45deg,${mix(t.buttonColor, 15)},${mix('#000000', 25)});` +
      `-webkit-backdrop-filter:${blur};backdrop-filter:${blur};border:1px solid ${mix('#ffffff', 27)};` +
      `border-radius:min(calc(var(--radius) + 14px),44px);padding:16px${t.glowAll ? `;box-shadow:${glow}` : ''}}`
  }
  if (t.textShadow) css += `.profile,.embeds h2,.gallery h2,.btn,.soc,.phone-row{text-shadow:0 1px 3px rgba(0,0,0,.5)}.btn .ico,.soc svg{filter:drop-shadow(0 1px 2px rgba(0,0,0,.45))}`
  return css
}
