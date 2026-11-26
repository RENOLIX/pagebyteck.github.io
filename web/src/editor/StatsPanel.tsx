import { useEffect, useState } from 'react'
import { api, type Range, type Stats } from '@/lib/api'
import { useT } from '@/lib/i18n'
import { Loading } from '@/components/Loading'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

const DAY = 86_400_000

function itemLabel(c: Stats['clicks'][number], t: (k: string) => string): string {
  if (c.kind === 'removed') return t('st.removed')
  if (c.kind === 'phone') return t('b.phone')
  if (c.kind === 'vcard') return t('b.vcard')
  if (c.kind === 'embed') {
    try { return new URL(c.label).hostname.replace(/^www\./, '') } catch { return c.label }
  }
  return c.label
}

export function StatsPanel({ siteId }: { siteId: string }) {
  const { t, lang } = useT()
  const [range, setRange] = useState<Range>('7d')
  const [data, setData] = useState<Stats | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    setData(null); setFailed(false)
    api.stats(siteId, range).then((d) => { if (live) setData(d) }).catch((e) => { console.error('[stats] load failed', e); if (live) setFailed(true) })
    return () => { live = false }
  }, [siteId, range])

  const nf = new Intl.NumberFormat(lang === 'ar' ? 'ar-DZ-u-nu-latn' : lang)
  const header = (
    <Tabs value={range} onValueChange={(v) => setRange(v as Range)}>
      <TabsList className="w-full">
        <TabsTrigger value="7d">{t('st.range7')}</TabsTrigger>
        <TabsTrigger value="30d">{t('st.range30')}</TabsTrigger>
        <TabsTrigger value="all">{t('st.rangeAll')}</TabsTrigger>
      </TabsList>
    </Tabs>
  )
  if (failed) return <div className="grid gap-4">{header}<p className="text-sm text-destructive">{t('common.error')}</p></div>
  if (!data) return <div className="grid gap-4">{header}<Loading /></div>

  const totalViews = data.views.reduce((n, r) => n + r.views, 0)
  const totalClicks = data.clicks.reduce((n, r) => n + r.clicks, 0)
  // continuous day slots so quiet days still show; "all" charts the last 30 days
  const span = range === '7d' ? 7 : 30
  const byDate = new Map(data.views.map((r) => [r.date, r.views]))
  const days = Array.from({ length: span }, (_, i) => {
    const date = new Date(Date.now() - (span - 1 - i) * DAY).toISOString().slice(0, 10)
    return { date, views: byDate.get(date) ?? 0 }
  })
  const peak = Math.max(1, ...days.map((d) => d.views))
  const dayLabel = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString(lang === 'ar' ? 'ar-DZ-u-nu-latn' : lang, { month: 'short', day: 'numeric', timeZone: 'UTC' })

  return (
    <div className="grid gap-4">
      {header}
      <div className="grid grid-cols-2 gap-3">
        <Card className="gap-1 p-4"><div className="text-2xl font-semibold tabular-nums">{nf.format(totalViews)}</div><div className="text-xs text-muted-foreground">{t('st.views')}</div></Card>
        <Card className="gap-1 p-4"><div className="text-2xl font-semibold tabular-nums">{nf.format(totalClicks)}</div><div className="text-xs text-muted-foreground">{t('st.clicks')}</div></Card>
      </div>

      <Card className="gap-3 p-4">
        <div className="text-sm font-medium">{t('st.perDay')}</div>
        <div dir="ltr" className="flex h-28 items-end gap-0.5" role="img" aria-label={t('st.perDay')}>
          {days.map((d) => (
            <div key={d.date} title={`${dayLabel(d.date)}: ${d.views}`}
              className="flex-1 rounded-t-sm bg-primary/80 transition-colors hover:bg-primary"
              style={{ height: `${Math.max(d.views ? 6 : 2, Math.round((d.views / peak) * 100))}%` }} />
          ))}
        </div>
        <div dir="ltr" className="flex justify-between text-[11px] text-muted-foreground"><span>{dayLabel(days[0].date)}</span><span>{dayLabel(days[days.length - 1].date)}</span></div>
      </Card>

      <Card className="gap-2 p-4">
        <div className="text-sm font-medium">{t('st.byItem')}</div>
        {data.clicks.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t('st.noData')}</p>
        ) : (
          <ul className="grid grid-cols-[minmax(0,1fr)] gap-1">
            {data.clicks.map((c) => (
              <li key={c.item} className="flex min-w-0 items-center gap-2 border-b py-2 text-sm last:border-b-0">
                <Badge variant="outline">{t(`st.kind.${c.kind}`)}</Badge>
                <span className="min-w-0 flex-1 truncate" dir="auto">{itemLabel(c, t)}</span>
                <span className="font-medium tabular-nums">{nf.format(c.clicks)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
