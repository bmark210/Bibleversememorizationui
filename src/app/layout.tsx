import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import Script from 'next/script'

import { DisableViewportZoom } from './components/DisableViewportZoom'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'Заучивание библейских стихов',
  description: 'Приложение для заучивания и повторения библейских стихов',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ru"
      className={inter.variable}
    >
      <head>
      <Script
        src="https://telegram.org/js/telegram-web-app.js"
        strategy="beforeInteractive"
      />
      {/* Применяем тему ДО загрузки React, чтобы избежать флэша неправильных цветов */}
      <script dangerouslySetInnerHTML={{ __html: `
(function(){try{
  var tg=window.Telegram&&window.Telegram.WebApp;
  var tgScheme=tg&&tg.colorScheme;
  var stored=localStorage.getItem('theme');
  var theme=stored==='light'||stored==='dark'?stored
    :tgScheme==='light'||tgScheme==='dark'?tgScheme
    :(window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light');
  document.documentElement.setAttribute('data-theme',theme);
  document.documentElement.classList.add(theme);
  document.documentElement.style.colorScheme=theme;
}catch(e){}}());
      `}} />
      </head>
      <body className="text-foreground">
        <DisableViewportZoom />
        <div className="app-scroll">
          {children}
        </div>
      </body>
    </html>
  )
}


