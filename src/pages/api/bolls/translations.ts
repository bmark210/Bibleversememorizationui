import type { NextApiRequest, NextApiResponse } from "next";

const BOLLS_TRANSLATIONS_URL =
  "https://bolls.life/static/bolls/app/views/languages.json";

const TRANSLATIONS_CACHE_TTL_MS = 60 * 60 * 1000; // 1h
let translationsCache: { expiresAt: number; data: unknown } | null = null;

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  if (_req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    res.setHeader(
      "Cache-Control",
      "public, s-maxage=3600, stale-while-revalidate=86400"
    );

    if (translationsCache && translationsCache.expiresAt > Date.now()) {
      return res.status(200).json(translationsCache.data);
    }

    // Получаем список доступных переводов через прокси.
    const response = await fetch(BOLLS_TRANSLATIONS_URL, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ message: "Не удалось получить переводы Bolls" });
    }

    const data = await response.json();
    translationsCache = { expiresAt: Date.now() + TRANSLATIONS_CACHE_TTL_MS, data };
    return res.status(200).json(data);
  } catch (error) {
    console.error("Ошибка прокси перевода Bolls:", error);
    return res.status(500).json({ message: "Ошибка при обращении к Bolls" });
  }
}
