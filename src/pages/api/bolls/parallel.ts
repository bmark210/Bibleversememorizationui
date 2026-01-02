import type { NextApiRequest, NextApiResponse } from "next";

const BOLLS_PARALLEL_URL = "https://bolls.life/get-parallel-verses/";

type ParallelRequestBody = {
  translations?: string[];
  book: number;
  chapter: number;
  verses: number[];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = req.body as ParallelRequestBody;

    if (
      !body ||
      !Array.isArray(body.translations) ||
      !body.book ||
      !body.chapter ||
      !Array.isArray(body.verses) ||
      body.verses.length === 0
    ) {
      return res
        .status(400)
        .json({ error: "translations, book, chapter и verses обязательны" });
    }

    const response = await fetch(BOLLS_PARALLEL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        translations: body.translations,
        book: body.book,
        chapter: body.chapter,
        verses: body.verses,
      }),
      next: { revalidate: 0 },
    });

    if (!response.ok) {
      const message = await response.text();
      return res.status(response.status).json({
        error: "Ошибка при обращении к Bolls",
        details: message,
      });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("Ошибка прокси парrallel Bolls:", error);
    return res.status(500).json({ error: "Ошибка на сервере" });
  }
}
