import { LogOut, UserRound } from 'lucide-react'
import { useSession, signOut } from '@/lib/auth'
import { useT } from '@/lib/i18n'
import { navigate } from '@/lib/nav'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function UserMenu() {
  const { data: session } = useSession()
  const { t } = useT()
  const email = session?.user?.email ?? ''
  const name = session?.user?.name || email
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label={t('nav.menu')}>
          <span className="grid size-8 place-items-center rounded-full bg-muted text-sm font-semibold">{initial}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="truncate text-sm font-medium">{name}</div>
          <div className="truncate text-xs text-muted-foreground" dir="ltr">{email}</div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/account')}><UserRound />{t('nav.account')}</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={async () => { await signOut(); window.location.href = '/' }}>
          <LogOut />{t('nav.signout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
