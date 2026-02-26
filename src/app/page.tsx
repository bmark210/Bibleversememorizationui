'use client'

import { useEffect, useState } from 'react'
import App from './App'
import { TelegramProvider } from './contexts/TelegramContext'

export default function Page() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Важно: чтобы не было hydration mismatch, на сервере и на первом рендере клиента
  // выводим одно и то же (пустой контейнер), а приложение монтируем только после useEffect.
  if (!mounted) {
    return (
      <div
        style={{
          backgroundImage: `
            radial-gradient(circle at 18% 22%, color-mix(in srgb, var(--accent) 14%, transparent) 0%, transparent 42%),
            radial-gradient(circle at 82% 6%, color-mix(in srgb, var(--primary) 14%, transparent) 0%, transparent 36%),
            linear-gradient(180deg, color-mix(in srgb, var(--background) 94%, #ffffff 6%), color-mix(in srgb, var(--background) 98%, #000000 2%))
          `
        }}
        className="min-h-screen flex items-center justify-center p-6"
      >
      </div>
    )
  }

  return (
    <TelegramProvider>
      <App />
    </TelegramProvider>
  )
}


