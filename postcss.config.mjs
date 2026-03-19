/**
 * PostCSS Configuration (Next.js)
 *
 * Tailwind CSS v4 интегрируется через PostCSS-плагин `@tailwindcss/postcss`.
 *
 * postcss-fix-oklch:
 * 1) прогоняет финальный CSS через `lightningcss`, чтобы raw `oklch()` и статические
 *    `color-mix()` получили совместимые fallback'и для Telegram WebView;
 * 2) добавляет узкий rgba(...) fallback для Tailwind v4-паттерна
 *    `color-mix(in oklab, var(--token) XX%, transparent)`, потому что этот случай
 *    не может быть вычислен библиотеками на этапе сборки из-за runtime `var(...)`.
 *
 * Требует --color-{name}-rgb переменных в CSS (определены в tailwind.css и theme.css).
 */
const config = {
  plugins: {
    '@tailwindcss/postcss': {},
    './postcss.fix-oklch.cjs': true,
  },
};

export default config;
