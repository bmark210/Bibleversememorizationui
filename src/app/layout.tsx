import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './globals.css'
import ScrollLock from './components/ScrollLock'

export const metadata: Metadata = {
  title: 'Заучивание библейских стихов',
  description: 'Приложение для заучивания и повторения библейских стихов',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
      </head>
      <body>
        <ScrollLock />
        {children}
      </body>
    </html>
  )
}


