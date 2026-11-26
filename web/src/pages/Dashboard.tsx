import { useEffect, useState } from 'react'
import { ExternalLink, Pencil } from 'lucide-react'
import { api, type SiteSummary } from '@/lib/api'
import { useMe } from '@/lib/me'
import { navigate } from '@/lib/nav'
import { useT } from '@/lib/i18n'
import { AppHeader } from '@/components/AppHeader'
import { Loading } from '@/components/Loading'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function Dashboard() {
  const me = useMe()
  const { t } = useT()
  const [sites, setSites] = useState<SiteSummary[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    api.listSites().then((r) => {
      // a normal account owns one page: skip the list and open it
      if (!me.isAdmin && r.sites.length === 1) { navigate(`/edit/${r.sites[0].id}`, true); return }
      setSites(r.sites)
    }).catch((e) => { console.error('[dashboard] load failed', e); setFailed(true) })
  }, [me.isAdmin])

  return (
    <div className="min-h-full">
      <AppHeader />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {me.isAdmin && (
          <div className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">{t('dash.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('dash.subtitle')}</p>
          </div>
        )}
        {failed ? (
          <p className="text-sm text-destructive">{t('common.error')}</p>
        ) : sites === null ? (
          <Loading />
        ) : sites.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">{me.isAdmin ? t('dash.empty') : t('dash.noPage')}</Card>
        ) : (
          <div className="grid gap-3">
            {sites.map((s) => {
              const url = `${me.publicBaseUrl}/${s.username}`
              return (
                <Card key={s.id} className="flex flex-row flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{s.title || s.username}</div>
                    <div className="truncate text-sm text-muted-foreground" dir="ltr">{url.replace(/^https:\/\//, '')}</div>
                    {s.ownerEmail && <div className="truncate text-xs text-muted-foreground">{t('dash.owner')}: <span dir="ltr">{s.ownerEmail}</span></div>}
                  </div>
                  <Badge variant={s.status === 'published' ? 'secondary' : 'outline'}>{t(`dash.${s.status}`)}</Badge>
                  <div className="flex gap-2">
                    {s.status === 'published' && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={url} target="_blank" rel="noopener"><ExternalLink />{t('dash.view')}</a>
                      </Button>
                    )}
                    <Button size="sm" onClick={() => navigate(`/edit/${s.id}`)}><Pencil />{t('dash.edit')}</Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
