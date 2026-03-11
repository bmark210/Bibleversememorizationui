// import nextEnv from "@next/env";

// nextEnv.loadEnvConfig(process.cwd());

// const DATASET_NAME = "galatians-popular";
// const EXPECTED_SEED_ENTRY_COUNT = 27;
// const CREATOR_TELEGRAM_ID = "891739957";

// const TAG_TITLES = {
//   adoption: "Усыновление",
//   calling: "Призвание",
//   cross: "Крест",
//   discipleship: "Ученичество",
//   encouragement: "Ободрение",
//   faith: "Вера",
//   flesh: "Плоть",
//   freedom: "Свобода",
//   fruit: "Плод Духа",
//   gospel: "Евангелие",
//   grace: "Благодать",
//   holiness: "Святость",
//   humility: "Смирение",
//   "holy-spirit": "Святой Дух",
//   identity: "Идентичность",
//   "jesus-christ": "Иисус Христос",
//   judgment: "Суд",
//   law: "Закон",
//   love: "Любовь",
//   obedience: "Послушание",
//   perseverance: "Стойкость",
//   promise: "Обетование",
//   revelation: "Откровение",
//   righteousness: "Праведность",
//   salvation: "Спасение",
//   service: "Служение",
//   suffering: "Страдания",
//   truth: "Истина",
//   unity: "Единство",
//   warning: "Предостережение",
//   worship: "Поклонение",
//   zeal: "Ревность",
// } as const;

// type TagSlug = keyof typeof TAG_TITLES;

// type SeedEntry = {
//   reference: string;
//   tags: readonly TagSlug[];
// };

// const BOOK_NAME_TO_ID: Record<string, number> = {
//   galatians: 48,
//   "к галатам": 48,
//   галатам: 48,
// };

// // Набор нормализован по Top Verses: соседние популярные стихи объединены в диапазоны до 5 стихов.
// const NORMALIZED_SEED_ENTRIES: readonly SeedEntry[] = [
//   { reference: "Галатам 5:22-23", tags: ["holy-spirit", "fruit", "holiness", "love"] },
//   { reference: "Галатам 2:20", tags: ["faith", "jesus-christ", "cross", "identity", "love"] },
//   { reference: "Галатам 3:26-28", tags: ["faith", "identity", "unity", "adoption"] },
//   { reference: "Галатам 5:16", tags: ["holy-spirit", "flesh", "obedience"] },
//   { reference: "Галатам 5:1", tags: ["freedom", "grace", "faith"] },
//   { reference: "Галатам 3:4", tags: ["suffering", "perseverance"] },
//   { reference: "Галатам 6:7", tags: ["judgment", "truth", "obedience"] },
//   { reference: "Галатам 4:4", tags: ["jesus-christ", "salvation", "grace"] },
//   { reference: "Галатам 6:1-2", tags: ["love", "service", "humility", "unity"] },
//   { reference: "Галатам 1:6-8", tags: ["gospel", "grace", "warning", "truth"] },
//   { reference: "Галатам 3:13", tags: ["cross", "grace", "salvation"] },
//   { reference: "Галатам 5:13-15", tags: ["freedom", "love", "service", "unity"] },
//   { reference: "Галатам 6:9-10", tags: ["perseverance", "love", "service", "encouragement"] },
//   { reference: "Галатам 2:3", tags: ["freedom", "grace", "gospel"] },
//   { reference: "Галатам 2:16", tags: ["faith", "righteousness", "law", "grace"] },
//   { reference: "Галатам 1:5", tags: ["worship", "jesus-christ"] },
//   { reference: "Галатам 4:6", tags: ["holy-spirit", "adoption", "faith"] },
//   { reference: "Галатам 3:1", tags: ["truth", "faith", "jesus-christ"] },
//   { reference: "Галатам 5:6-8", tags: ["faith", "love", "calling", "truth"] },
//   { reference: "Галатам 2:11", tags: ["truth", "obedience", "unity"] },
//   { reference: "Галатам 6:14", tags: ["cross", "grace", "identity"] },
//   { reference: "Галатам 3:10", tags: ["law", "judgment"] },
//   { reference: "Галатам 3:16", tags: ["promise", "jesus-christ"] },
//   { reference: "Галатам 3:23-24", tags: ["law", "faith", "discipleship"] },
//   { reference: "Галатам 1:10-12", tags: ["gospel", "calling", "revelation", "truth"] },
//   { reference: "Галатам 1:1", tags: ["calling", "gospel", "jesus-christ"] },
//   { reference: "Галатам 1:14", tags: ["law", "zeal"] },
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
