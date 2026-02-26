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
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
      </div>
    )
  }

  return (
    <TelegramProvider>
      <App />
    </TelegramProvider>
  )
}


