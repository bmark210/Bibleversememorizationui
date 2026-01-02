import type { NextApiRequest, NextApiResponse } from "next";

const BOLLS_TRANSLATIONS_URL =
  "https://bolls.life/static/bolls/app/views/languages.json";

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  if (_req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
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
    return res.status(200).json(data);
  } catch (error) {
    console.error("Ошибка прокси перевода Bolls:", error);
    return res.status(500).json({ message: "Ошибка при обращении к Bolls" });
  }
}
