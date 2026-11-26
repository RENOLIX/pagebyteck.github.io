import { lazy, Suspense, useEffect } from 'react'
import { useSession } from '@/lib/auth'
import { MeProvider } from '@/lib/me'
import { usePath } from '@/lib/nav'
import { useT } from '@/lib/i18n'
import { Loading } from '@/components/Loading'
import { Auth } from '@/pages/Auth'
import { Dashboard } from '@/pages/Dashboard'

// editor (dnd-kit, zod) and account load on navigation
const Account = lazy(() => import('@/pages/Account').then((m) => ({ default: m.Account })))
const Editor = lazy(() => import('@/editor/Editor').then((m) => ({ default: m.Editor })))

function Reconnecting({ onRetry }: { onRetry: () => void }) {
  const { t } = useT()
  useEffect(() => {
    const id = setInterval(onRetry, 2500)
    return () => clearInterval(id)
  }, [onRetry])
  return <Loading label={t('common.reconnecting')} />
}

export function App() {
  const { data: session, isPending, error, refetch } = useSession()
  const path = usePath()

  if (isPending) return <Loading />
  // a transient get-session error (during a deploy) must not bounce a signed-in user to the login form
  if (!session) return error ? <Reconnecting onRetry={() => refetch()} /> : <Auth />

  const edit = path.match(/^\/edit\/([0-9a-f-]{36})$/i)
  return (
    <MeProvider>
      <Suspense fallback={<Loading />}>
        {edit ? <Editor siteId={edit[1]} /> : path === '/account' ? <Account /> : <Dashboard />}
      </Suspense>
    </MeProvider>
  )
}
