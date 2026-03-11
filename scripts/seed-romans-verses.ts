// import nextEnv from "@next/env";

// nextEnv.loadEnvConfig(process.cwd());

// const DATASET_NAME = "romans-popular";
// const EXPECTED_SEED_ENTRY_COUNT = 39;
// const CREATOR_TELEGRAM_ID = "891739957";

// const TAG_TITLES = {
//   adoption: "Усыновление",
//   assurance: "Уверенность",
//   authority: "Власть",
//   baptism: "Крещение",
//   calling: "Призвание",
//   church: "Церковь",
//   creation: "Творение",
//   discernment: "Различение",
//   encouragement: "Ободрение",
//   faith: "Вера",
//   gospel: "Евангелие",
//   grace: "Благодать",
//   "holy-spirit": "Святой Дух",
//   hope: "Надежда",
//   humility: "Смирение",
//   "jesus-christ": "Иисус Христос",
//   judgment: "Суд",
//   justification: "Оправдание",
//   law: "Закон",
//   love: "Любовь",
//   obedience: "Послушание",
//   peace: "Мир",
//   perseverance: "Стойкость",
//   prayer: "Молитва",
//   renewal: "Обновление",
//   resurrection: "Воскресение",
//   righteousness: "Праведность",
//   sacrifice: "Жертва",
//   salvation: "Спасение",
//   scripture: "Писание",
//   sin: "Грех",
//   sovereignty: "Божий промысел",
//   suffering: "Страдания",
//   unity: "Единство",
//   worship: "Поклонение",
// } as const;

// type TagSlug = keyof typeof TAG_TITLES;

// type SeedEntry = {
//   reference: string;
//   tags: readonly TagSlug[];
// };

// const BOOK_NAME_TO_ID: Record<string, number> = {
//   romans: 45,
//   "к римлянам": 45,
//   "римлянам": 45,
// };

// // Набор уже нормализован по популярности: соседние стихи объединены в один отрывок, диапазоны не длиннее 5 стихов.
// const NORMALIZED_SEED_ENTRIES: readonly SeedEntry[] = [
//   { reference: "Римлянам 3:23-24", tags: ["sin", "grace", "justification", "salvation"] },
//   { reference: "Римлянам 10:9", tags: ["salvation", "faith", "gospel"] },
//   { reference: "Римлянам 6:23", tags: ["sin", "salvation", "grace"] },
//   { reference: "Римлянам 8:28-29", tags: ["hope", "assurance", "sovereignty"] },
//   { reference: "Римлянам 12:1-3", tags: ["sacrifice", "worship", "renewal", "humility"] },
//   { reference: "Римлянам 5:8", tags: ["love", "grace", "salvation"] },
//   { reference: "Римлянам 5:12", tags: ["sin", "judgment"] },
//   { reference: "Римлянам 5:1", tags: ["faith", "justification", "peace"] },
//   { reference: "Римлянам 1:16-18", tags: ["gospel", "salvation", "righteousness", "judgment"] },
//   { reference: "Римлянам 8:1", tags: ["assurance", "salvation", "grace"] },
//   { reference: "Римлянам 10:13-14", tags: ["salvation", "faith", "gospel"] },
//   { reference: "Римлянам 10:17", tags: ["faith", "scripture"] },
//   { reference: "Римлянам 13:1", tags: ["authority", "obedience"] },
//   { reference: "Римлянам 3:10", tags: ["sin", "righteousness"] },
//   { reference: "Римлянам 1:20", tags: ["creation", "judgment"] },
//   { reference: "Римлянам 6:1", tags: ["grace", "sin"] },
//   { reference: "Римлянам 6:3-4", tags: ["baptism", "renewal", "resurrection"] },
//   { reference: "Римлянам 8:9", tags: ["holy-spirit", "renewal"] },
//   { reference: "Римлянам 8:26", tags: ["holy-spirit", "prayer"] },
//   { reference: "Римлянам 8:14-16", tags: ["holy-spirit", "adoption", "assurance"] },
//   { reference: "Римлянам 8:31", tags: ["assurance", "hope"] },
//   { reference: "Римлянам 8:38", tags: ["love", "assurance"] },
//   { reference: "Римлянам 1:6", tags: ["calling", "church"] },
//   { reference: "Римлянам 8:18", tags: ["suffering", "hope"] },
//   { reference: "Римлянам 1:26", tags: ["sin", "judgment"] },
//   { reference: "Римлянам 3:21", tags: ["law", "righteousness", "justification"] },
//   { reference: "Римлянам 15:4", tags: ["hope", "scripture", "encouragement"] },
//   { reference: "Римлянам 5:6", tags: ["love", "grace", "salvation"] },
//   { reference: "Римлянам 1:3", tags: ["jesus-christ", "gospel"] },
//   { reference: "Римлянам 1:1", tags: ["gospel", "calling"] },
//   { reference: "Римлянам 2:3", tags: ["judgment", "sin"] },
//   { reference: "Римлянам 12:9", tags: ["love", "obedience", "discernment"] },
//   { reference: "Римлянам 9:11", tags: ["grace", "calling", "sovereignty"] },
//   { reference: "Римлянам 5:3", tags: ["suffering", "hope", "perseverance"] },
//   { reference: "Римлянам 1:9-10", tags: ["prayer", "calling"] },
//   { reference: "Римлянам 1:12", tags: ["faith", "church", "encouragement"] },
//   { reference: "Римлянам 8:35", tags: ["love", "suffering", "assurance"] },
//   { reference: "Римлянам 13:8", tags: ["love", "obedience", "unity"] },
//   { reference: "Римлянам 16:17", tags: ["discernment", "church", "obedience"] },
// ];

// function normalizeBookName(value: string): string {
//   return value.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
// }

// function normalizeReference(reference: string): string {
//   return reference
//     .trim()
//     .replace(/[–—−]/g, "-")
//     .replace(/\s*-\s*/g, "-")
//     .replace(/\s+/g, " ");
// }

// function parseHumanReference(reference: string): {
//   book: number;
//   chapter: number;
//   verseStart: number;
//   verseEnd: number;
// } {
//   const normalized = normalizeReference(reference);
//   const match = normalized.match(
//     /^(?<book>(?:[1-3]\s+)?[A-Za-zА-Яа-яЁё ]+)\s+(?<chapter>\d+):(?<verseStart>\d+)(?:-(?<verseEnd>\d+))?$/
//   );

//   if (!match?.groups) {
//     throw new Error(`Unsupported reference format: "${reference}"`);
//   }

//   const bookName = normalizeBookName(match.groups.book);
//   const book = BOOK_NAME_TO_ID[bookName];
//   if (!book) {
//     throw new Error(`Unsupported book name: "${match.groups.book}"`);
//   }

//   const chapter = Number(match.groups.chapter);
//   const verseStart = Number(match.groups.verseStart);
//   const verseEnd = Number(match.groups.verseEnd ?? match.groups.verseStart);

//   if (
//     !Number.isInteger(chapter) ||
//     !Number.isInteger(verseStart) ||
//     !Number.isInteger(verseEnd) ||
//     chapter <= 0 ||
//     verseStart <= 0 ||
//     verseEnd <= 0
//   ) {
//     throw new Error(`Reference contains invalid numbers: "${reference}"`);
//   }

//   return {
//     book,
//     chapter,
//     verseStart,
//     verseEnd,
//   };
// }

// function buildSeedEntries(): Array<{ reference: string; tags: TagSlug[] }> {
//   return NORMALIZED_SEED_ENTRIES.map((entry) => ({
//     reference: normalizeReference(entry.reference),
//     tags: Array.from(new Set(entry.tags)),
//   }));
// }

// async function main() {
//   const dryRun = process.argv.includes("--dry-run");

//   const [{ prisma }, helloao, externalVerseId] = await Promise.all([
//     import("../src/lib/prisma"),
//     import("../src/shared/bible/helloao"),
//     import("../src/shared/bible/externalVerseId"),
//   ]);

//   const {
//     DEFAULT_HELLOAO_TRANSLATION,
//     getHelloaoChapterVerseMap,
//     getHelloaoTranslations,
//   } = helloao;
//   const {
//     MAX_EXTERNAL_VERSE_RANGE_SIZE,
//     canonicalizeExternalVerseId,
//     expandParsedExternalVerseNumbers,
//     parseExternalVerseId,
//   } = externalVerseId;

//   const seedEntries = buildSeedEntries();
//   const uniqueReferences = new Set(seedEntries.map((entry) => entry.reference));

//   if (seedEntries.length !== EXPECTED_SEED_ENTRY_COUNT) {
//     throw new Error(
//       `Expected ${EXPECTED_SEED_ENTRY_COUNT} seed entries, received ${seedEntries.length}`
//     );
//   }

//   if (uniqueReferences.size !== seedEntries.length) {
//     throw new Error("Seed references must be unique");
//   }

//   const unknownTags = seedEntries
//     .flatMap((entry) => entry.tags)
//     .filter((tag) => !(tag in TAG_TITLES));
//   if (unknownTags.length > 0) {
//     throw new Error(`Unknown tag slugs found: ${Array.from(new Set(unknownTags)).join(", ")}`);
//   }

//   const translations = await getHelloaoTranslations();
//   const hasDefaultTranslation = translations.some(
//     (translation) => translation.id === DEFAULT_HELLOAO_TRANSLATION
//   );
//   if (!hasDefaultTranslation) {
//     throw new Error(
//       `HelloAO translation "${DEFAULT_HELLOAO_TRANSLATION}" is unavailable right now`
//     );
//   }

//   const stats = {
//     createdCreatorUser: 0,
//     reusedCreatorUser: 0,
//     createdTags: 0,
//     reusedTags: 0,
//     updatedTags: 0,
//     createdVerses: 0,
//     reusedVerses: 0,
//     createdOwnerLinks: 0,
//     reusedOwnerLinks: 0,
//     createdLinks: 0,
//     reusedLinks: 0,
//   };

//   const tagIdBySlug = new Map<TagSlug, string>();

//   try {
//     if (!dryRun) {
//       const existingCreator = await prisma.user.findUnique({
//         where: { telegramId: CREATOR_TELEGRAM_ID },
//         select: { id: true },
//       });

//       if (existingCreator) {
//         stats.reusedCreatorUser += 1;
//       } else {
//         await prisma.user.create({
//           data: {
//             telegramId: CREATOR_TELEGRAM_ID,
//           },
//           select: { id: true },
//         });
//         stats.createdCreatorUser += 1;
//       }
//     }

//     for (const [slug, title] of Object.entries(TAG_TITLES) as [TagSlug, string][]) {
//       const existing = await prisma.tag.findFirst({
//         where: {
//           OR: [{ slug }, { title }],
//         },
//         select: {
//           id: true,
//           slug: true,
//           title: true,
//         },
//       });

//       if (!existing) {
//         if (dryRun) {
//           stats.createdTags += 1;
//           tagIdBySlug.set(slug, `dry-tag-${slug}`);
//           continue;
//         }

//         const created = await prisma.tag.create({
//           data: { slug, title },
//           select: { id: true },
//         });
//         stats.createdTags += 1;
//         tagIdBySlug.set(slug, created.id);
//         continue;
//       }

//       if (existing.slug !== slug || existing.title !== title) {
//         if (dryRun) {
//           stats.updatedTags += 1;
//           tagIdBySlug.set(slug, existing.id);
//           continue;
//         }

//         const updated = await prisma.tag.update({
//           where: { id: existing.id },
//           data: { slug, title },
//           select: { id: true },
//         });
//         stats.updatedTags += 1;
//         tagIdBySlug.set(slug, updated.id);
//         continue;
//       }

//       stats.reusedTags += 1;
//       tagIdBySlug.set(slug, existing.id);
//     }

//     for (const entry of seedEntries) {
//       const parsedHuman = parseHumanReference(entry.reference);
//       const candidateExternalVerseId =
//         parsedHuman.verseStart === parsedHuman.verseEnd
//           ? `${parsedHuman.book}-${parsedHuman.chapter}-${parsedHuman.verseStart}`
//           : `${parsedHuman.book}-${parsedHuman.chapter}-${parsedHuman.verseStart}-${parsedHuman.verseEnd}`;

//       const canonicalExternalVerseId = canonicalizeExternalVerseId(candidateExternalVerseId);
//       if (!canonicalExternalVerseId) {
//         throw new Error(
//           `Reference "${entry.reference}" is invalid after canonicalization. Ranges must stay within one chapter and within ${MAX_EXTERNAL_VERSE_RANGE_SIZE} verses.`
//         );
//       }

//       const parsedExternalVerseId = parseExternalVerseId(canonicalExternalVerseId);
//       if (!parsedExternalVerseId) {
//         throw new Error(`Unable to parse canonical externalVerseId "${canonicalExternalVerseId}"`);
//       }

//       const chapterMap = await getHelloaoChapterVerseMap({
//         translation: DEFAULT_HELLOAO_TRANSLATION,
//         book: parsedExternalVerseId.book,
//         chapter: parsedExternalVerseId.chapter,
//       });

//       const missingVerses = expandParsedExternalVerseNumbers(parsedExternalVerseId).filter(
//         (verseNumber) => {
//           const text = chapterMap.get(verseNumber);
//           return typeof text !== "string" || text.trim().length === 0;
//         }
//       );
//       if (missingVerses.length > 0) {
//         throw new Error(
//           `HelloAO has no text for ${entry.reference} (${canonicalExternalVerseId}); missing verses: ${missingVerses.join(", ")}`
//         );
//       }

//       const existingVerse = await prisma.verse.findUnique({
//         where: { externalVerseId: canonicalExternalVerseId },
//         select: { id: true },
//       });

//       const verseId =
//         existingVerse?.id ??
//         (dryRun
//           ? `dry-verse-${canonicalExternalVerseId}`
//           : (
//               await prisma.verse.create({
//                 data: { externalVerseId: canonicalExternalVerseId },
//                 select: { id: true },
//               })
//             ).id);

//       if (existingVerse) {
//         stats.reusedVerses += 1;
//       } else {
//         stats.createdVerses += 1;
//       }

//       const existingOwnerLink = dryRun
//         ? null
//         : await prisma.userVerse.findUnique({
//             where: {
//               telegramId_verseId: {
//                 telegramId: CREATOR_TELEGRAM_ID,
//                 verseId,
//               },
//             },
//             select: { id: true },
//           });

//       if (existingOwnerLink) {
//         stats.reusedOwnerLinks += 1;
//       } else {
//         if (!dryRun) {
//           await prisma.userVerse.create({
//             data: {
//               telegramId: CREATOR_TELEGRAM_ID,
//               verseId,
//             },
//             select: { id: true },
//           });
//         }
//         stats.createdOwnerLinks += 1;
//       }

//       for (const tagSlug of entry.tags) {
//         const tagId = tagIdBySlug.get(tagSlug);
//         if (!tagId) {
//           throw new Error(`Tag "${tagSlug}" was not prepared before verse import`);
//         }

//         const existingLink = dryRun
//           ? null
//           : await prisma.verseTag.findUnique({
//               where: {
//                 verseId_tagId: {
//                   verseId,
//                   tagId,
//                 },
//               },
//               select: { id: true },
//             });

//         if (existingLink) {
//           stats.reusedLinks += 1;
//           continue;
//         }

//         if (!dryRun) {
//           await prisma.verseTag.create({
//             data: {
//               verseId,
//               tagId,
//             },
//           });
//         }
//         stats.createdLinks += 1;
//       }
//     }

//     console.log(
//       [
//         `dataset: ${DATASET_NAME}`,
//         `mode: ${dryRun ? "dry-run" : "write"}`,
//         `translation: ${DEFAULT_HELLOAO_TRANSLATION}`,
//         `creator telegramId: ${CREATOR_TELEGRAM_ID}`,
//         `seed entries: ${seedEntries.length}`,
//         `creator user created: ${stats.createdCreatorUser}`,
//         `creator user reused: ${stats.reusedCreatorUser}`,
//         `tags created: ${stats.createdTags}`,
//         `tags updated: ${stats.updatedTags}`,
//         `tags reused: ${stats.reusedTags}`,
//         `verses created: ${stats.createdVerses}`,
//         `verses reused: ${stats.reusedVerses}`,
//         `owner links created: ${stats.createdOwnerLinks}`,
//         `owner links reused: ${stats.reusedOwnerLinks}`,
//         `verse-tag links created: ${stats.createdLinks}`,
//         `verse-tag links reused: ${stats.reusedLinks}`,
//         `ranges supported: yes (up to ${MAX_EXTERNAL_VERSE_RANGE_SIZE} verses in one chapter)`,
//       ].join("\n")
//     );
//   } finally {
//     await prisma.$disconnect();
//   }
// }

// void main().catch((error) => {
//   console.error(error instanceof Error ? error.message : error);
//   process.exit(1);
// });
