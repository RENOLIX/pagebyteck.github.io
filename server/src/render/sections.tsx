import type { SectionDataMap, SectionType } from '@portfolio/shared'
import { iconSvg } from '../lib/icons'
import { parseEmbed } from '@portfolio/shared'

/** Neutralize dangerous URL schemes before a user value reaches an href/src. */
export function safeUrl(u?: string): string {
  if (!u) return ''
  // browsers drop C0 controls before resolving the scheme, so `java<TAB>script:` must be stripped first
  const s = String(u).replace(/[\u0000-\u001f\u007f]/g, '').trim()
  const m = s.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/)
  if (!m) return s
  const scheme = m[1].toLowerCase()
  if (scheme === 'http' || scheme === 'https' || scheme === 'mailto' || scheme === 'tel') return s
  if (/^data:image\/(png|jpe?g|gif|webp|avif);/i.test(s)) return s
  return ''
}

/** Link href: bare email becomes mailto:, bare phone becomes tel:, everything else goes through safeUrl. */
function smartLink(u?: string): string {
  if (!u) return ''
  const s = String(u).replace(/[\u0000-\u001f\u007f]/g, '').trim()
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s)) return safeUrl(s)
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) return safeUrl('mailto:' + s)
  if (/^\+?[\d][\d\s().-]{5,}$/.test(s)) return safeUrl('tel:' + s.replace(/[\s().-]/g, ''))
  return safeUrl(s)
}

// web links open a new tab; mailto:/tel: stay in place (a _blank mailto leaves a dead tab)
const extLink = (href: string) => (/^https?:/i.test(href) ? { target: '_blank', rel: 'noopener' } : {})
const telHref = (n: string) => 'tel:' + n.replace(/[^\d+]/g, '')
const key = (id: string) => (id ? { 'data-k': id } : {})

const PhoneIcon = () => (
  <svg class="ico" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" /></svg>
)
const ContactIcon = () => (
  <svg class="ico" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>
)
const PlayIcon = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
)

function Profile({ d }: { d: SectionDataMap['profile'] }) {
  return (
    <header class="profile">
      {d.avatar?.url ? (
        <div class="avatar-wrap">
          <img class="avatar-glow" src={safeUrl(d.avatar.url)} alt="" aria-hidden="true" width="112" height="112" />
          <img class="avatar" src={safeUrl(d.avatar.url)} alt={d.avatar.alt || d.name} width="112" height="112" />
        </div>
      ) : null}
      {d.name ? <h1>{d.name}</h1> : null}
      {d.bio ? <p class="bio">{d.bio}</p> : null}
    </header>
  )
}

function Links({ d }: { d: SectionDataMap['links'] }) {
  const items = d.items.filter((l) => l.label && smartLink(l.url))
  if (!items.length) return null
  return (
    <nav class="links">
      {items.map((l) => {
        const href = smartLink(l.url)
        const svg = l.icon ? iconSvg(l.icon) : null
        return (
          <a class="btn" href={href} {...extLink(href)} {...key(l.id)}>
            {l.iconImage?.url
              ? <img class="ico" src={safeUrl(l.iconImage.url)} alt="" width="20" height="20" />
              : svg ? <span class="ico" dangerouslySetInnerHTML={{ __html: svg }} /> : null}
            <span class="lbl">{l.label}</span>
          </a>
        )
      })}
    </nav>
  )
}

function Socials({ d }: { d: SectionDataMap['socials'] }) {
  const items = d.items.filter((s) => s.icon && smartLink(s.url) && iconSvg(s.icon))
  if (!items.length) return null
  return (
    <div class="socials">
      {items.map((s) => {
        const href = smartLink(s.url)
        return <a class="soc" href={href} {...extLink(href)} {...key(s.id)} aria-label={s.icon} dangerouslySetInnerHTML={{ __html: iconSvg(s.icon, 'currentColor', 22)! }} />
      })}
    </div>
  )
}

// One number calls directly; several open a native <details> list so the visitor picks one (no JS).
function Phone({ d }: { d: SectionDataMap['phone'] }) {
  const nums = d.numbers.filter((n) => n.number.replace(/\D/g, '').length >= 4)
  if (!nums.length) return null
  if (nums.length === 1) {
    return <a class="btn" href={telHref(nums[0].number)} data-k="phone"><PhoneIcon /><span class="lbl">{d.label}</span></a>
  }
  return (
    <details class="phone">
      <summary class="btn"><PhoneIcon /><span class="lbl">{d.label}</span></summary>
      <div class="phone-list">
        {nums.map((n) => (
          <a class="phone-row" href={telHref(n.number)} data-k="phone">
            <span>{n.label || n.number}</span>
            <span class="num" dir="ltr">{n.number}</span>
          </a>
        ))}
      </div>
    </details>
  )
}

function Vcard({ d, username }: { d: SectionDataMap['vcard']; username: string }) {
  if (!username || (!d.firstName && !d.lastName && !d.org)) return null
  return <a class="btn" href={`/${username}/contact.vcf`} data-k="vcard"><ContactIcon /><span class="lbl">{d.label}</span></a>
}

function Embeds({ d }: { d: SectionDataMap['embed'] }) {
  const items = d.items.flatMap((i) => {
    const e = parseEmbed(i.url)
    return e ? [{ id: i.id, e }] : []
  })
  if (!items.length) return null
  return (
    <section class="embeds">
      {d.heading ? <h2>{d.heading}</h2> : null}
      {items.map(({ id, e }) => (
        <div class={`embed r-${e.ratio.replace('/', '-')}`}>
          <button type="button" class="facade" data-embed={e.src} {...key(id)} aria-label={`Play ${e.kind}`}>
            {e.thumb
              ? <img src={e.thumb} alt="" loading="lazy" decoding="async" />
              : <span class="brand" dangerouslySetInnerHTML={{ __html: iconSvg(e.kind, 'currentColor', 40) ?? '' }} />}
            <span class="play"><PlayIcon /></span>
          </button>
        </div>
      ))}
    </section>
  )
}

function Gallery({ d }: { d: SectionDataMap['gallery'] }) {
  const imgs = d.images.filter((i) => safeUrl(i.url))
  if (!imgs.length) return null
  return (
    <section class="gallery">
      {d.heading ? <h2>{d.heading}</h2> : null}
      <div class="grid">{imgs.map((im) => <img src={safeUrl(im.url)} alt={im.alt} loading="lazy" decoding="async" />)}</div>
    </section>
  )
}

export function renderSection<K extends SectionType>(type: K, data: SectionDataMap[K], username: string) {
  switch (type) {
    case 'profile': return <Profile d={data as SectionDataMap['profile']} />
    case 'links': return <Links d={data as SectionDataMap['links']} />
    case 'socials': return <Socials d={data as SectionDataMap['socials']} />
    case 'phone': return <Phone d={data as SectionDataMap['phone']} />
    case 'vcard': return <Vcard d={data as SectionDataMap['vcard']} username={username} />
    case 'embed': return <Embeds d={data as SectionDataMap['embed']} />
    case 'gallery': return <Gallery d={data as SectionDataMap['gallery']} />
    default: return null
  }
}
