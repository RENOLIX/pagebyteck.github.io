import type { SectionDataMap } from '@portfolio/shared'

type Vcard = SectionDataMap['vcard']

// RFC 2426 text escaping
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')

// Fold at 75 octets on code-point boundaries so multibyte (Arabic) text never splits.
function fold(line: string): string {
  const out: string[] = []
  let cur = ''
  let bytes = 0
  for (const ch of line) {
    const b = Buffer.byteLength(ch, 'utf8')
    if (bytes + b > 75) { out.push(cur); cur = ' '; bytes = 1 }
    cur += ch
    bytes += b
  }
  out.push(cur)
  return out.join('\r\n')
}

/** vCard 3.0: the version iOS Contacts and Android import most reliably. */
export function buildVcard(d: Vcard): string {
  const first = d.firstName.trim()
  const last = d.lastName.trim()
  const org = d.org.trim()
  const title = d.title.trim()
  const email = d.email.trim()
  const website = d.website.trim()
  const address = d.address.trim()
  const note = d.note.trim()
  const fn = [first, last].filter(Boolean).join(' ') || org || 'Contact'

  const lines = ['BEGIN:VCARD', 'VERSION:3.0', `N:${esc(last)};${esc(first)};;;`, `FN:${esc(fn)}`]
  if (org) lines.push(`ORG:${esc(org)}`)
  if (title) lines.push(`TITLE:${esc(title)}`)
  for (const p of d.phones) {
    const n = p.number.replace(/[^\d+]/g, '')
    if (n) lines.push(`TEL;TYPE=CELL:${n}`)
  }
  if (email) lines.push(`EMAIL;TYPE=INTERNET:${esc(email)}`)
  if (/^https?:\/\//i.test(website)) lines.push(`URL:${esc(website)}`)
  if (address) lines.push(`ADR;TYPE=WORK:;;${esc(address)};;;;`)
  if (note) lines.push(`NOTE:${esc(note)}`)
  lines.push('END:VCARD')
  return lines.map(fold).join('\r\n') + '\r\n'
}

export function vcardFilename(name: string): string {
  const slug = name.normalize('NFKD').replace(/[^\x20-\x7e]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
  return (slug || 'contact') + '.vcf'
}
