import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type UpsertVersePayload = {
  externalVerseId: string;
  masteryLevel?: number;
  repetitions?: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
};

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const verses = await prisma.userVerse.findMany({
    where: { userId: params.id },
  });

  return NextResponse.json(verses);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
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
        userId: params.id,
        externalVerseId,
      },
    },
    update: {
      masteryLevel,
      repetitions,
      lastReviewedAt: lastReviewedAt
        ? new Date(lastReviewedAt)
        : undefined,
      nextReviewAt: nextReviewAt ? new Date(nextReviewAt) : undefined,
    },
    create: {
      userId: params.id,
      externalVerseId,
      masteryLevel,
      repetitions,
      lastReviewedAt: lastReviewedAt ? new Date(lastReviewedAt) : undefined,
      nextReviewAt: nextReviewAt ? new Date(nextReviewAt) : undefined,
    },
  });

  return NextResponse.json(verse, { status: 201 });
}

