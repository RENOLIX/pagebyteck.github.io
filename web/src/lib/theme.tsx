import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useT } from '@/lib/i18n'

type Theme = 'light' | 'dark'
const KEY = 'app_theme'
const ThemeCtx = createContext<{ theme: Theme; toggle: () => void }>({ theme: 'light', toggle: () => {} })

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(KEY)
    if (saved === 'dark' || saved === 'light') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initialTheme)
  useEffect(() => { document.documentElement.classList.toggle('dark', theme === 'dark') }, [theme])
  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    try { localStorage.setItem(KEY, next) } catch { /* private mode: the choice just isn't remembered */ }
    setTheme(next)
  }
  return <ThemeCtx.Provider value={{ theme, toggle }}>{children}</ThemeCtx.Provider>
}

export function ThemeToggle() {
  const { theme, toggle } = useContext(ThemeCtx)
  const { t } = useT()
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={t('nav.theme')} title={t('nav.theme')}>
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  )
}
