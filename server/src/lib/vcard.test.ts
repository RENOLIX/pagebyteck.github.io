import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildVcard, vcardFilename } from './vcard'

const base = { label: 'Save', firstName: '', lastName: '', org: '', title: '', phones: [], email: '', website: '', address: '', note: '' }

test('minimal card is vCard 3.0 with CRLF line endings', () => {
  const v = buildVcard({ ...base, firstName: 'Amine', lastName: 'Benali' })
  assert.ok(v.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n'))
  assert.ok(v.endsWith('END:VCARD\r\n'))
  assert.match(v, /\r\nN:Benali;Amine;;;\r\n/)
  assert.match(v, /\r\nFN:Amine Benali\r\n/)
  assert.equal(v.replace(/\r\n/g, '').includes('\n'), false)
})

test('escapes comma, semicolon, backslash and newline', () => {
  const v = buildVcard({ ...base, firstName: 'A', note: 'a,b;c\\d\ne' })
  assert.match(v, /\r\nNOTE:a\\,b\\;c\\\\d\\ne\r\n/)
})

test('phones keep only + and digits, email/org/title/url/adr emitted, empty fields omitted', () => {
  const v = buildVcard({
    ...base, firstName: 'A', org: 'Shop', title: 'CEO', email: 'a@b.dz', website: 'https://b.dz', address: 'Alger',
    phones: [{ label: 'Work', number: '+213 (0) 55-12 34' }, { label: '', number: '  ' }],
  })
  assert.match(v, /\r\nTEL;TYPE=CELL:\+21305512 34\r\n|\r\nTEL;TYPE=CELL:\+2130551234\r\n/)
  assert.equal((v.match(/TEL;/g) ?? []).length, 1)
  assert.match(v, /\r\nEMAIL;TYPE=INTERNET:a@b\.dz\r\n/)
  assert.match(v, /\r\nORG:Shop\r\n/)
  assert.match(v, /\r\nTITLE:CEO\r\n/)
  assert.match(v, /\r\nURL:https:\/\/b\.dz\r\n/)
  assert.match(v, /\r\nADR;TYPE=WORK:;;Alger;;;;\r\n/)
  assert.doesNotMatch(v, /NOTE:/)
})

test('non-http website is dropped', () => {
  const v = buildVcard({ ...base, firstName: 'A', website: 'javascript:alert(1)' })
  assert.doesNotMatch(v, /URL:/)
})

test('falls back to org for FN when no name', () => {
  const v = buildVcard({ ...base, org: 'Atlas Travel' })
  assert.match(v, /\r\nFN:Atlas Travel\r\n/)
})

test('long lines fold at 75 octets without splitting UTF-8 characters', () => {
  const note = 'مرحبا بكم في متجرنا '.repeat(12)
  const v = buildVcard({ ...base, firstName: 'أمين', note })
  for (const line of v.split('\r\n')) assert.ok(Buffer.byteLength(line, 'utf8') <= 75, `line too long: ${line.length}`)
  const unfolded = v.replace(/\r\n /g, '')
  assert.ok(unfolded.includes('NOTE:' + note.trim()) || unfolded.includes('NOTE:' + note))
  assert.equal(Buffer.from(v, 'utf8').toString('utf8'), v)
})

test('filename is ascii-safe and never empty', () => {
  assert.equal(vcardFilename('Amine Benali'), 'amine-benali.vcf')
  assert.equal(vcardFilename('أمين'), 'contact.vcf')
  assert.equal(vcardFilename('../../etc'), 'etc.vcf')
})
