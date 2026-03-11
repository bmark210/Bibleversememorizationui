// import nextEnv from "@next/env";

// nextEnv.loadEnvConfig(process.cwd());

// const DATASET_NAME = "1-corinthians-popular";
// const EXPECTED_SEED_ENTRY_COUNT = 39;
// const CREATOR_TELEGRAM_ID = "891739957";

// const TAG_TITLES = {
//   "body-of-christ": "Тело Христово",
//   calling: "Призвание",
//   church: "Церковь",
//   communion: "Причастие",
//   creation: "Творение",
//   cross: "Крест",
//   discipline: "Дисциплина",
//   discernment: "Различение",
//   discipleship: "Ученичество",
//   endurance: "Стойкость",
//   faith: "Вера",
//   freedom: "Свобода",
//   gifts: "Дары",
//   gospel: "Евангелие",
//   grace: "Благодать",
//   "holy-spirit": "Святой Дух",
//   holiness: "Святость",
//   hope: "Надежда",
//   humility: "Смирение",
//   identity: "Идентичность",
//   immorality: "Нечистота",
//   "jesus-christ": "Иисус Христос",
//   judgment: "Суд",
//   love: "Любовь",
//   marriage: "Брак",
//   order: "Порядок",
//   purity: "Чистота",
//   resurrection: "Воскресение",
//   righteousness: "Праведность",
//   salvation: "Спасение",
//   sanctification: "Освящение",
//   service: "Служение",
//   singleness: "Безбрачие",
//   stewardship: "Верность",
//   suffering: "Страдания",
//   temptation: "Искушение",
//   truth: "Истина",
//   unity: "Единство",
//   warning: "Предостережение",
//   wisdom: "Мудрость",
//   worship: "Поклонение",
// } as const;

// type TagSlug = keyof typeof TAG_TITLES;

// type SeedEntry = {
//   reference: string;
//   tags: readonly TagSlug[];
// };

// const BOOK_NAME_TO_ID: Record<string, number> = {
//   "1 corinthians": 46,
//   "1 cor": 46,
//   "1 коринфянам": 46,
//   "1-е коринфянам": 46,
//   "1-е к коринфянам": 46,
//   "1 к коринфянам": 46,
// };

// // Набор нормализован по Top Verses: соседние популярные стихи объединены в диапазоны до 5 стихов.
// const NORMALIZED_SEED_ENTRIES: readonly SeedEntry[] = [
//   { reference: "1 Коринфянам 6:9-11", tags: ["holiness", "immorality", "sanctification", "grace"] },
//   { reference: "1 Коринфянам 15:1-4", tags: ["gospel", "resurrection", "faith", "cross"] },
//   { reference: "1 Коринфянам 13:1-4", tags: ["love", "humility", "service"] },
//   { reference: "1 Коринфянам 6:18-20", tags: ["holiness", "purity", "holy-spirit", "worship"] },
//   { reference: "1 Коринфянам 10:13", tags: ["temptation", "faith", "hope"] },
//   { reference: "1 Коринфянам 1:18", tags: ["cross", "gospel", "salvation"] },
//   { reference: "1 Коринфянам 12:12-14", tags: ["body-of-christ", "unity", "church"] },
//   { reference: "1 Коринфянам 15:50-51", tags: ["resurrection", "hope"] },
//   { reference: "1 Коринфянам 11:23-24", tags: ["communion", "worship", "jesus-christ"] },
//   { reference: "1 Коринфянам 10:31", tags: ["worship", "stewardship"] },
//   { reference: "1 Коринфянам 3:4", tags: ["unity", "humility", "church"] },
//   { reference: "1 Коринфянам 2:3", tags: ["humility", "suffering"] },
//   { reference: "1 Коринфянам 3:16", tags: ["holy-spirit", "church", "holiness"] },
//   { reference: "1 Коринфянам 2:9-10", tags: ["holy-spirit", "wisdom", "hope"] },
//   { reference: "1 Коринфянам 7:8", tags: ["singleness", "calling"] },
//   { reference: "1 Коринфянам 12:1-4", tags: ["gifts", "holy-spirit", "church"] },
//   { reference: "1 Коринфянам 2:14", tags: ["holy-spirit", "discernment", "truth"] },
//   { reference: "1 Коринфянам 1:10", tags: ["unity", "church", "love"] },
//   { reference: "1 Коринфянам 9:10", tags: ["service", "hope", "stewardship"] },
//   { reference: "1 Коринфянам 11:12", tags: ["creation", "humility"] },
//   { reference: "1 Коринфянам 9:24", tags: ["endurance", "discipline", "service"] },
//   { reference: "1 Коринфянам 1:30", tags: ["jesus-christ", "wisdom", "righteousness", "sanctification"] },
//   { reference: "1 Коринфянам 8:9", tags: ["freedom", "love", "stewardship"] },
//   { reference: "1 Коринфянам 1:2", tags: ["church", "calling", "holiness"] },
//   { reference: "1 Коринфянам 15:20", tags: ["resurrection", "hope", "jesus-christ"] },
//   { reference: "1 Коринфянам 7:1", tags: ["marriage", "purity"] },
//   { reference: "1 Коринфянам 10:1", tags: ["warning", "faith"] },
//   { reference: "1 Коринфянам 15:58", tags: ["endurance", "service", "hope"] },
//   { reference: "1 Коринфянам 13:12-13", tags: ["love", "faith", "hope"] },
//   { reference: "1 Коринфянам 8:6", tags: ["jesus-christ", "truth", "worship"] },
//   { reference: "1 Коринфянам 11:1-3", tags: ["discipleship", "order", "church"] },
//   { reference: "1 Коринфянам 5:7-8", tags: ["cross", "purity", "worship"] },
//   { reference: "1 Коринфянам 6:7", tags: ["humility", "suffering", "unity"] },
//   { reference: "1 Коринфянам 14:34", tags: ["church", "order"] },
//   { reference: "1 Коринфянам 3:11", tags: ["jesus-christ", "church", "gospel"] },
//   { reference: "1 Коринфянам 12:7", tags: ["gifts", "service", "church"] },
//   { reference: "1 Коринфянам 13:8", tags: ["love", "hope"] },
//   { reference: "1 Коринфянам 9:19", tags: ["service", "love", "freedom"] },
//   { reference: "1 Коринфянам 10:16", tags: ["communion", "unity", "worship"] },
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
