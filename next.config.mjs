/** @type {import('next').NextConfig} */
const PRODUCTION_GO_API_DEFAULT =
  "https://bible-memory-db-production.up.railway.app";

const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
    /**
     * Без этого в браузере OpenAPI.BASE и publicApiUrl() дают относительный `/api/...` →
     * запросы уходят на тот же хост (Netlify), а не на Go API.
     * Задайте в Netlify: NEXT_PUBLIC_API_BASE_URL = URL Railway (без слэша в конце).
     * В production-сборке подставляем дефолт, если переменная не задана.
     */
    NEXT_PUBLIC_API_BASE_URL:
      process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
      (process.env.NODE_ENV === "production" ? PRODUCTION_GO_API_DEFAULT : ""),
  },
};

export default nextConfig


