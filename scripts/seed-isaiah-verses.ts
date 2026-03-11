import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const DATASET_NAME = "isaiah-popular";
const EXPECTED_SEED_ENTRY_COUNT = 49;

const TAG_TITLES = {
  creation: "Творение",
  discernment: "Различение",
  discipleship: "Ученичество",
  encouragement: "Ободрение",
  faith: "Вера",
  forgiveness: "Прощение",
  gospel: "Евангелие",
  healing: "Исцеление",
  holiness: "Святость",
  "holy-spirit": "Святой Дух",
  hope: "Надежда",
  humility: "Смирение",
  identity: "Идентичность",
  "jesus-christ": "Иисус Христос",
  joy: "Радость",
  judgment: "Суд",
  justice: "Справедливость",
  kingdom: "Царство Божье",
  law: "Закон",
  light: "Свет",
  love: "Любовь",
  mercy: "Милость",
  mission: "Миссия",
  obedience: "Послушание",
  peace: "Мир",
  perseverance: "Стойкость",
  power: "Сила",
  prayer: "Молитва",
  provision: "Божье обеспечение",
  refuge: "Прибежище",
  repentance: "Покаяние",
  resurrection: "Воскресение",
  righteousness: "Праведность",
  salvation: "Спасение",
  service: "Служение",
  suffering: "Страдания",
  truth: "Истина",
  warning: "Предостережение",
  wisdom: "Мудрость",
  witness: "Свидетельство",
  worship: "Поклонение",
} as const;

type TagSlug = keyof typeof TAG_TITLES;

type SeedEntry = {
  reference: string;
  tags: readonly TagSlug[];
};

const BOOK_NAME_TO_ID: Record<string, number> = {
  isaiah: 23,
  isa: 23,
  "исайя": 23,
  "исайи": 23,
  "книга пророка исаии": 23,
};

// Набор нормализован по Top Verses: соседние популярные стихи объединены в отрывки до 5 стихов.
const NORMALIZED_SEED_ENTRIES: readonly SeedEntry[] = [
  { reference: "Исайя 1:18", tags: ["repentance", "forgiveness", "hope"] },
  { reference: "Исайя 2:2-4", tags: ["kingdom", "peace", "hope", "justice"] },
  { reference: "Исайя 5:20", tags: ["warning", "truth"] },
  { reference: "Исайя 6:1-3", tags: ["holiness", "worship", "jesus-christ"] },
  { reference: "Исайя 6:7-8", tags: ["forgiveness", "mission", "holiness"] },
  { reference: "Исайя 7:14", tags: ["jesus-christ", "hope", "salvation"] },
  { reference: "Исайя 8:20", tags: ["truth", "warning"] },
  { reference: "Исайя 9:1-2", tags: ["light", "hope", "salvation"] },
  { reference: "Исайя 9:6-7", tags: ["jesus-christ", "kingdom", "peace"] },
  { reference: "Исайя 11:1-2", tags: ["jesus-christ", "holy-spirit", "hope"] },
  { reference: "Исайя 11:6-9", tags: ["peace", "kingdom", "creation"] },
  { reference: "Исайя 14:12-15", tags: ["warning", "judgment"] },
  { reference: "Исайя 26:3-4", tags: ["peace", "faith", "refuge"] },
  { reference: "Исайя 28:16", tags: ["faith", "salvation", "hope"] },
  { reference: "Исайя 29:13", tags: ["worship", "truth", "warning"] },
  { reference: "Исайя 33:22", tags: ["kingdom", "salvation", "jesus-christ"] },
  { reference: "Исайя 40:1-3", tags: ["encouragement", "hope", "mission"] },
  { reference: "Исайя 40:8", tags: ["truth", "hope"] },
  { reference: "Исайя 40:11", tags: ["provision", "mercy", "hope"] },
  { reference: "Исайя 40:28-31", tags: ["hope", "power", "faith"] },
  { reference: "Исайя 41:10", tags: ["hope", "faith", "encouragement"] },
  { reference: "Исайя 42:1-4", tags: ["jesus-christ", "mission", "justice", "holy-spirit"] },
  { reference: "Исайя 42:8", tags: ["worship", "truth"] },
  { reference: "Исайя 43:1-3", tags: ["hope", "salvation", "provision"] },
  { reference: "Исайя 43:10-11", tags: ["witness", "truth", "salvation"] },
  { reference: "Исайя 44:6", tags: ["truth", "worship"] },
  { reference: "Исайя 45:5-7", tags: ["truth", "creation"] },
  { reference: "Исайя 45:18", tags: ["creation", "truth"] },
  { reference: "Исайя 46:9-10", tags: ["truth", "hope"] },
  { reference: "Исайя 48:17", tags: ["wisdom", "obedience", "provision"] },
  { reference: "Исайя 50:4-5", tags: ["discipleship", "truth", "obedience"] },
  { reference: "Исайя 51:1-3", tags: ["righteousness", "hope", "encouragement"] },
  { reference: "Исайя 52:7", tags: ["gospel", "peace", "salvation"] },
  { reference: "Исайя 52:13-15", tags: ["jesus-christ", "salvation", "suffering"] },
  { reference: "Исайя 53:1-3", tags: ["jesus-christ", "suffering", "salvation"] },
  { reference: "Исайя 53:4-6", tags: ["salvation", "healing", "suffering"] },
  { reference: "Исайя 53:7", tags: ["humility", "jesus-christ", "suffering"] },
  { reference: "Исайя 53:10-12", tags: ["salvation", "jesus-christ", "resurrection"] },
  { reference: "Исайя 55:1-3", tags: ["provision", "salvation", "hope"] },
  { reference: "Исайя 55:6-9", tags: ["repentance", "truth", "humility"] },
  { reference: "Исайя 55:10-11", tags: ["truth", "faith", "hope"] },
  { reference: "Исайя 57:15", tags: ["humility", "hope", "holiness"] },
  { reference: "Исайя 58:6-7", tags: ["justice", "service", "love"] },
  { reference: "Исайя 58:13-14", tags: ["holiness", "joy", "worship"] },
  { reference: "Исайя 59:1-2", tags: ["warning", "holiness", "salvation"] },
  { reference: "Исайя 60:1-3", tags: ["light", "mission", "hope"] },
  { reference: "Исайя 61:1-2", tags: ["holy-spirit", "mission", "salvation"] },
  { reference: "Исайя 64:6", tags: ["warning", "righteousness"] },
  { reference: "Исайя 65:17-18", tags: ["creation", "hope", "joy"] },
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
