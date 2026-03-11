import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const DATASET_NAME = "genesis-foundations";
const EXPECTED_SEED_ENTRY_COUNT = 33;
const CREATOR_TELEGRAM_ID = "891739957";

const TAG_TITLES = {
  blessing: "Благословение",
  calling: "Призвание",
  covenant: "Завет",
  creation: "Творение",
  dominion: "Владычество",
  faith: "Вера",
  family: "Семья",
  fall: "Грехопадение",
  grace: "Благодать",
  humanity: "Человек",
  "image-of-god": "Образ Божий",
  judgment: "Суд",
  life: "Жизнь",
  marriage: "Брак",
  obedience: "Послушание",
  presence: "Божье присутствие",
  promise: "Обетование",
  protection: "Защита",
  provision: "Божье обеспечение",
  righteousness: "Праведность",
  sacrifice: "Жертва",
  salvation: "Спасение",
  sin: "Грех",
  sovereignty: "Божий промысел",
  temptation: "Искушение",
  worship: "Поклонение",
} as const;

type TagSlug = keyof typeof TAG_TITLES;

type SeedEntry = {
  reference: string;
  tags: readonly TagSlug[];
};

const BOOK_NAME_TO_ID: Record<string, number> = {
  genesis: 1,
  "бытие": 1,
};

// Набор уже нормализован: дубли удалены, соседние стихи объединены в диапазоны до 5 стихов.
const NORMALIZED_SEED_ENTRIES: readonly SeedEntry[] = [
  { reference: "Бытие 1:1", tags: ["creation", "sovereignty"] },
  {
    reference: "Бытие 1:26-28",
    tags: ["creation", "humanity", "image-of-god", "dominion", "blessing"],
  },
  { reference: "Бытие 2:7", tags: ["creation", "humanity", "life"] },
  { reference: "Бытие 2:18", tags: ["humanity", "family", "marriage"] },
  { reference: "Бытие 2:24", tags: ["family", "marriage"] },
  { reference: "Бытие 3:1", tags: ["temptation", "fall", "sin"] },
  { reference: "Бытие 3:6", tags: ["temptation", "fall", "sin"] },
  { reference: "Бытие 3:15", tags: ["salvation", "promise", "grace"] },
  { reference: "Бытие 3:19", tags: ["judgment", "sin", "humanity"] },
  { reference: "Бытие 4:7", tags: ["sin", "temptation", "obedience"] },
  { reference: "Бытие 6:5", tags: ["sin", "judgment"] },
  { reference: "Бытие 6:8", tags: ["grace"] },
  { reference: "Бытие 6:14", tags: ["obedience", "protection", "provision"] },
  { reference: "Бытие 7:16", tags: ["protection", "judgment"] },
  { reference: "Бытие 8:21-22", tags: ["grace", "covenant", "promise", "creation"] },
  { reference: "Бытие 9:13", tags: ["covenant", "promise"] },
  { reference: "Бытие 9:15", tags: ["covenant", "promise", "grace"] },
  { reference: "Бытие 12:1-3", tags: ["calling", "promise", "blessing"] },
  { reference: "Бытие 14:20", tags: ["worship", "blessing", "sovereignty"] },
  { reference: "Бытие 15:1", tags: ["promise", "protection"] },
  { reference: "Бытие 15:6", tags: ["faith", "righteousness", "promise"] },
  { reference: "Бытие 17:5", tags: ["covenant", "promise", "blessing"] },
  { reference: "Бытие 17:7", tags: ["covenant", "promise"] },
  { reference: "Бытие 18:14", tags: ["faith", "promise", "sovereignty"] },
  { reference: "Бытие 22:2", tags: ["obedience", "faith", "sacrifice"] },
  { reference: "Бытие 22:8", tags: ["faith", "sacrifice", "provision"] },
  { reference: "Бытие 22:12", tags: ["obedience", "faith"] },
  { reference: "Бытие 22:14", tags: ["provision", "worship", "faith"] },
  { reference: "Бытие 22:16-17", tags: ["obedience", "blessing", "covenant", "promise"] },
  { reference: "Бытие 24:7", tags: ["calling", "promise", "protection"] },
  { reference: "Бытие 28:15", tags: ["presence", "promise", "protection"] },
  { reference: "Бытие 39:2", tags: ["presence", "blessing", "protection"] },
  { reference: "Бытие 50:20", tags: ["sovereignty", "grace", "salvation"] },
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
    /^(?<book>(?:[1-3]\s+)?[A-Za-zА-Яа-яЁё ]+)\s+(?<chapter>\d+):(?<verseStart>\d+)(?:-(?<verseEnd>\d+))?$/
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

  const tagIdBySlug = new Map<TagSlug, string>();
  const stats = {
    createdCreatorUser: 0,
    reusedCreatorUser: 0,
    createdTags: 0,
    reusedTags: 0,
    updatedTags: 0,
    createdVerses: 0,
    reusedVerses: 0,
    createdOwnerLinks: 0,
    reusedOwnerLinks: 0,
    createdLinks: 0,
    reusedLinks: 0,
  };

  try {
    if (!dryRun) {
      const existingCreator = await prisma.user.findUnique({
        where: { telegramId: CREATOR_TELEGRAM_ID },
        select: { id: true },
      });

      if (existingCreator) {
        stats.reusedCreatorUser += 1;
      } else {
        await prisma.user.create({
          data: {
            telegramId: CREATOR_TELEGRAM_ID,
          },
          select: { id: true },
        });
        stats.createdCreatorUser += 1;
      }
    }

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

      const existingOwnerLink = dryRun
        ? null
        : await prisma.userVerse.findUnique({
            where: {
              telegramId_verseId: {
                telegramId: CREATOR_TELEGRAM_ID,
                verseId,
              },
            },
            select: { id: true },
          });

      if (existingOwnerLink) {
        stats.reusedOwnerLinks += 1;
      } else {
        if (!dryRun) {
          await prisma.userVerse.create({
            data: {
              telegramId: CREATOR_TELEGRAM_ID,
              verseId,
            },
            select: { id: true },
          });
        }
        stats.createdOwnerLinks += 1;
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
        `creator telegramId: ${CREATOR_TELEGRAM_ID}`,
        `seed entries: ${seedEntries.length}`,
        `creator user created: ${stats.createdCreatorUser}`,
        `creator user reused: ${stats.reusedCreatorUser}`,
        `tags created: ${stats.createdTags}`,
        `tags updated: ${stats.updatedTags}`,
        `tags reused: ${stats.reusedTags}`,
        `verses created: ${stats.createdVerses}`,
        `verses reused: ${stats.reusedVerses}`,
        `owner links created: ${stats.createdOwnerLinks}`,
        `owner links reused: ${stats.reusedOwnerLinks}`,
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
