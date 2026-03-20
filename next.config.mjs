/** @type {import('next').NextConfig} */
const PRODUCTION_GO_API_DEFAULT =
  "https://bible-memory-db-production.up.railway.app";

const productionGoApiBase = PRODUCTION_GO_API_DEFAULT.replace(/\/+$/, "");

/**
 * Публичный URL Go API для браузера и serverless routes.
 * На Netlify относительные `/api/...` с пустым base уходят на сам Netlify (rewrites из next.config там не спасают),
 * поэтому при сборке production без явной переменной подставляем Railway.
 *
 * Чтобы снова использовать same-origin + rewrite (например `next start` за своим прокси),
 * задайте в окружении `NEXT_PUBLIC_API_BASE_URL=` (пустая строка — явный выбор).
 */
function resolveNextPublicApiBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (raw !== undefined && raw !== null) {
    return String(raw).trim();
  }
  if (process.env.NODE_ENV === "production") {
    return productionGoApiBase;
  }
  return "";
}

/**
 * CORS настраивает только ответ API (Railway/Go). Переменная CORS_ALLOWED_ORIGINS
 * задаётся в окружении бэкенда, не в Netlify — Next.js её не читает.
 *
 * Обход без правок Go: при пустом NEXT_PUBLIC_API_BASE_URL клиент ходит на `/api/...` на том же origin,
 * а ниже fallback-rewrite пересылает на Railway (актуально для `next start`, не для типичного Netlify).
 */
const apiRewriteTarget =
  process.env.API_UPSTREAM_URL?.trim() || PRODUCTION_GO_API_DEFAULT;

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    NEXT_PUBLIC_API_BASE_URL: resolveNextPublicApiBaseUrl(),
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


