import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type UpsertVersePayload = {
  externalVerseId: string;
  masteryLevel?: number;
  repetitions?: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
};

// GET/POST прогресса по стихам. В этом маршруте params.id — это telegramId.
async function getUserIdByTelegramId(telegramId: string) {
  const user = await prisma.user.findUnique({
    where: { telegramId },
    select: { id: true },
  });
  return user?.id;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getUserIdByTelegramId(params.id);
  if (!userId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const verses = await prisma.userVerse.findMany({
    where: { userId },
  });

  return NextResponse.json(verses);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const userId = await getUserIdByTelegramId(params.id);
  if (!userId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = (await request.json()) as UpsertVersePayload;
  const {
    externalVerseId,
    masteryLevel = 0,
    repetitions = 0,
    lastReviewedAt,
    nextReviewAt,
  } = body;

  if (!externalVerseId) {
    return NextResponse.json(
      { error: "externalVerseId is required" },
      { status: 400 }
    );
  }

  const verse = await prisma.userVerse.upsert({
    where: {
      userId_externalVerseId: {
        userId,
        externalVerseId,
      },
    },
    update: {
      masteryLevel,
      repetitions,
      lastReviewedAt: lastReviewedAt ? new Date(lastReviewedAt) : undefined,
      nextReviewAt: nextReviewAt ? new Date(nextReviewAt) : undefined,
    },
    create: {
      userId,
      externalVerseId,
      masteryLevel,
      repetitions,
      lastReviewedAt: lastReviewedAt ? new Date(lastReviewedAt) : undefined,
      nextReviewAt: nextReviewAt ? new Date(nextReviewAt) : undefined,
    },
  });

  return NextResponse.json(verse, { status: 201 });
}

