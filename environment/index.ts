import { NEXT_PUBLIC_API_BASE_URL as DEV_API_BASE_URL } from "./dev";

/**
 * Безопасный fallback:
 * - локальная разработка -> localhost backend
 * - production build -> только явный NEXT_PUBLIC_API_BASE_URL
 *
 * Это важно для preview/dev-веток на хостинге:
 * `next build` всегда идёт с NODE_ENV=production, поэтому нельзя
 * автоматически подставлять production API по режиму сборки.
 */
export const NEXT_PUBLIC_API_BASE_URL =
  process.env.NODE_ENV === "development" ? DEV_API_BASE_URL : "";

