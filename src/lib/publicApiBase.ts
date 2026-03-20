/**
 * Базовый URL Go API (Railway). Без завершающего слэша.
 *
 * Задаётся `NEXT_PUBLIC_API_BASE_URL` (в Netlify — в Environment + пересборка;
 * иначе в клиентском бандле останется пусто и `/api/...` пойдёт на тот же домен, что и UI).
 * В production next.config подмешивает дефолтный Railway URL, если переменная не задана.
 */
export function getPublicApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? "";
  if (!raw) return "";
  return raw.replace(/\/+$/, "");
}

/** Абсолютный URL к эндпоинту API; path должен начинаться с `/`. */
export function publicApiUrl(path: string): string {
  const base = getPublicApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!base) return p;
  return `${base}${p}`;
}
