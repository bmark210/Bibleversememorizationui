import type { NextApiRequest, NextApiResponse } from "next";
import {
  fetchRandomReferenceTrainerVerses,
  UserVersesApiError,
} from "../_shared";

const MAX_REFERENCE_TRAINER_LIMIT = 12;

function parseReferenceTrainerLimit(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  if (!raw) return MAX_REFERENCE_TRAINER_LIMIT;

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return MAX_REFERENCE_TRAINER_LIMIT;

  return Math.max(1, Math.min(MAX_REFERENCE_TRAINER_LIMIT, Math.round(parsed)));
}

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
    const limit = parseReferenceTrainerLimit(req.query.limit);
    const verses = await fetchRandomReferenceTrainerVerses({
      telegramId,
      limit,
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
