/** @type {import('next').NextConfig} */
const PRODUCTION_GO_API_DEFAULT =
  "https://bible-memory-db-production.up.railway.app";

/**
 * CORS настраивает только ответ API (Railway/Go). Переменная CORS_ALLOWED_ORIGINS
 * задаётся в окружении бэкенда, не в Netlify — Next.js её не читает.
 *
 * Обход без правок Go: в production клиент ходит на тот же origin (`/api/...`),
 * а ниже fallback-rewrite пересылает запросы на Railway (после проверки pages/api).
 */
const apiRewriteTarget =
  process.env.API_UPSTREAM_URL?.trim() || PRODUCTION_GO_API_DEFAULT;

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    /**
     * В production по умолчанию пусто → относительные `/api/...` → same-origin → rewrite на Railway (без CORS в браузере).
     * Явно задайте URL, если нужны прямые запросы к API (тогда CORS должен быть на бэкенде).
     */
    NEXT_PUBLIC_API_BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL !== undefined
        ? String(process.env.NEXT_PUBLIC_API_BASE_URL).trim()
        : "",
  },
  async rewrites() {
    if (process.env.NODE_ENV !== "production") {
      return { fallback: [] };
    }
    const base = apiRewriteTarget.replace(/\/+$/, "");
    if (!base) return { fallback: [] };
    return {
      fallback: [
        {
          source: "/api/:path*",
          destination: `${base}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig


