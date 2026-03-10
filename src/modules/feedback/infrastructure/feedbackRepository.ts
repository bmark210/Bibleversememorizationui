import { prisma } from "@/lib/prisma";
import type {
  FeedbackAuthorRecord,
  FeedbackRecord,
} from "@/modules/feedback/domain/Feedback";

function mapFeedbackAuthorRecord(row: {
  telegramId: string;
  name: string | null;
  nickname: string | null;
  avatarUrl: string | null;
}): FeedbackAuthorRecord {
  return {
    telegramId: row.telegramId,
    name: row.name,
    nickname: row.nickname,
    avatarUrl: row.avatarUrl,
  };
}

function mapFeedbackRecord(row: {
  id: string;
  telegramId: string;
  text: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    telegramId: string;
    name: string | null;
    nickname: string | null;
    avatarUrl: string | null;
  };
}): FeedbackRecord {
  return {
    id: row.id,
    telegramId: row.telegramId,
    text: row.text,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    user: mapFeedbackAuthorRecord(row.user),
  };
}

export async function createFeedback(params: {
  telegramId: string;
  text: string;
}): Promise<FeedbackRecord> {
  const feedback = await prisma.feedback.create({
    data: {
      telegramId: params.telegramId,
      text: params.text,
    },
    select: {
      id: true,
      telegramId: true,
      text: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          telegramId: true,
          name: true,
          nickname: true,
          avatarUrl: true,
        },
      },
    },
  });

  return mapFeedbackRecord(feedback);
}

export async function getFeedbackPage(params: {
  startWith: number;
  limit: number;
}): Promise<FeedbackRecord[]> {
  const feedback = await prisma.feedback.findMany({
    skip: params.startWith,
    take: params.limit,
    orderBy: [
      {
        createdAt: "desc",
      },
      {
        id: "desc",
      },
    ],
    select: {
      id: true,
      telegramId: true,
      text: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          telegramId: true,
          name: true,
          nickname: true,
          avatarUrl: true,
        },
      },
    },
  });

  return feedback.map(mapFeedbackRecord);
}

export async function countFeedback(): Promise<number> {
  return prisma.feedback.count();
}
