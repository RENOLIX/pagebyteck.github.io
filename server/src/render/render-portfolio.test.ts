import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderPortfolioHtml } from './render-portfolio'

const sections = [
  { id: 's1', type: 'profile', data: { name: 'Amine <b>', bio: 'Travel agency', avatar: { url: 'https://media.example.com/i/logo.png', alt: 'Logo' } } },
  { id: 's2', type: 'links', data: { items: [{ id: 'lnk1', label: 'Site', url: 'https://example.com', icon: 'instagram' }, { id: 'lnk2', label: 'Bad', url: 'javascript:alert(1)', icon: '' }] } },
  { id: 's3', type: 'phone', data: { label: 'Call us', numbers: [{ label: 'Office', number: '+213 555 12 34 56' }, { label: 'Mobile', number: '0661 00 00 00' }] } },
  { id: 's4', type: 'vcard', data: { label: 'Save contact', firstName: 'Amine', lastName: 'B' } },
  { id: 's5', type: 'embed', data: { heading: '', items: [{ id: 'e1', url: 'https://youtube.com/shorts/abcDEF12345' }, { id: 'e2', url: 'https://evil.com/x' }] } },
  { id: 's6', type: 'socials', data: { items: [{ id: 'so1', icon: 'tiktok', url: 'https://tiktok.com/@a' }] } },
]
const tokens = {
  bgKind: 'image', bgImage: 'https://media.example.com/i/bg.webp', overlayColor: '#000000', overlayOpacity: 40,
  buttonStyle: 'glass', buttonColor: '#ffffff', glassOpacity: 22, glassBlur: 14, shadow: 'md', textShadow: true,
}

const render = (over: Record<string, unknown> = {}, preview = false) =>
  renderPortfolioHtml({ username: 'amine', title: 'Amine', tokens: { ...tokens, ...over }, seo: {}, sections, previewMode: preview })

const scripts = (html: string) => [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1])

test('every inline script parses (published and preview)', () => {
  for (const html of [render(), render({}, true)]) {
    const list = scripts(html)
    assert.ok(list.length >= 1)
    for (const code of list) assert.doesNotThrow(() => new Function(code), code.slice(0, 80))
  }
})

test('phone block with two numbers renders a picker of tel: links', () => {
  const html = render()
  assert.match(html, /<details class="phone">/)
  assert.match(html, /href="tel:\+213555123456"/)
  assert.match(html, /href="tel:0661000000"/)
})

test('vcard button, embed facade and socials render; blocked urls do not', () => {
  const html = render()
  assert.match(html, /href="\/amine\/contact\.vcf"/)
  assert.match(html, /data-embed="https:\/\/www\.youtube-nocookie\.com\/embed\/abcDEF12345"/)
  assert.match(html, /class="embed r-9-16"/)
  assert.doesNotMatch(html, /evil\.com/)
  assert.doesNotMatch(html, /javascript:/)
  assert.match(html, /class="soc"/)
  assert.match(html, /Amine &lt;b&gt;/)
})

test('glass buttons, shadow, overlay and background image reach the stylesheet', () => {
  const html = render()
  assert.match(html, /--btn-bg:color-mix\(in srgb,#ffffff 22%,transparent\)/)
  assert.match(html, /--btn-blur:blur\(14px\) saturate\(1\.4\)/)
  assert.match(html, /body::before\{background:url\("https:\/\/media\.example\.com\/i\/bg\.webp"\)/)
  assert.match(html, /body::after\{background:color-mix\(in srgb,#000000 40%,transparent\)\}/)
  assert.match(html, /text-shadow/)
})

test('hostile token values never reach the style sink', () => {
  const html = render({ bgImage: 'https://x.com/a.png")}</style><script>alert(1)</script>', buttonColor: 'red;}body{display:none', glassBlur: 9999 })
  assert.doesNotMatch(html, /alert\(1\)/)
  assert.doesNotMatch(html, /body\{display:none/)
  assert.doesNotMatch(html, /red;\}/)
  assert.doesNotMatch(html, /body::before\{background:url/)
  assert.match(html, /--btn-bg:color-mix\(in srgb,#ffffff 22%/)
  assert.match(html, /blur\(12px\)/)
})

test('logo glow is a hidden blurred copy of the logo, shown only when turned on', () => {
  const off = render()
  assert.match(off, /<img class="avatar-glow" src="https:\/\/media\.example\.com\/i\/logo\.png" alt="" aria-hidden="true"/)
  assert.doesNotMatch(off, /\.avatar-wrap \.avatar-glow\{display:block/)
  assert.match(render({ avatarGlow: true }), /\.avatar-wrap \.avatar-glow\{display:block;/)
  assert.doesNotMatch(render({ avatarGlow: 'yes;}' }), /\.avatar-wrap \.avatar-glow\{display:block/)
})

test('logo glow strength scales the halo and a custom color replaces the logo colors', () => {
  const weak = render({ avatarGlow: true, avatarGlowStrength: 10 })
  const strong = render({ avatarGlow: true, avatarGlowStrength: 100 })
  assert.match(weak, /\.avatar-wrap \.avatar-glow\{display:block;opacity:0\.37;filter:blur\(12px\) saturate\(1\.6\);transform:scale\(1\.04\)\}/)
  assert.match(strong, /\.avatar-wrap \.avatar-glow\{display:block;opacity:1;filter:blur\(48px\) saturate\(1\.6\);transform:scale\(1\.4\)\}/)
  const colored = render({ avatarGlow: true, avatarGlowStrength: 50, avatarGlowMode: 'color', avatarGlowColor: '#f5c542' })
  assert.doesNotMatch(colored, /\.avatar-glow\{display:block/)
  assert.match(colored, /\.avatar-wrap \.avatar\{box-shadow:0 0 28px 10px color-mix\(in srgb,#f5c542 65%,transparent\),var\(--shadow\)\}/)
  const hostile = render({ avatarGlow: true, avatarGlowStrength: 9999, avatarGlowMode: 'x', avatarGlowColor: 'red;}' })
  assert.doesNotMatch(hostile, /red;\}/)
  assert.match(hostile, /opacity:0\.72;filter:blur\(32px\)/)
})

test('glow everywhere and the glass panel reach the stylesheet and beat the base rules', () => {
  const on = render({ glowAll: true, glassPanel: true, avatarGlowColor: '#f5c542', avatarGlowStrength: 50, buttonColor: '#ffffff', glassBlur: 14 })
  assert.match(on, /\.page \.btn,\.page \.soc\{box-shadow:0 0 28px 10px color-mix\(in srgb,#f5c542 65%,transparent\),var\(--shadow\)\}/)
  assert.match(on, /\.page \.profile h1\{text-shadow:0 1px 3px rgba\(0,0,0,\.5\),0 0 17px #f5c542\}/)
  assert.match(on, /\.page \.links\{background:linear-gradient\(45deg,color-mix\(in srgb,#ffffff 15%,transparent\),color-mix\(in srgb,#000000 25%,transparent\)\);-webkit-backdrop-filter:blur\(14px\);backdrop-filter:blur\(14px\);border:1px solid color-mix\(in srgb,#ffffff 27%,transparent\);border-radius:min\(calc\(var\(--radius\) \+ 14px\),44px\);padding:16px;box-shadow:0 0 28px 10px color-mix\(in srgb,#f5c542 65%,transparent\)\}/)
  const off = render()
  assert.doesNotMatch(off, /\.page \.btn/)
  assert.doesNotMatch(off, /\.page \.links/)
  const hostile = render({ glowAll: 'sure', glassPanel: 1, avatarGlowColor: 'gold;}body{display:none' })
  assert.doesNotMatch(hostile, /gold;\}/)
  assert.doesNotMatch(hostile, /body\{display:none/)
  assert.doesNotMatch(hostile, /\.page \.btn/)
})
