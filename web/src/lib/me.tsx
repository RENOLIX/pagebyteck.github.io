import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, type Me } from '@/lib/api'
import { useT } from '@/lib/i18n'
import { Loading } from '@/components/Loading'
import { Button } from '@/components/ui/button'

const MeCtx = createContext<Me | null>(null)

/** Loads the signed-in account (role, brand, public URL) once; children only render with it present. */
export function MeProvider({ children }: { children: ReactNode }) {
  const { t } = useT()
  const [me, setMe] = useState<Me | null>(null)
  const [failed, setFailed] = useState(false)
  const load = useCallback(() => {
    setFailed(false)
    api.me().then(setMe).catch((e) => { console.error('[me] load failed', e); setFailed(true) })
  }, [])
  useEffect(load, [load])

  if (failed) {
    return (
      <div className="grid h-full place-items-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">{t('common.error')}</p>
        <Button variant="outline" onClick={load}>{t('common.retry')}</Button>
      </div>
    )
  }
  if (!me) return <Loading />
  return <MeCtx.Provider value={me}>{children}</MeCtx.Provider>
}

export function useMe(): Me {
  const me = useContext(MeCtx)
  if (!me) throw new Error('useMe outside MeProvider')
  return me
}
