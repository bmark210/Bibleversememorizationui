import type { NextApiRequest, NextApiResponse } from "next";

const BOLLS_BATCH_URL = "https://bolls.life/get-verses/";

type BatchVerseRequestItem = {
  translation?: string;
  book: number;
  chapter: number;
  verses: number[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Проксирует массив запросов к https://bolls.life/get-verses/.
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = req.body as BatchVerseRequestItem[];

    if (!Array.isArray(body) || body.length === 0) {
      return res.status(400).json({ error: "Body must be a non-empty array" });
    }

    for (const item of body) {
      if (
        !item ||
        !item.translation ||
        !item.book ||
        !item.chapter ||
        !Array.isArray(item.verses) ||
        item.verses.length === 0
      ) {
        return res.status(400).json({
          error: "Each item must contain translation, book, chapter and at least one verse",
        });
      }
    }

    const response = await fetch(BOLLS_BATCH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      const details = await response.text();
      return res.status(response.status).json({
        error: "Ошибка при обращении к Bolls",
        details,
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("Ошибка прокси Bolls get-verses:", error);
    return res.status(500).json({ error: "Ошибка на сервере" });
  }
}
