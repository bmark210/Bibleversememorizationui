import { NEXT_PUBLIC_API_BASE_URL as DEV_API_BASE_URL } from "./dev";
import { NEXT_PUBLIC_API_BASE_URL as PROD_API_BASE_URL } from "./prod";

/**
 * Автовыбор конфигурации по режиму сборки.
 * - `next dev` → NODE_ENV=development → берём dev-значения
 * - `next build`/`next start` → NODE_ENV=production → берём prod-значения
 */
export const NEXT_PUBLIC_API_BASE_URL =
  process.env.NODE_ENV === "production" ? PROD_API_BASE_URL : DEV_API_BASE_URL;

