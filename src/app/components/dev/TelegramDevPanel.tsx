'use client'

import { useEffect, useState } from 'react'
import {
  getTelegramWebApp,
  isTelegramDevMock,
  setTelegramDevMockTheme,
  type TelegramColorScheme,
} from '@/app/lib/telegramWebApp'

export function TelegramDevPanel() {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<TelegramColorScheme>('light')

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return

    const webApp = getTelegramWebApp()
    if (!webApp || !isTelegramDevMock(webApp)) return

    setTheme(webApp.colorScheme === 'dark' ? 'dark' : 'light')
    setMounted(true)
  }, [])

  if (!mounted) return null

  const updateTheme = (nextTheme: TelegramColorScheme) => {
    if (!setTelegramDevMockTheme(nextTheme)) return
    setTheme(nextTheme)
  }

  return (
    <div className="fixed bottom-4 right-4 z-[140] rounded-2xl border border-border/80 bg-card/95 p-2 shadow-xl backdrop-blur">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Telegram Mock
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => updateTheme('light')}
          className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
            theme === 'light'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          }`}
        >
          Light
        </button>
        <button
          type="button"
          onClick={() => updateTheme('dark')}
          className={`rounded-xl px-3 py-2 text-sm font-medium transition ${
            theme === 'dark'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          }`}
        >
          Dark
        </button>
      </div>
    </div>
  )
}
