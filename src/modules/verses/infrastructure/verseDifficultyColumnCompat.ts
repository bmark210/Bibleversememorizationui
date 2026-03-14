import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const COLUMN_CHECK_TTL_MS = 30_000;

let difficultyColumnCache:
  | {
      checkedAt: number;
      exists: boolean;
    }
  | null = null;

export function normalizeDifficultyLetters(
  value: number | null | undefined
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value));
}

export function isPrismaColumnNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  return (
    "code" in error &&
    (error as { code?: string }).code === "P2022"
  );
}

export async function hasVerseDifficultyLettersColumn(): Promise<boolean> {
  const now = Date.now();
  if (
    difficultyColumnCache &&
    now - difficultyColumnCache.checkedAt < COLUMN_CHECK_TTL_MS
  ) {
    return difficultyColumnCache.exists;
  }

  try {
    const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>(Prisma.sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = current_schema()
          AND table_name IN ('Verse', 'verse')
          AND column_name = 'difficultyLetters'
      ) AS "exists"
    `);

    const exists = rows[0]?.exists === true;
    difficultyColumnCache = {
      checkedAt: now,
      exists,
    };
    return exists;
  } catch {
    difficultyColumnCache = {
      checkedAt: now,
      exists: false,
    };
    return false;
  }
}

export function buildVerseBaseSelect(includeDifficultyLetters: boolean) {
  return {
    id: true,
    externalVerseId: true,
    ...(includeDifficultyLetters ? { difficultyLetters: true } : {}),
  } as const;
}

export function buildVerseRelationSelect(includeDifficultyLetters: boolean) {
  return {
    externalVerseId: true,
    ...(includeDifficultyLetters ? { difficultyLetters: true } : {}),
  } as const;
}

export function buildCatalogVerseSelect(includeDifficultyLetters: boolean) {
  return {
    id: true,
    externalVerseId: true,
    createdAt: true,
    ...(includeDifficultyLetters ? { difficultyLetters: true } : {}),
    tags: {
      include: {
        tag: true,
      },
    },
  } as const;
}
