import { useMe } from '@/lib/me'
import { navigate } from '@/lib/nav'
import { LangSwitcher, useT } from '@/lib/i18n'
import { ThemeToggle } from '@/lib/theme'
import { UserMenu } from './UserMenu'

export function AppHeader() {
  const me = useMe()
  const { t } = useT()
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur sm:px-6">
      <button type="button" onClick={() => navigate('/')} aria-label={t('nav.home')} className="truncate rounded-md text-base font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        {me.brand}
      </button>
      <div className="ms-auto flex items-center gap-1">
        <LangSwitcher />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  )
}
