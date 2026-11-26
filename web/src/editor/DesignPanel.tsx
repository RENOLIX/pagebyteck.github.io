import { useEffect, useState } from 'react'
import { FONT_PAIRS, SiteTokens } from '@portfolio/shared'
import { useT } from '@/lib/i18n'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Field, ImageField } from './Fields'

type Patch = Record<string, unknown>

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={label} value={value} onChange={(e) => onChange(e.target.value)}
          className="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5" />
        <Input dir="ltr" className="font-mono" maxLength={7} value={draft}
          onChange={(e) => { setDraft(e.target.value); if (/^#[0-9a-f]{6}$/i.test(e.target.value)) onChange(e.target.value.toLowerCase()) }} />
      </div>
    </Field>
  )
}

function Segmented<V extends string>({ value, options, onChange }: { value: V; options: [V, string][]; onChange: (v: V) => void }) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as V)}>
      <TabsList className="w-full">
        {options.map(([v, label]) => <TabsTrigger key={v} value={v}>{label}</TabsTrigger>)}
      </TabsList>
    </Tabs>
  )
}

function Range({ label, value, max, suffix, onChange }: { label: string; value: number; max: number; suffix: string; onChange: (v: number) => void }) {
  return (
    <div className="grid gap-2.5">
      <div className="flex justify-between text-sm"><Label>{label}</Label><span className="tabular-nums text-muted-foreground" dir="ltr">{value}{suffix}</span></div>
      <Slider value={[value]} max={max} step={1} onValueChange={([v]) => onChange(v)} aria-label={label} />
    </div>
  )
}

function Choice<V extends string>({ label, value, options, onChange }: { label: string; value: V; options: [V, string][]; onChange: (v: V) => void }) {
  return (
    <Field label={label}>
      <Select value={value} onValueChange={(v) => onChange(v as V)}>
        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
      </Select>
    </Field>
  )
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="grid gap-4">
    <h3 className="text-sm font-semibold">{title}</h3>
    {children}
  </section>
)

export function DesignPanel({ tokens, onChange }: { tokens: Patch; onChange: (patch: Patch) => void }) {
  const { t } = useT()
  const tk = SiteTokens.parse(tokens ?? {})
  const sizes: ['none' | 'sm' | 'md' | 'lg', string][] = [['none', t('d.none')], ['sm', t('d.small')], ['md', t('d.medium')], ['lg', t('d.large')]]

  return (
    <div className="grid gap-6">
      <Section title={t('d.font')}>
        <div className="grid grid-cols-2 gap-2">
          {FONT_PAIRS.map((f) => (
            <button key={f.id} type="button" onClick={() => onChange({ fontPair: f.id })}
              className={`rounded-lg border px-3 py-2 text-start transition-colors hover:bg-muted ${tk.fontPair === f.id ? 'border-primary ring-2 ring-primary/30' : ''}`}
              style={{ fontFamily: `${f.display}, ${f.displayAr}, sans-serif` }}>
              <div className="text-[15px]">{f.name}</div>
              <div className="text-xs text-muted-foreground">Aa أب 123</div>
            </button>
          ))}
        </div>
      </Section>

      <Separator />
      <Section title={t('d.colors')}>
        <div className="grid grid-cols-2 gap-3">
          <ColorField label={t('d.textColor')} value={tk.textColor} onChange={(v) => onChange({ textColor: v })} />
          <ColorField label={t('d.accent')} value={tk.accent} onChange={(v) => onChange({ accent: v })} />
        </div>
      </Section>

      <Separator />
      <Section title={t('d.background')}>
        <Segmented value={tk.bgKind} onChange={(v) => onChange({ bgKind: v })}
          options={[['color', t('d.bgColor')], ['gradient', t('d.bgGradient')], ['image', t('d.bgImage')]]} />
        {tk.bgKind === 'image' && (
          <ImageField value={tk.bgImage ? { url: tk.bgImage } : undefined} onChange={(img) => onChange({ bgImage: img?.url ?? '' })} />
        )}
        <div className="grid grid-cols-2 gap-3">
          <ColorField label={tk.bgKind === 'gradient' ? t('d.color1') : t('d.bgColor')} value={tk.bgColor} onChange={(v) => onChange({ bgColor: v })} />
          {tk.bgKind === 'gradient' && <ColorField label={t('d.color2')} value={tk.bgColor2} onChange={(v) => onChange({ bgColor2: v })} />}
        </div>
        <ColorField label={t('d.overlay')} value={tk.overlayColor} onChange={(v) => onChange({ overlayColor: v })} />
        <Range label={t('d.overlayOpacity')} value={tk.overlayOpacity} max={100} suffix="%" onChange={(v) => onChange({ overlayOpacity: v })} />
      </Section>

      <Separator />
      <Section title={t('d.buttons')}>
        <Segmented value={tk.buttonStyle} onChange={(v) => onChange({ buttonStyle: v })}
          options={[['solid', t('d.btnSolid')], ['outline', t('d.btnOutline')], ['glass', t('d.btnGlass')]]} />
        <div className="grid grid-cols-2 gap-3">
          <ColorField label={t('d.btnColor')} value={tk.buttonColor} onChange={(v) => onChange({ buttonColor: v })} />
          <ColorField label={t('d.btnText')} value={tk.buttonText} onChange={(v) => onChange({ buttonText: v })} />
        </div>
        {tk.buttonStyle === 'glass' && (
          <>
            <Range label={t('d.glassOpacity')} value={tk.glassOpacity} max={100} suffix="%" onChange={(v) => onChange({ glassOpacity: v })} />
            <Range label={t('d.glassBlur')} value={tk.glassBlur} max={30} suffix="px" onChange={(v) => onChange({ glassBlur: v })} />
            <p className="text-xs text-muted-foreground">{t('d.glassHint')}</p>
          </>
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="grid gap-1"><Label htmlFor="gp">{t('d.glassPanel')}</Label><p className="text-xs text-muted-foreground">{t('d.glassPanelHint')}</p></div>
          <Switch id="gp" checked={tk.glassPanel} onCheckedChange={(v) => onChange({ glassPanel: v })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Choice label={t('d.corners')} value={tk.radius} onChange={(v) => onChange({ radius: v })}
            options={[...sizes, ['full', t('d.round')]]} />
          <Choice label={t('d.shadow')} value={tk.shadow} onChange={(v) => onChange({ shadow: v })} options={sizes} />
        </div>
      </Section>

      <Separator />
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-1"><Label htmlFor="ts">{t('d.textShadow')}</Label><p className="text-xs text-muted-foreground">{t('d.textShadowHint')}</p></div>
        <Switch id="ts" checked={tk.textShadow} onCheckedChange={(v) => onChange({ textShadow: v })} />
      </div>
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-1"><Label htmlFor="ag">{t('d.avatarGlow')}</Label><p className="text-xs text-muted-foreground">{t('d.avatarGlowHint')}</p></div>
        <Switch id="ag" checked={tk.avatarGlow} onCheckedChange={(v) => onChange({ avatarGlow: v })} />
      </div>
      {tk.avatarGlow && (
        <Segmented value={tk.avatarGlowMode} onChange={(v) => onChange({ avatarGlowMode: v })}
          options={[['logo', t('d.glowLogo')], ['color', t('d.glowColor')]]} />
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="grid gap-1"><Label htmlFor="ga">{t('d.glowAll')}</Label><p className="text-xs text-muted-foreground">{t('d.glowAllHint')}</p></div>
        <Switch id="ga" checked={tk.glowAll} onCheckedChange={(v) => onChange({ glowAll: v })} />
      </div>
      {(tk.glowAll || (tk.avatarGlow && tk.avatarGlowMode === 'color')) && (
        <ColorField label={t('d.glowColor')} value={tk.avatarGlowColor} onChange={(v) => onChange({ avatarGlowColor: v })} />
      )}
      {(tk.glowAll || tk.avatarGlow) && (
        <Range label={t('d.glowStrength')} value={tk.avatarGlowStrength} max={100} suffix="%" onChange={(v) => onChange({ avatarGlowStrength: v })} />
      )}
      <div className="grid grid-cols-2 gap-3">
        <Choice label={t('d.direction')} value={tk.direction} onChange={(v) => onChange({ direction: v })} options={[['ltr', t('d.ltr')], ['rtl', t('d.rtl')]]} />
        <Choice label={t('d.mode')} value={tk.mode} onChange={(v) => onChange({ mode: v })} options={[['light', t('d.light')], ['dark', t('d.dark')]]} />
      </div>
    </div>
  )
}
