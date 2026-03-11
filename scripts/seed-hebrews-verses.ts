import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const DATASET_NAME = "hebrews-popular";
const EXPECTED_SEED_ENTRY_COUNT = 25;

const TAG_TITLES = {
  church: "Церковь",
  contentment: "Довольство",
  creation: "Творение",
  discernment: "Различение",
  discipleship: "Ученичество",
  encouragement: "Ободрение",
  faith: "Вера",
  forgiveness: "Прощение",
  grace: "Благодать",
  holiness: "Святость",
  hope: "Надежда",
  "jesus-christ": "Иисус Христос",
  judgment: "Суд",
  kingdom: "Царство Божье",
  love: "Любовь",
  mercy: "Милость",
  obedience: "Послушание",
  peace: "Мир",
  perseverance: "Стойкость",
  prayer: "Молитва",
  repentance: "Покаяние",
  resurrection: "Воскресение",
  sacrifice: "Жертва",
  salvation: "Спасение",
  suffering: "Страдания",
  temptation: "Искушение",
  truth: "Истина",
  warning: "Предостережение",
  worship: "Поклонение",
} as const;

type TagSlug = keyof typeof TAG_TITLES;

type SeedEntry = {
  reference: string;
  tags: readonly TagSlug[];
};

const BOOK_NAME_TO_ID: Record<string, number> = {
  hebrews: 58,
  heb: 58,
  "евреям": 58,
  "к евреям": 58,
  "послание к евреям": 58,
};

// Набор собран по Top Verses: оставлены только действительно популярные места,
// а соседние стихи объединены в отрывки до 5 стихов.
const NORMALIZED_SEED_ENTRIES: readonly SeedEntry[] = [
  { reference: "Евреям 1:1-3", tags: ["jesus-christ", "truth", "worship"] },
  { reference: "Евреям 2:1-3", tags: ["warning", "salvation", "truth"] },
  { reference: "Евреям 2:9", tags: ["jesus-christ", "salvation", "suffering"] },
  { reference: "Евреям 2:14-18", tags: ["jesus-christ", "salvation", "temptation", "mercy"] },
  { reference: "Евреям 4:12", tags: ["truth", "discernment", "holiness"] },
  { reference: "Евреям 4:14-16", tags: ["jesus-christ", "grace", "mercy", "prayer"] },
  { reference: "Евреям 5:8-9", tags: ["obedience", "salvation", "jesus-christ"] },
  { reference: "Евреям 6:1-2", tags: ["discipleship", "faith", "truth"] },
  { reference: "Евреям 6:4-6", tags: ["warning", "repentance", "truth"] },
  { reference: "Евреям 7:25", tags: ["jesus-christ", "salvation", "prayer"] },
  { reference: "Евреям 9:14", tags: ["sacrifice", "holiness", "jesus-christ"] },
  { reference: "Евреям 9:22", tags: ["sacrifice", "forgiveness", "salvation"] },
  { reference: "Евреям 9:27-28", tags: ["judgment", "salvation", "jesus-christ"] },
  { reference: "Евреям 10:19-22", tags: ["grace", "prayer", "holiness", "sacrifice"] },
  { reference: "Евреям 10:23-25", tags: ["hope", "church", "encouragement", "love"] },
  { reference: "Евреям 10:26-27", tags: ["warning", "judgment", "holiness"] },
  { reference: "Евреям 11:1-3", tags: ["faith", "creation", "hope"] },
  { reference: "Евреям 11:6-8", tags: ["faith", "obedience", "hope"] },
  { reference: "Евреям 11:17-19", tags: ["faith", "resurrection", "hope"] },
  { reference: "Евреям 12:1-3", tags: ["perseverance", "faith", "jesus-christ"] },
  { reference: "Евреям 12:14", tags: ["holiness", "peace", "warning"] },
  { reference: "Евреям 12:28-29", tags: ["worship", "kingdom", "holiness"] },
  { reference: "Евреям 13:1-5", tags: ["love", "contentment", "holiness"] },
  { reference: "Евреям 13:7-8", tags: ["jesus-christ", "truth", "discipleship"] },
  { reference: "Евреям 13:15-17", tags: ["worship", "church", "obedience"] },
];

function normalizeBookName(value: string): string {
  return value.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
}

function normalizeReference(reference: string): string {
  return reference
    .trim()
    .replace(/[–—−]/g, "-")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ");
}

function parseHumanReference(reference: string): {
  book: number;
  chapter: number;
  verseStart: number;
  verseEnd: number;
} {
  const normalized = normalizeReference(reference);
  const match = normalized.match(
    /^(?<book>(?:[1-3]\s+)?[A-Za-zА-Яа-яЁё\- ]+)\s+(?<chapter>\d+):(?<verseStart>\d+)(?:-(?<verseEnd>\d+))?$/
  );

  if (!match?.groups) {
    throw new Error(`Unsupported reference format: "${reference}"`);
  }

  const bookName = normalizeBookName(match.groups.book);
  const book = BOOK_NAME_TO_ID[bookName];
  if (!book) {
    throw new Error(`Unsupported book name: "${match.groups.book}"`);
  }

  const chapter = Number(match.groups.chapter);
  const verseStart = Number(match.groups.verseStart);
  const verseEnd = Number(match.groups.verseEnd ?? match.groups.verseStart);

  if (
    !Number.isInteger(chapter) ||
    !Number.isInteger(verseStart) ||
    !Number.isInteger(verseEnd) ||
    chapter <= 0 ||
    verseStart <= 0 ||
    verseEnd <= 0
  ) {
    throw new Error(`Reference contains invalid numbers: "${reference}"`);
  }

  return {
    book,
    chapter,
    verseStart,
    verseEnd,
  };
}

function buildSeedEntries(): Array<{ reference: string; tags: TagSlug[] }> {
  return NORMALIZED_SEED_ENTRIES.map((entry) => ({
    reference: normalizeReference(entry.reference),
    tags: Array.from(new Set(entry.tags)),
  }));
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const [{ prisma }, helloao, externalVerseId] = await Promise.all([
    import("../src/lib/prisma"),
    import("../src/shared/bible/helloao"),
    import("../src/shared/bible/externalVerseId"),
  ]);

  const {
    DEFAULT_HELLOAO_TRANSLATION,
    getHelloaoChapterVerseMap,
    getHelloaoTranslations,
  } = helloao;
  const {
    MAX_EXTERNAL_VERSE_RANGE_SIZE,
    canonicalizeExternalVerseId,
    expandParsedExternalVerseNumbers,
    parseExternalVerseId,
  } = externalVerseId;

  const seedEntries = buildSeedEntries();
  const uniqueReferences = new Set(seedEntries.map((entry) => entry.reference));

  if (seedEntries.length !== EXPECTED_SEED_ENTRY_COUNT) {
    throw new Error(
      `Expected ${EXPECTED_SEED_ENTRY_COUNT} seed entries, received ${seedEntries.length}`
    );
  }

  if (uniqueReferences.size !== seedEntries.length) {
    throw new Error("Seed references must be unique");
  }

  const unknownTags = seedEntries
    .flatMap((entry) => entry.tags)
    .filter((tag) => !(tag in TAG_TITLES));
  if (unknownTags.length > 0) {
    throw new Error(`Unknown tag slugs found: ${Array.from(new Set(unknownTags)).join(", ")}`);
  }

  const translations = await getHelloaoTranslations();
  const hasDefaultTranslation = translations.some(
    (translation) => translation.id === DEFAULT_HELLOAO_TRANSLATION
  );
  if (!hasDefaultTranslation) {
    throw new Error(
      `HelloAO translation "${DEFAULT_HELLOAO_TRANSLATION}" is unavailable right now`
    );
  }

  const stats = {
    createdTags: 0,
    reusedTags: 0,
    updatedTags: 0,
    createdVerses: 0,
    reusedVerses: 0,
    createdLinks: 0,
    reusedLinks: 0,
  };

  const tagIdBySlug = new Map<TagSlug, string>();

  try {
    for (const [slug, title] of Object.entries(TAG_TITLES) as [TagSlug, string][]) {
      const existing = await prisma.tag.findFirst({
        where: {
          OR: [{ slug }, { title }],
        },
        select: {
          id: true,
          slug: true,
          title: true,
        },
      });

      if (!existing) {
        if (dryRun) {
          stats.createdTags += 1;
          tagIdBySlug.set(slug, `dry-tag-${slug}`);
          continue;
        }

        const created = await prisma.tag.create({
          data: { slug, title },
          select: { id: true },
        });
        stats.createdTags += 1;
        tagIdBySlug.set(slug, created.id);
        continue;
      }

      if (existing.slug !== slug || existing.title !== title) {
        if (dryRun) {
          stats.updatedTags += 1;
          tagIdBySlug.set(slug, existing.id);
          continue;
        }

        const updated = await prisma.tag.update({
          where: { id: existing.id },
          data: { slug, title },
          select: { id: true },
        });
        stats.updatedTags += 1;
        tagIdBySlug.set(slug, updated.id);
        continue;
      }

      stats.reusedTags += 1;
      tagIdBySlug.set(slug, existing.id);
    }

    for (const entry of seedEntries) {
      const parsedHuman = parseHumanReference(entry.reference);
      const candidateExternalVerseId =
        parsedHuman.verseStart === parsedHuman.verseEnd
          ? `${parsedHuman.book}-${parsedHuman.chapter}-${parsedHuman.verseStart}`
          : `${parsedHuman.book}-${parsedHuman.chapter}-${parsedHuman.verseStart}-${parsedHuman.verseEnd}`;

      const canonicalExternalVerseId = canonicalizeExternalVerseId(candidateExternalVerseId);
      if (!canonicalExternalVerseId) {
        throw new Error(
          `Reference "${entry.reference}" is invalid after canonicalization. Ranges must stay within one chapter and within ${MAX_EXTERNAL_VERSE_RANGE_SIZE} verses.`
        );
      }

      const parsedExternalVerseId = parseExternalVerseId(canonicalExternalVerseId);
      if (!parsedExternalVerseId) {
        throw new Error(`Unable to parse canonical externalVerseId "${canonicalExternalVerseId}"`);
      }

      const chapterMap = await getHelloaoChapterVerseMap({
        translation: DEFAULT_HELLOAO_TRANSLATION,
        book: parsedExternalVerseId.book,
        chapter: parsedExternalVerseId.chapter,
      });

      const missingVerses = expandParsedExternalVerseNumbers(parsedExternalVerseId).filter(
        (verseNumber) => {
          const text = chapterMap.get(verseNumber);
          return typeof text !== "string" || text.trim().length === 0;
        }
      );
      if (missingVerses.length > 0) {
        throw new Error(
          `HelloAO has no text for ${entry.reference} (${canonicalExternalVerseId}); missing verses: ${missingVerses.join(", ")}`
        );
      }

      const existingVerse = await prisma.verse.findUnique({
        where: { externalVerseId: canonicalExternalVerseId },
        select: { id: true },
      });

      const verseId =
        existingVerse?.id ??
        (dryRun
          ? `dry-verse-${canonicalExternalVerseId}`
          : (
              await prisma.verse.create({
                data: { externalVerseId: canonicalExternalVerseId },
                select: { id: true },
              })
            ).id);

      if (existingVerse) {
        stats.reusedVerses += 1;
      } else {
        stats.createdVerses += 1;
      }

      for (const tagSlug of entry.tags) {
        const tagId = tagIdBySlug.get(tagSlug);
        if (!tagId) {
          throw new Error(`Tag "${tagSlug}" was not prepared before verse import`);
        }

        const existingLink = dryRun
          ? null
          : await prisma.verseTag.findUnique({
              where: {
                verseId_tagId: {
                  verseId,
                  tagId,
                },
              },
              select: { id: true },
            });

        if (existingLink) {
          stats.reusedLinks += 1;
          continue;
        }

        if (!dryRun) {
          await prisma.verseTag.create({
            data: {
              verseId,
              tagId,
            },
          });
        }
        stats.createdLinks += 1;
      }
    }

    console.log(
      [
        `dataset: ${DATASET_NAME}`,
        `mode: ${dryRun ? "dry-run" : "write"}`,
        `translation: ${DEFAULT_HELLOAO_TRANSLATION}`,
        `seed entries: ${seedEntries.length}`,
        `tags created: ${stats.createdTags}`,
        `tags updated: ${stats.updatedTags}`,
        `tags reused: ${stats.reusedTags}`,
        `verses created: ${stats.createdVerses}`,
        `verses reused: ${stats.reusedVerses}`,
        `verse-tag links created: ${stats.createdLinks}`,
        `verse-tag links reused: ${stats.reusedLinks}`,
        `ranges supported: yes (up to ${MAX_EXTERNAL_VERSE_RANGE_SIZE} verses in one chapter)`,
      ].join("\n")
    );
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
