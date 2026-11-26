import { useState, type FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'
import { signIn } from '@/lib/auth'
import { useT, LangSwitcher } from '@/lib/i18n'
import { ThemeToggle } from '@/lib/theme'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function Auth() {
  const { t } = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setErr(''); setBusy(true)
    try {
      const r = await signIn.email({ email, password })
      if (r.error) { setErr(r.error.status === 403 ? r.error.message ?? t('auth.error') : t('auth.error')); return }
      window.location.href = '/'
    } catch (ex) {
      console.error('[auth] sign-in failed', ex)
      setErr(t('common.error'))
    } finally { setBusy(false) }
  }

  return (
    <div className="relative grid min-h-full place-items-center bg-muted/40 p-4">
      <div className="absolute end-3 top-3 flex items-center gap-1"><LangSwitcher /><ThemeToggle /></div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">{t('auth.title')}</CardTitle>
          <CardDescription>{t('auth.subtitle')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input id="email" type="email" dir="ltr" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input id="password" type="password" dir="ltr" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {err && <p className="text-sm text-destructive" role="alert">{err}</p>}
            <Button type="submit" size="lg" disabled={busy}>{busy && <LoaderCircle className="animate-spin" />}{t('auth.signin')}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
