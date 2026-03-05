import type { NextApiRequest, NextApiResponse } from "next";
import {
  fetchRandomReferenceTrainerVerses,
  UserVersesApiError,
} from "../_shared";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { telegramId } = req.query;
  if (!telegramId || Array.isArray(telegramId)) {
    return res.status(400).json({ error: "telegramId is required" });
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const verses = await fetchRandomReferenceTrainerVerses({
      telegramId,
      limit: 50,
    });
    return res.status(200).json(verses);
  } catch (error) {
    if (error instanceof UserVersesApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error("Error fetching reference trainer verses:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
