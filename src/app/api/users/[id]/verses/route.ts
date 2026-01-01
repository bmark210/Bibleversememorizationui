import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type UpsertVersePayload = {
  externalVerseId: string;
  translation: string;
  masteryLevel?: number;
  repetitions?: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
};

// GET/POST прогресса по стихам. В этом маршруте params.id — это telegramId.
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const telegramId = params.id;

  const user = await prisma.user.findUnique({
    where: { telegramId },
    select: { id: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const verses = await prisma.userVerse.findMany({
    where: { telegramId },
  });

  return NextResponse.json(verses);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const telegramId = params.id;

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

  // Сначала убеждаемся, что пользователь существует
  const user = await prisma.user.findUnique({
    where: { telegramId },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Проверяем, есть ли уже такой стих У ЭТОГО пользователя
  const existingVerse = await prisma.userVerse.findUnique({
    where: {
      telegramId_externalVerseId: {
        telegramId,
        externalVerseId,
      },
    },
  });

  if (existingVerse) {
    return NextResponse.json(
      { error: "Стих уже добавлен в ваш список стихов" },
      { status: 400 }
    );
  }

  const verse = await prisma.userVerse.create({
    data: {
      telegramId,
      externalVerseId,
      masteryLevel,
      repetitions,
      lastReviewedAt: lastReviewedAt ? new Date(lastReviewedAt) : undefined,
      nextReviewAt: nextReviewAt ? new Date(nextReviewAt) : undefined,
    },
  });

  return NextResponse.json(verse, { status: 201 });
}

