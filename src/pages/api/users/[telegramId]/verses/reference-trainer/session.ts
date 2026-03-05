import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { canonicalizeExternalVerseId } from "@/shared/bible/externalVerseId";

type SessionTrack = "reference" | "incipit" | "mixed";
type SkillTrack = "reference" | "incipit";
type SessionOutcome = "correct_first" | "correct_retry" | "wrong";

type SessionUpdateInput = {
  externalVerseId: string;
  track: SkillTrack;
  outcome: SessionOutcome;
};

type SessionRequestBody = {
  sessionTrack: SessionTrack;
  updates: SessionUpdateInput[];
};

const SESSION_TRACKS = new Set<SessionTrack>(["reference", "incipit", "mixed"]);
const SKILL_TRACKS = new Set<SkillTrack>(["reference", "incipit"]);
const OUTCOMES = new Set<SessionOutcome>(["correct_first", "correct_retry", "wrong"]);
const OUTCOME_DELTA: Record<SessionOutcome, number> = {
  correct_first: 5,
  correct_retry: 2,
  wrong: -4,
};

class SessionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SessionValidationError";
  }
}

function clampSkillScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseSessionBody(body: unknown): SessionRequestBody {
  if (!isRecord(body)) {
    throw new SessionValidationError("Body must be a JSON object");
  }

  const sessionTrackRaw = body.sessionTrack;
  if (typeof sessionTrackRaw !== "string" || !SESSION_TRACKS.has(sessionTrackRaw as SessionTrack)) {
    throw new SessionValidationError("sessionTrack must be one of: reference, incipit, mixed");
  }

  const updatesRaw = body.updates;
  if (!Array.isArray(updatesRaw)) {
    throw new SessionValidationError("updates must be an array");
  }

  const updates: SessionUpdateInput[] = updatesRaw.map((item, index) => {
    if (!isRecord(item)) {
      throw new SessionValidationError(`updates[${index}] must be an object`);
    }

    const externalVerseIdRaw = item.externalVerseId;
    const trackRaw = item.track;
    const outcomeRaw = item.outcome;

    if (typeof externalVerseIdRaw !== "string" || externalVerseIdRaw.trim().length === 0) {
      throw new SessionValidationError(`updates[${index}].externalVerseId is required`);
    }
    if (typeof trackRaw !== "string" || !SKILL_TRACKS.has(trackRaw as SkillTrack)) {
      throw new SessionValidationError(`updates[${index}].track must be one of: reference, incipit`);
    }
    if (typeof outcomeRaw !== "string" || !OUTCOMES.has(outcomeRaw as SessionOutcome)) {
      throw new SessionValidationError(`updates[${index}].outcome must be one of: correct_first, correct_retry, wrong`);
    }

    const canonicalExternalVerseId = canonicalizeExternalVerseId(externalVerseIdRaw);
    if (!canonicalExternalVerseId) {
      throw new SessionValidationError(`updates[${index}].externalVerseId has invalid format`);
    }

    return {
      externalVerseId: canonicalExternalVerseId,
      track: trackRaw as SkillTrack,
      outcome: outcomeRaw as SessionOutcome,
    };
  });

  return {
    sessionTrack: sessionTrackRaw as SessionTrack,
    updates,
  };
}

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
    const { updates } = parseSessionBody(req.body);
    if (updates.length === 0) {
      return res.status(200).json({ updated: [] });
    }

    const requestedExternalIds = Array.from(
      new Set(updates.map((update) => update.externalVerseId))
    );

    const verseRows = await prisma.verse.findMany({
      where: { externalVerseId: { in: requestedExternalIds } },
      select: { id: true, externalVerseId: true },
    });

    const verseIdByExternalId = new Map(
      verseRows.map((row) => [row.externalVerseId, row.id] as const)
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

    const userVerseRows = await prisma.userVerse.findMany({
      where: {
        telegramId,
        verseId: {
          in: verseRows.map((row) => row.id),
        },
      },
      select: {
        id: true,
        verseId: true,
        referenceScore: true,
        incipitScore: true,
      },
    });

    const userVerseByExternalId = new Map<
      string,
      {
        id: number;
        externalVerseId: string;
        referenceScore: number;
        incipitScore: number;
      }
    >();

    for (const row of userVerseRows) {
      const externalVerseId = verseRows.find((verse) => verse.id === row.verseId)?.externalVerseId;
      if (!externalVerseId) continue;
      userVerseByExternalId.set(externalVerseId, {
        id: row.id,
        externalVerseId,
        referenceScore: clampSkillScore(row.referenceScore),
        incipitScore: clampSkillScore(row.incipitScore),
      });
    }

    const missingUserVerseIds = requestedExternalIds.filter(
      (externalVerseId) => !userVerseByExternalId.has(externalVerseId)
    );

    if (missingUserVerseIds.length > 0) {
      return res.status(404).json({
        error: "Some user verses were not found",
        missingExternalVerseIds: missingUserVerseIds,
      });
    }

    const touchedExternalIds: string[] = [];
    const touchedSet = new Set<string>();

    for (const update of updates) {
      const row = userVerseByExternalId.get(update.externalVerseId);
      if (!row) continue;
      const delta = OUTCOME_DELTA[update.outcome];

      if (update.track === "reference") {
        row.referenceScore = clampSkillScore(row.referenceScore + delta);
      } else {
        row.incipitScore = clampSkillScore(row.incipitScore + delta);
      }

      if (!touchedSet.has(update.externalVerseId)) {
        touchedSet.add(update.externalVerseId);
        touchedExternalIds.push(update.externalVerseId);
      }
    }

    const touchedRows = touchedExternalIds
      .map((externalVerseId) => userVerseByExternalId.get(externalVerseId))
      .filter(
        (row): row is { id: number; externalVerseId: string; referenceScore: number; incipitScore: number } =>
          row !== undefined
      );

    await prisma.$transaction(
      touchedRows.map((row) =>
        prisma.userVerse.update({
          where: { id: row.id },
          data: {
            referenceScore: row.referenceScore,
            incipitScore: row.incipitScore,
          },
        })
      )
    );

    return res.status(200).json({
      updated: touchedRows.map((row) => ({
        externalVerseId: row.externalVerseId,
        referenceScore: row.referenceScore,
        incipitScore: row.incipitScore,
      })),
    });
  } catch (error) {
    if (error instanceof SessionValidationError) {
      return res.status(400).json({ error: error.message });
    }

    console.error("Error updating reference trainer session:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: String(error),
    });
  }
}
