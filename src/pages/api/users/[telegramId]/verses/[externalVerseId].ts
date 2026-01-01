import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

type UpdateVersePayload = {
  masteryLevel?: number;
  repetitions?: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { telegramId, externalVerseId } = req.query;
  if (!telegramId || Array.isArray(telegramId) || !externalVerseId || Array.isArray(externalVerseId)) {
    return res.status(400).json({ error: "telegramId and externalVerseId are required" });
  }

  if (req.method === "PATCH") {
    return handlePatch(req, res, telegramId, externalVerseId);
  }

  if (req.method === "DELETE") {
    return handleDelete(res, telegramId, externalVerseId);
  }

  res.setHeader("Allow", "PATCH, DELETE");
  return res.status(405).json({ error: "Method Not Allowed" });
}

async function handlePatch(
  req: NextApiRequest,
  res: NextApiResponse,
  telegramId: string,
  externalVerseId: string
) {
  try {
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const body = req.body as UpdateVersePayload;

    const verse = await prisma.userVerse.update({
      where: {
        telegramId_externalVerseId: {
          telegramId,
          externalVerseId,
        },
      },
      data: {
        ...(body.masteryLevel !== undefined ? { masteryLevel: body.masteryLevel } : {}),
        ...(body.repetitions !== undefined ? { repetitions: body.repetitions } : {}),
        ...(body.lastReviewedAt ? { lastReviewedAt: new Date(body.lastReviewedAt) } : {}),
        ...(body.nextReviewAt ? { nextReviewAt: new Date(body.nextReviewAt) } : {}),
      },
    });

    return res.status(200).json(verse);
  } catch (error) {
    console.error("Error updating verse:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

async function handleDelete(res: NextApiResponse, telegramId: string, externalVerseId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    await prisma.userVerse.delete({
      where: {
        telegramId_externalVerseId: {
          telegramId,
          externalVerseId,
        },
      },
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Error deleting verse:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
