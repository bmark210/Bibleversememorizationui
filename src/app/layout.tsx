import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { Inter, Lora } from 'next/font/google'
import Script from 'next/script'

import './globals.css'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
})

const lora = Lora({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-lora',
})

export const metadata: Metadata = {
  title: 'Заучивание библейских стихов',
  description: 'Приложение для заучивания и повторения библейских стихов',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className={`${inter.variable} ${lora.variable}`}>
      <head>
      <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"/>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      </head>
      <body>
        <div className="app-scroll">
          {children}
        </div>
      </body>
    </html>
  )
}


