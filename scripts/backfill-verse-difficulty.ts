import { prisma } from "../src/lib/prisma";
import { resolveVerseDifficultyByExternalVerseId } from "../src/modules/verses/application/resolveVerseDifficulty";

async function main() {
  const forceRecompute = process.argv.includes("--force");
  const verses = await prisma.verse.findMany({
    select: {
      id: true,
      externalVerseId: true,
      difficultyLetters: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  let updatedCount = 0;

  for (const verse of verses) {
    if (
      !forceRecompute &&
      typeof verse.difficultyLetters === "number" &&
      verse.difficultyLetters >= 0
    ) {
      continue;
    }

    const resolved = await resolveVerseDifficultyByExternalVerseId({
      externalVerseId: verse.externalVerseId,
    });

    await prisma.verse.update({
      where: {
        id: verse.id,
      },
      data: {
        difficultyLetters: resolved.difficultyLetters,
      },
    });

    updatedCount += 1;
    console.log(
      `Updated ${verse.externalVerseId}: ${resolved.difficultyLetters} letters (${resolved.difficultyLevel})`
    );
  }

  console.log(
    `Verse difficulty backfill completed in ${
      forceRecompute ? "force" : "fill-missing"
    } mode. Updated ${updatedCount} of ${verses.length} verses.`
  );
}

main()
  .catch((error) => {
    console.error("Verse difficulty backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
