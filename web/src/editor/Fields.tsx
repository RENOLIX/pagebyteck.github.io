import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowDown, ArrowUp, ImagePlus, LoaderCircle, Plus, Trash2, Upload, X } from 'lucide-react'
import { parseEmbed } from '@portfolio/shared'
import { api, ApiError } from '@/lib/api'
import { useT } from '@/lib/i18n'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Data = Record<string, any>
type Img = { url: string; alt?: string; width?: number; height?: number }

const newId = () => crypto.randomUUID().replace(/-/g, '').slice(0, 12)
const PROVIDER: Record<string, string> = { youtube: 'YouTube', tiktok: 'TikTok', instagram: 'Instagram', x: 'X', facebook: 'Facebook' }
const POPULAR_ICONS = ['instagram', 'facebook', 'tiktok', 'youtube', 'x', 'whatsapp', 'telegram', 'snapchat', 'threads', 'pinterest', 'spotify', 'github', 'gmail', 'googlemaps', 'viber', 'discord', 'website', 'googlereview']

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

/** Form for one block. Every block keeps the shape its shared schema expects. */
export function Fields({ type, data, onChange }: { type: string; data: Data; onChange: (d: Data) => void }) {
  const { t } = useT()
  const set = (patch: Data) => onChange({ ...data, ...patch })

  if (type === 'profile') {
    return (
      <div className="grid gap-4">
        <Field label={t('f.photo')}><ImageField value={data.avatar} onChange={(avatar) => set({ avatar })} /></Field>
        <Field label={t('f.name')}><Input maxLength={80} value={data.name ?? ''} onChange={(e) => set({ name: e.target.value })} /></Field>
        <Field label={t('f.bio')}><Textarea maxLength={300} rows={3} value={data.bio ?? ''} onChange={(e) => set({ bio: e.target.value })} /></Field>
      </div>
    )
  }

  if (type === 'links') {
    return (
      <ListEditor<Data> items={data.items ?? []} onChange={(items) => set({ items })} max={50} addLabel={t('f.addLink')} make={() => ({ id: newId(), label: '', url: '', icon: '' })}>
        {(item, update) => (
          <>
            <IconPicker icon={item.icon} iconImage={item.iconImage} allowUpload onChange={update} />
            <Field label={t('f.label')}><Input maxLength={80} value={item.label} onChange={(e) => update({ label: e.target.value })} /></Field>
            <Field label={t('f.url')}><Input dir="ltr" inputMode="url" maxLength={1000} value={item.url} onChange={(e) => update({ url: e.target.value })} placeholder="https://" /></Field>
          </>
        )}
      </ListEditor>
    )
  }

  if (type === 'socials') {
    return (
      <ListEditor<Data> items={data.items ?? []} onChange={(items) => set({ items })} max={20} addLabel={t('f.addSocial')} make={() => ({ id: newId(), icon: '', url: '' })}>
        {(item, update) => (
          <>
            <IconPicker icon={item.icon} onChange={update} />
            <Field label={t('f.url')}><Input dir="ltr" inputMode="url" maxLength={1000} value={item.url} onChange={(e) => update({ url: e.target.value })} placeholder="https://" /></Field>
          </>
        )}
      </ListEditor>
    )
  }

  if (type === 'phone') {
    return (
      <div className="grid gap-4">
        <Field label={t('f.label')}><Input maxLength={60} value={data.label ?? ''} onChange={(e) => set({ label: e.target.value })} /></Field>
        <Field label={t('f.numbers')} hint={t('f.phoneHint')}>
          <PhoneList value={data.numbers ?? []} onChange={(numbers) => set({ numbers })} />
        </Field>
      </div>
    )
  }

  if (type === 'vcard') {
    const text = (key: string, label: string, max: number, extra: Data = {}) => (
      <Field label={label}><Input maxLength={max} value={data[key] ?? ''} onChange={(e) => set({ [key]: e.target.value })} {...extra} /></Field>
    )
    return (
      <div className="grid gap-4">
        <p className="text-xs text-muted-foreground">{t('f.vcardHint')}</p>
        {text('label', t('f.label'), 60)}
        <div className="grid gap-4 sm:grid-cols-2">{text('firstName', t('f.firstName'), 60)}{text('lastName', t('f.lastName'), 60)}</div>
        <div className="grid gap-4 sm:grid-cols-2">{text('org', t('f.org'), 80)}{text('title', t('f.jobTitle'), 80)}</div>
        <Field label={t('f.numbers')}><PhoneList value={data.phones ?? []} onChange={(phones) => set({ phones })} /></Field>
        {text('email', t('f.email'), 120, { type: 'email', dir: 'ltr' })}
        {text('website', t('f.website'), 300, { dir: 'ltr', inputMode: 'url', placeholder: 'https://' })}
        {text('address', t('f.address'), 200)}
        <Field label={t('f.note')}><Textarea maxLength={300} rows={2} value={data.note ?? ''} onChange={(e) => set({ note: e.target.value })} /></Field>
      </div>
    )
  }

  if (type === 'embed') {
    return (
      <div className="grid gap-4">
        <Field label={t('f.heading')}><Input maxLength={80} value={data.heading ?? ''} onChange={(e) => set({ heading: e.target.value })} /></Field>
        <ListEditor<Data> items={data.items ?? []} onChange={(items) => set({ items })} max={12} addLabel={t('f.addEmbed')} make={() => ({ id: newId(), url: '' })}>
          {(item, update) => {
            const e = item.url ? parseEmbed(item.url) : null
            return (
              <Field label={t('f.embedUrl')}>
                <Input dir="ltr" inputMode="url" maxLength={1000} value={item.url} onChange={(ev) => update({ url: ev.target.value.trim() })} placeholder="https://youtube.com/shorts/…" />
                {item.url ? (e ? <Badge variant="secondary">{PROVIDER[e.kind]}</Badge> : <Badge variant="destructive">{t('f.unsupported')}</Badge>) : null}
              </Field>
            )
          }}
        </ListEditor>
      </div>
    )
  }

  if (type === 'gallery') {
    return (
      <div className="grid gap-4">
        <Field label={t('f.heading')}><Input maxLength={80} value={data.heading ?? ''} onChange={(e) => set({ heading: e.target.value })} /></Field>
        <ListEditor<Img> items={data.images ?? []} onChange={(images) => set({ images })} max={30} addLabel={t('f.addImage')} make={() => ({ url: '', alt: '' })}>
          {(item, update) => (
            <>
              <ImageField value={item.url ? item : undefined} onChange={(img) => update(img ?? { url: '' })} />
              <Field label={t('f.altText')}><Input maxLength={160} value={item.alt ?? ''} onChange={(e) => update({ alt: e.target.value })} /></Field>
            </>
          )}
        </ListEditor>
      </div>
    )
  }

  return null
}

function ListEditor<T extends Data>({ items, onChange, make, max, addLabel, children }: {
  items: T[]; onChange: (v: T[]) => void; make: () => T; max: number; addLabel: string
  children: (item: T, update: (patch: Partial<T>) => void) => ReactNode
}) {
  const { t } = useT()
  const move = (i: number, d: number) => {
    const j = i + d
    if (j < 0 || j >= items.length) return
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }
  return (
    <div className="grid gap-3">
      {items.map((item, i) => (
        <div key={item.id || i} className="grid gap-3 rounded-lg border bg-muted/30 p-3">
          <div className="-mt-1 flex justify-end gap-0.5">
            <Button variant="ghost" size="icon-xs" disabled={i === 0} onClick={() => move(i, -1)} aria-label={t('f.moveUp')}><ArrowUp /></Button>
            <Button variant="ghost" size="icon-xs" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={t('f.moveDown')}><ArrowDown /></Button>
            <Button variant="ghost" size="icon-xs" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={t('common.remove')}><Trash2 /></Button>
          </div>
          {children(item, (patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x))))}
        </div>
      ))}
      {items.length < max && (
        <Button variant="outline" size="sm" onClick={() => onChange([...items, make()])}><Plus />{addLabel}</Button>
      )}
    </div>
  )
}

function PhoneList({ value, onChange }: { value: { label: string; number: string }[]; onChange: (v: { label: string; number: string }[]) => void }) {
  const { t } = useT()
  return (
    <ListEditor items={value} onChange={onChange} max={6} addLabel={t('f.addNumber')} make={() => ({ label: '', number: '' })}>
      {(item, update) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('f.number')}><Input type="tel" dir="ltr" inputMode="tel" maxLength={32} value={item.number} onChange={(e) => update({ number: e.target.value })} placeholder="+213 5…" /></Field>
          <Field label={t('f.numberLabel')}><Input maxLength={40} value={item.label} onChange={(e) => update({ label: e.target.value })} /></Field>
        </div>
      )}
    </ListEditor>
  )
}

// Phones and designers hand over 10 to 50 MB images. Shrinking here keeps the upload under the
// server's 5 MB cap and keeps the page light, since the stored file is what visitors download.
// WebP so a logo keeps its transparency; SVG and GIF pass through (vector stays sharp, GIF keeps moving).
const MAX_EDGE = 2000
const SHRINK_OVER = 1024 * 1024

async function prepareImage(file: File): Promise<File> {
  if (/svg|gif/.test(file.type) || /\.(svg|gif)$/i.test(file.name)) return file
  try {
    const bmp = await createImageBitmap(file)
    const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height))
    if (scale === 1 && file.size <= SHRINK_OVER) { bmp.close(); return file }
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bmp.width * scale)
    canvas.height = Math.round(bmp.height * scale)
    canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height)
    bmp.close()
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', 0.9))
    if (!blob || blob.type !== 'image/webp' || blob.size >= file.size) return file
    return new File([blob], `${file.name.replace(/\.[^.]*$/, '')}.webp`, { type: 'image/webp' })
  } catch {
    return file // this browser cannot decode it; let the server answer
  }
}

function uploadError(e: unknown, t: (k: string) => string): string {
  if (e instanceof ApiError) {
    if (e.body.includes('too_large')) return t('f.tooLarge')
    if (e.body.includes('too_many_files')) return t('f.tooMany')
    if (e.status === 415) return t('f.badType')
    // the code goes in the text: a client reporting "upload failed" is otherwise not diagnosable
    return `${t('f.uploadFailed')} (${e.status})`
  }
  return t('f.uploadFailed')
}

export function ImageField({ value, onChange }: { value?: Img; onChange: (v: Img | undefined) => void }) {
  const { t } = useT()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function pick(file?: File) {
    if (!file || busy) return
    setBusy(true); setErr('')
    try {
      const r = await api.uploadImage(await prepareImage(file))
      onChange({ url: r.url, alt: value?.alt ?? '', width: r.width, height: r.height })
    } catch (e) {
      console.error('[upload] failed', e)
      setErr(uploadError(e, t))
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="grid gap-1.5">
      {value?.url ? (
        <div className="relative overflow-hidden rounded-lg border bg-muted/40">
          <img src={value.url} alt="" className="max-h-44 w-full object-contain" />
          <Button variant="secondary" size="icon-sm" className="absolute end-2 top-2" onClick={() => onChange(undefined)} aria-label={t('common.remove')}><X /></Button>
        </div>
      ) : (
        <Button type="button" variant="outline" className="h-24 flex-col gap-1 border-dashed" disabled={busy} onClick={() => input.current?.click()}>
          {busy ? <LoaderCircle className="animate-spin" /> : <ImagePlus />}
          <span>{busy ? t('f.uploading') : t('f.upload')}</span>
          <span className="text-xs font-normal text-muted-foreground">{t('f.uploadHint')}</span>
        </Button>
      )}
      {err && <p className="text-xs text-destructive" role="alert">{err}</p>}
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.png,.jpg,.jpeg,.webp,.gif,.svg" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  )
}

function IconPicker({ icon, iconImage, allowUpload, onChange }: {
  icon?: string; iconImage?: Img; allowUpload?: boolean; onChange: (patch: { icon?: string; iconImage?: Img }) => void
}) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<{ slug: string; title: string }[]>([])

  useEffect(() => {
    if (!q.trim()) { setResults([]); return }
    const timer = setTimeout(() => {
      api.searchIcons(q).then((r) => setResults(r.icons)).catch((e) => console.error('[icons] search failed', e))
    }, 250)
    return () => clearTimeout(timer)
  }, [q])

  const shown = q.trim() ? results : POPULAR_ICONS.map((slug) => ({ slug, title: slug }))
  const choose = (patch: { icon?: string; iconImage?: Img }) => { onChange(patch); setOpen(false); setQ('') }

  return (
    <Field label={t('f.icon')}>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="justify-start">
            {iconImage?.url
              ? <img src={iconImage.url} alt="" className="size-5 object-contain" />
              : icon ? <img src={`/api/icons/${icon}`} alt="" className="size-5" /> : null}
            <span className="truncate">{icon || (iconImage?.url ? t('f.uploadIcon') : t('f.chooseIcon'))}</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{t('f.chooseIcon')}</DialogTitle></DialogHeader>
          <Input autoFocus dir="ltr" placeholder={t('f.searchIcons')} value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="grid max-h-64 grid-cols-6 gap-1 overflow-y-auto">
            {shown.map((ic) => (
              <Button key={ic.slug} variant={ic.slug === icon ? 'secondary' : 'ghost'} className="aspect-square h-auto" title={ic.title}
                onClick={() => choose({ icon: ic.slug, iconImage: undefined })}>
                <img src={`/api/icons/${ic.slug}`} alt={ic.title} className="size-6" loading="lazy"
                  onError={(e) => { const b = e.currentTarget.closest('button'); if (b) b.style.display = 'none' }} />
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={() => choose({ icon: '', iconImage: undefined })}><X />{t('f.noIcon')}</Button>
            {allowUpload && (
              <div className="ms-auto">
                <UploadIconButton onDone={(img) => choose({ icon: '', iconImage: img })} />
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </Field>
  )
}

function UploadIconButton({ onDone }: { onDone: (img: Img) => void }) {
  const { t } = useT()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  async function pick(file?: File) {
    if (!file || busy) return
    setBusy(true); setErr('')
    try {
      const r = await api.uploadImage(await prepareImage(file))
      onDone({ url: r.url, width: r.width, height: r.height, alt: '' })
    } catch (e) {
      console.error('[upload] icon failed', e)
      setErr(uploadError(e, t))
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }
  return (
    <>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <LoaderCircle className="animate-spin" /> : <Upload />}{t('f.uploadIcon')}
      </Button>
      {err && <p className="mt-1 text-xs text-destructive" role="alert">{err}</p>}
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,.png,.jpg,.jpeg,.webp,.gif,.svg" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </>
  )
}
