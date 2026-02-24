import type { NextApiRequest, NextApiResponse } from "next";
import { VerseStatus } from "@/generated/prisma";
import {
  fetchEnrichedUserVerses,
  parseUserVersesListQuery,
  UserVersesApiError,
} from "./_shared";
import {
  REVIEW_MASTERY_LEVEL_MIN,
} from "./verseCard.types";

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
    const { orderBy, order } = parseUserVersesListQuery(req.query);
    const verses = await fetchEnrichedUserVerses({
      telegramId,
      where: {
        status: VerseStatus.LEARNING,
        masteryLevel: { gte: REVIEW_MASTERY_LEVEL_MIN },
      },
      orderBy,
      order,
    });
    return res.status(200).json(verses.filter((verse) => verse.status === "REVIEW"));
  } catch (error) {
    if (error instanceof UserVersesApiError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error("Error fetching review verses:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
