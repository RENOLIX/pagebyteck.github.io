import { useState, type FormEvent } from 'react'
import { ArrowLeft, LoaderCircle } from 'lucide-react'
import { useSession, changePassword } from '@/lib/auth'
import { navigate } from '@/lib/nav'
import { useT } from '@/lib/i18n'
import { AppHeader } from '@/components/AppHeader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function Account() {
  const { data: session } = useSession()
  const { t } = useT()
  return (
    <div className="min-h-full">
      <AppHeader />
      <main className="mx-auto grid max-w-2xl gap-6 px-4 py-8 sm:px-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')} aria-label={t('nav.home')}><ArrowLeft className="rtl:rotate-180" /></Button>
          <h1 className="text-2xl font-semibold tracking-tight">{t('acct.title')}</h1>
        </div>
        <p className="text-sm text-muted-foreground" dir="ltr">{session?.user?.email}</p>
        <ChangePassword />
      </main>
    </div>
  )
}

function ChangePassword() {
  const { t } = useT()
  const [cur, setCur] = useState('')
  const [next, setNext] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true); setMsg(null)
    const r = await changePassword({ currentPassword: cur, newPassword: next, revokeOtherSessions: true })
    setBusy(false)
    if (r.error) setMsg({ ok: false, text: t('acct.pwError') })
    else { setMsg({ ok: true, text: t('acct.pwSaved') }); setCur(''); setNext('') }
  }

  return (
    <Card>
      <CardHeader><CardTitle>{t('acct.changePw')}</CardTitle><CardDescription>{t('acct.changePwHint')}</CardDescription></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="grid gap-3">
          <div className="grid gap-1.5"><Label htmlFor="cur">{t('acct.currentPw')}</Label><Input id="cur" type="password" dir="ltr" autoComplete="current-password" required value={cur} onChange={(e) => setCur(e.target.value)} /></div>
          <div className="grid gap-1.5"><Label htmlFor="new">{t('acct.newPw')}</Label><Input id="new" type="password" dir="ltr" autoComplete="new-password" minLength={8} required value={next} onChange={(e) => setNext(e.target.value)} /></div>
          {msg && <p className={`text-sm ${msg.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`} role="status">{msg.text}</p>}
          <div><Button type="submit" disabled={busy}>{busy && <LoaderCircle className="animate-spin" />}{t('acct.updatePw')}</Button></div>
        </form>
      </CardContent>
    </Card>
  )
}
