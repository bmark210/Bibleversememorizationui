/**
 * Публичный URL веб-приложения (только сервер: API routes, скрипты).
 * Не используйте NEXT_PUBLIC_* — URL не должен попадать в клиентский бандл без необходимости.
 */
function stripTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, "");
}

/**
 * Явный URL из окружения или типичные переменные хостинга (Netlify `URL`, Vercel `VERCEL_URL`).
 */
export function resolvePublicWebAppUrl(): string {
  const explicit = process.env.APP_URL?.trim();
  if (explicit) return stripTrailingSlashes(explicit);

  const netlifyOrSimilar = process.env.URL?.trim();
  if (netlifyOrSimilar) return stripTrailingSlashes(netlifyOrSimilar);

  const deployUrl = process.env.DEPLOY_URL?.trim();
  if (deployUrl) return stripTrailingSlashes(deployUrl);

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return stripTrailingSlashes(`https://${vercel}`);

  return "";
}
