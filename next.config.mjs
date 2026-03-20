/** @type {import('next').NextConfig} */
const PRODUCTION_GO_API_DEFAULT =
  "https://bible-memory-db-production.up.railway.app";

const productionGoApiBase = PRODUCTION_GO_API_DEFAULT.replace(/\/+$/, "");

function isSameOriginApiExplicitlyEnabled() {
  const raw = process.env.NEXT_PUBLIC_USE_SAME_ORIGIN_API;
  if (raw == null) return false;
  const normalized = String(raw).trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

/**
 * Публичный URL Go API для браузера и serverless routes.
 * В production по умолчанию всегда указываем внешний backend.
 * Same-origin API разрешается только явным opt-in через `NEXT_PUBLIC_USE_SAME_ORIGIN_API=true`.
 */
function resolveNextPublicApiBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (raw !== undefined && raw !== null && String(raw).trim()) {
    return String(raw).trim();
  }
  if (isSameOriginApiExplicitlyEnabled()) {
    return "";
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


