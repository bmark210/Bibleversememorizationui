import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const DATASET_NAME = "apologetics-topical";
const EXPECTED_SEED_ENTRY_COUNT = 64;

const TAG_TITLES = {
  apologetics: "Апологетика",
  "angel-of-the-lord": "Ангел Господень",
  authority: "Власть",
  creation: "Творение",
  deity: "Божество Христа",
  discernment: "Различение",
  encouragement: "Ободрение",
  exclusivity: "Единственный путь",
  faith: "Вера",
  "holy-spirit": "Святой Дух",
  holiness: "Святость",
  hope: "Надежда",
  humility: "Смирение",
  incarnation: "Воплощение",
  "jesus-christ": "Иисус Христос",
  kingdom: "Царство Божье",
  messiah: "Мессия",
  mission: "Миссия",
  monotheism: "Единство Бога",
  obedience: "Послушание",
  prophecy: "Пророчество",
  resurrection: "Воскресение",
  salvation: "Спасение",
  scripture: "Авторитет Писания",
  trinity: "Триединство",
  truth: "Истина",
  unity: "Единство",
  warning: "Предостережение",
  witness: "Свидетельство",
  worship: "Поклонение",
} as const;

type TagSlug = keyof typeof TAG_TITLES;

type SeedEntry = {
  reference: string;
  tags: readonly TagSlug[];
};

const BOOK_NAME_TO_ID: Record<string, number> = {
  genesis: 1,
  exodus: 2,
  deuteronomy: 5,
  judges: 7,
  isaiah: 23,
  jeremiah: 24,
  daniel: 27,
  micah: 33,
  matthew: 40,
  luke: 42,
  john: 43,
  acts: 44,
  romans: 45,
  "1 corinthians": 46,
  "2 corinthians": 47,
  ephesians: 49,
  philippians: 50,
  colossians: 51,
  "1 timothy": 54,
  "2 timothy": 55,
  titus: 56,
  hebrews: 58,
  "1 peter": 60,
  "2 peter": 61,
  "1 john": 62,
  jude: 65,
  revelation: 66,
  "бытие": 1,
  "исход": 2,
  "второзаконие": 5,
  "судей": 7,
  "книга судей": 7,
  "исайя": 23,
  "иеремия": 24,
  "иеремии": 24,
  "даниил": 27,
  "михей": 33,
  "михея": 33,
  "матфея": 40,
  "луки": 42,
  "иоанна": 43,
  "деяния": 44,
  "деяния апостолов": 44,
  "римлянам": 45,
  "1 коринфянам": 46,
  "2 коринфянам": 47,
  "ефесянам": 49,
  "филиппийцам": 50,
  "колоссянам": 51,
  "1 тимофею": 54,
  "2 тимофею": 55,
  "титу": 56,
  "евреям": 58,
  "1 петра": 60,
  "2 петра": 61,
  "1 иоанна": 62,
  "иуды": 65,
  "откровение": 66,
  "откровение иоанна богослова": 66,
};

// Набор собран по самым ходовым апологетическим proof-texts:
// божество Христа, Триединство, авторитет Писания, пророчества о Мессии,
// воскресение, сотворение и исключительность Христа.
const NORMALIZED_SEED_ENTRIES: readonly SeedEntry[] = [
  { reference: "Бытие 1:1", tags: ["apologetics", "creation", "monotheism", "truth"] },
  { reference: "Бытие 1:26-27", tags: ["apologetics", "trinity", "creation", "truth"] },
  { reference: "Бытие 16:7-10", tags: ["apologetics", "angel-of-the-lord", "hope"] },
  { reference: "Бытие 16:11-13", tags: ["apologetics", "angel-of-the-lord", "truth"] },
  {
    reference: "Бытие 22:11-14",
    tags: ["apologetics", "angel-of-the-lord", "truth", "worship"],
  },
  {
    reference: "Исход 3:2-6",
    tags: ["apologetics", "angel-of-the-lord", "holiness", "truth"],
  },
  { reference: "Исход 3:14", tags: ["apologetics", "monotheism", "truth"] },
  {
    reference: "Второзаконие 6:4-6",
    tags: ["apologetics", "monotheism", "trinity", "worship"],
  },
  {
    reference: "Судей 6:11-14",
    tags: ["apologetics", "angel-of-the-lord", "mission", "encouragement"],
  },
  {
    reference: "Судей 13:21-22",
    tags: ["apologetics", "angel-of-the-lord", "truth", "holiness"],
  },
  { reference: "Исайя 7:14", tags: ["apologetics", "prophecy", "messiah", "incarnation"] },
  { reference: "Исайя 9:6-7", tags: ["apologetics", "prophecy", "messiah", "deity"] },
  { reference: "Исайя 44:6", tags: ["apologetics", "monotheism", "truth"] },
  { reference: "Исайя 53:4-6", tags: ["apologetics", "prophecy", "messiah", "salvation"] },
  { reference: "Иеремия 23:5-6", tags: ["apologetics", "prophecy", "messiah", "deity"] },
  { reference: "Михея 5:2", tags: ["apologetics", "prophecy", "messiah"] },
  { reference: "Даниил 7:13-14", tags: ["apologetics", "messiah", "deity", "kingdom"] },
  {
    reference: "Матфея 3:16-17",
    tags: ["apologetics", "trinity", "holy-spirit", "jesus-christ"],
  },
  { reference: "Матфея 5:17-18", tags: ["apologetics", "scripture", "truth"] },
  {
    reference: "Матфея 28:18-20",
    tags: ["apologetics", "trinity", "authority", "mission"],
  },
  { reference: "Луки 24:36-39", tags: ["apologetics", "resurrection", "witness", "truth"] },
  { reference: "Иоанна 1:1-3", tags: ["apologetics", "deity", "creation", "truth"] },
  {
    reference: "Иоанна 1:14",
    tags: ["apologetics", "incarnation", "deity", "jesus-christ"],
  },
  { reference: "Иоанна 1:18", tags: ["apologetics", "deity", "truth"] },
  { reference: "Иоанна 5:23", tags: ["apologetics", "deity", "worship"] },
  { reference: "Иоанна 8:58-59", tags: ["apologetics", "deity", "truth"] },
  { reference: "Иоанна 10:30-33", tags: ["apologetics", "deity", "truth"] },
  { reference: "Иоанна 10:35", tags: ["apologetics", "scripture", "truth"] },
  { reference: "Иоанна 14:6", tags: ["apologetics", "exclusivity", "salvation", "truth"] },
  { reference: "Иоанна 14:9-11", tags: ["apologetics", "deity", "truth"] },
  {
    reference: "Иоанна 14:16-17",
    tags: ["apologetics", "trinity", "holy-spirit", "truth"],
  },
  { reference: "Иоанна 14:26", tags: ["apologetics", "trinity", "holy-spirit", "truth"] },
  {
    reference: "Иоанна 16:13-15",
    tags: ["apologetics", "trinity", "holy-spirit", "truth"],
  },
  { reference: "Иоанна 17:17", tags: ["apologetics", "scripture", "truth"] },
  {
    reference: "Иоанна 20:27-29",
    tags: ["apologetics", "deity", "resurrection", "witness"],
  },
  { reference: "Деяния 1:3", tags: ["apologetics", "resurrection", "witness"] },
  { reference: "Деяния 4:10-12", tags: ["apologetics", "exclusivity", "salvation", "truth"] },
  { reference: "Деяния 5:3-4", tags: ["apologetics", "trinity", "holy-spirit", "truth"] },
  {
    reference: "Деяния 17:2-4",
    tags: ["apologetics", "scripture", "prophecy", "messiah"],
  },
  { reference: "Деяния 17:11", tags: ["apologetics", "scripture", "discernment"] },
  { reference: "Римлянам 1:19-20", tags: ["apologetics", "creation", "truth"] },
  {
    reference: "1 Коринфянам 8:6",
    tags: ["apologetics", "monotheism", "deity", "trinity"],
  },
  {
    reference: "1 Коринфянам 15:3-6",
    tags: ["apologetics", "resurrection", "witness", "salvation"],
  },
  { reference: "2 Коринфянам 10:3-5", tags: ["apologetics", "truth", "obedience"] },
  { reference: "2 Коринфянам 13:13", tags: ["apologetics", "trinity", "holy-spirit"] },
  { reference: "Ефесянам 4:4-6", tags: ["apologetics", "trinity", "unity"] },
  {
    reference: "Филиппийцам 2:5-8",
    tags: ["apologetics", "incarnation", "humility", "deity"],
  },
  { reference: "Филиппийцам 2:9-11", tags: ["apologetics", "deity", "worship"] },
  { reference: "Колоссянам 1:15-17", tags: ["apologetics", "deity", "creation"] },
  { reference: "Колоссянам 2:8-10", tags: ["apologetics", "deity", "truth"] },
  { reference: "1 Тимофею 2:5", tags: ["apologetics", "exclusivity", "salvation"] },
  { reference: "1 Тимофею 3:16", tags: ["apologetics", "incarnation", "truth"] },
  { reference: "2 Тимофею 3:16-17", tags: ["apologetics", "scripture", "truth"] },
  { reference: "Титу 2:13", tags: ["apologetics", "deity", "hope"] },
  { reference: "Евреям 1:1-3", tags: ["apologetics", "deity", "scripture", "truth"] },
  { reference: "Евреям 1:8-10", tags: ["apologetics", "deity", "worship"] },
  { reference: "Евреям 4:12", tags: ["apologetics", "scripture", "truth"] },
  { reference: "Евреям 11:3", tags: ["apologetics", "creation", "faith"] },
  { reference: "1 Петра 3:15-16", tags: ["apologetics", "hope", "truth"] },
  { reference: "2 Петра 1:16-18", tags: ["apologetics", "witness", "truth"] },
  {
    reference: "2 Петра 1:19-21",
    tags: ["apologetics", "scripture", "prophecy", "truth"],
  },
  { reference: "1 Иоанна 5:20", tags: ["apologetics", "deity", "truth"] },
  { reference: "Иуды 1:3-4", tags: ["apologetics", "truth", "warning"] },
  { reference: "Откровение 1:17-18", tags: ["apologetics", "deity", "resurrection"] },
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
