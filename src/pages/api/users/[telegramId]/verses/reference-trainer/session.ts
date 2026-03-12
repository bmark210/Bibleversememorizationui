import type { NextApiRequest, NextApiResponse } from "next";
import { applySessionResults } from "@/modules/reference-trainer/application/applySessionResults";
import {
  getUserVerseScores,
  getVersesByExternalVerseIds,
  updateUserVerseScores,
} from "@/modules/reference-trainer/infrastructure/referenceTrainerRepository";
import { handleApiError } from "@/shared/errors/apiErrorHandler";
import { referenceSessionSchema } from "@/shared/validation/schemas/referenceSessionSchema";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { telegramId } = req.query;
  if (!telegramId || Array.isArray(telegramId)) {
    return res.status(400).json({ error: "telegramId is required" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const parsedBody = referenceSessionSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: parsedBody.error.flatten() });
    }

    const updates = parsedBody.data.updates as Array<{
      externalVerseId: string;
      track: "reference" | "incipit" | "ending" | "context";
      outcome: "correct_first" | "correct_retry" | "wrong";
    }>;
    if (updates.length === 0) {
      return res.status(200).json({ updated: [] });
    }

    const requestedExternalIds = Array.from(
      new Set(updates.map((update) => update.externalVerseId))
    );

    const verseRows = await getVersesByExternalVerseIds(requestedExternalIds);

    const verseIdByExternalId = new Map(
      verseRows.map((row) => [row.externalVerseId, row.id] as const)
    );
    const externalVerseIdByVerseId = new Map(
      verseRows.map((row) => [row.id, row.externalVerseId] as const)
    );

    const missingVerseIds = requestedExternalIds.filter(
      (externalVerseId) => !verseIdByExternalId.has(externalVerseId)
    );

    if (missingVerseIds.length > 0) {
      return res.status(404).json({
        error: "Some verses were not found",
        missingExternalVerseIds: missingVerseIds,
      });
    }

    const userVerseByExternalId = await getUserVerseScores({
      telegramId,
      verseIds: verseRows.map((row) => row.id),
      versesById: externalVerseIdByVerseId,
    });

    const missingUserVerseIds = requestedExternalIds.filter(
      (externalVerseId) => !userVerseByExternalId.has(externalVerseId)
    );

    if (missingUserVerseIds.length > 0) {
      return res.status(404).json({
        error: "Some user verses were not found",
        missingExternalVerseIds: missingUserVerseIds,
      });
    }

    const touchedRows = applySessionResults({
      updates,
      rowsByExternalVerseId: userVerseByExternalId,
    });

    await updateUserVerseScores(touchedRows);

    return res.status(200).json({
      updated: touchedRows.map((row) => ({
        externalVerseId: row.externalVerseId,
        referenceScore: row.referenceScore,
        incipitScore: row.incipitScore,
        contextScore: row.contextScore,
      })),
    });
  } catch (error) {
    return handleApiError(
      res,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
