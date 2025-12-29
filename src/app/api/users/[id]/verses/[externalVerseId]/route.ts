import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type UpdateVersePayload = {
  masteryLevel?: number;
  repetitions?: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
};

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; externalVerseId: string } }
) {
  const body = (await request.json()) as UpdateVersePayload;

  const verse = await prisma.userVerse.update({
    where: {
      userId_externalVerseId: {
        userId: params.id,
        externalVerseId: params.externalVerseId,
      },
    },
    data: {
      ...(body.masteryLevel !== undefined
        ? { masteryLevel: body.masteryLevel }
        : {}),
      ...(body.repetitions !== undefined
        ? { repetitions: body.repetitions }
        : {}),
      ...(body.lastReviewedAt
        ? { lastReviewedAt: new Date(body.lastReviewedAt) }
        : {}),
      ...(body.nextReviewAt
        ? { nextReviewAt: new Date(body.nextReviewAt) }
        : {}),
    },
  });

  return NextResponse.json(verse);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; externalVerseId: string } }
) {
  await prisma.userVerse.delete({
    where: {
      userId_externalVerseId: {
        userId: params.id,
        externalVerseId: params.externalVerseId,
      },
    },
  });

  return NextResponse.json({ ok: true });
}

