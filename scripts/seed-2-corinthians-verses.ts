// import nextEnv from "@next/env";

// nextEnv.loadEnvConfig(process.cwd());

// const DATASET_NAME = "2-corinthians-popular";
// const EXPECTED_SEED_ENTRY_COUNT = 29;

// const TAG_TITLES = {
//   church: "Церковь",
//   covenant: "Завет",
//   creation: "Творение",
//   discernment: "Различение",
//   discipline: "Дисциплина",
//   encouragement: "Ободрение",
//   faith: "Вера",
//   freedom: "Свобода",
//   generosity: "Щедрость",
//   gospel: "Евангелие",
//   grace: "Благодать",
//   "holy-spirit": "Святой Дух",
//   holiness: "Святость",
//   hope: "Надежда",
//   humility: "Смирение",
//   identity: "Идентичность",
//   "jesus-christ": "Иисус Христос",
//   judgment: "Суд",
//   light: "Свет",
//   love: "Любовь",
//   mission: "Миссия",
//   obedience: "Послушание",
//   peace: "Мир",
//   power: "Сила",
//   perseverance: "Стойкость",
//   provision: "Божье обеспечение",
//   reconciliation: "Примирение",
//   renewal: "Обновление",
//   repentance: "Покаяние",
//   resurrection: "Воскресение",
//   righteousness: "Праведность",
//   salvation: "Спасение",
//   sanctification: "Освящение",
//   service: "Служение",
//   "spiritual-warfare": "Духовная брань",
//   stewardship: "Верность",
//   suffering: "Страдания",
//   truth: "Истина",
//   unity: "Единство",
//   warning: "Предостережение",
//   weakness: "Немощь",
//   witness: "Свидетельство",
//   worship: "Поклонение",
// } as const;

// type TagSlug = keyof typeof TAG_TITLES;

// type SeedEntry = {
//   reference: string;
//   tags: readonly TagSlug[];
// };

// const BOOK_NAME_TO_ID: Record<string, number> = {
//   "2 corinthians": 47,
//   "2 cor": 47,
//   "2 коринфянам": 47,
//   "2-е коринфянам": 47,
//   "2-е к коринфянам": 47,
//   "2 к коринфянам": 47,
// };

// // Набор нормализован по Top Verses: соседние популярные стихи объединены в отрывки до 5 стихов.
// const NORMALIZED_SEED_ENTRIES: readonly SeedEntry[] = [
//   { reference: "2 Коринфянам 1:2-3", tags: ["grace", "peace", "encouragement"] },
//   { reference: "2 Коринфянам 1:5-7", tags: ["encouragement", "suffering", "hope"] },
//   { reference: "2 Коринфянам 2:3-4", tags: ["love", "church", "discipline"] },
//   { reference: "2 Коринфянам 2:14-16", tags: ["witness", "mission", "worship"] },
//   { reference: "2 Коринфянам 3:4-6", tags: ["faith", "covenant", "holy-spirit", "service"] },
//   { reference: "2 Коринфянам 3:17-18", tags: ["freedom", "holy-spirit", "renewal"] },
//   { reference: "2 Коринфянам 4:1-4", tags: ["gospel", "truth", "warning"] },
//   { reference: "2 Коринфянам 4:6-7", tags: ["light", "power", "humility"] },
//   { reference: "2 Коринфянам 4:16-18", tags: ["hope", "suffering", "perseverance"] },
//   { reference: "2 Коринфянам 5:1-5", tags: ["hope", "holy-spirit", "resurrection"] },
//   { reference: "2 Коринфянам 5:6-8", tags: ["faith", "hope", "jesus-christ"] },
//   { reference: "2 Коринфянам 5:10", tags: ["judgment", "warning"] },
//   { reference: "2 Коринфянам 5:14-17", tags: ["love", "identity", "renewal", "jesus-christ"] },
//   { reference: "2 Коринфянам 5:18-21", tags: ["reconciliation", "gospel", "righteousness", "jesus-christ"] },
//   { reference: "2 Коринфянам 6:2", tags: ["salvation", "grace"] },
//   { reference: "2 Коринфянам 6:14-18", tags: ["holiness", "warning", "worship", "covenant"] },
//   { reference: "2 Коринфянам 7:1", tags: ["holiness", "sanctification"] },
//   { reference: "2 Коринфянам 7:8-10", tags: ["repentance", "salvation", "truth"] },
//   { reference: "2 Коринфянам 8:1-5", tags: ["grace", "generosity", "service", "faith"] },
//   { reference: "2 Коринфянам 8:9-10", tags: ["grace", "jesus-christ", "generosity"] },
//   { reference: "2 Коринфянам 9:6-8", tags: ["generosity", "grace", "stewardship"] },
//   { reference: "2 Коринфянам 9:10-11", tags: ["generosity", "provision", "stewardship"] },
//   { reference: "2 Коринфянам 10:3-5", tags: ["spiritual-warfare", "truth", "obedience"] },
//   { reference: "2 Коринфянам 10:11-12", tags: ["humility", "warning", "discernment"] },
//   { reference: "2 Коринфянам 11:2-3", tags: ["love", "holiness", "truth"] },
//   { reference: "2 Коринфянам 11:12-14", tags: ["discernment", "warning", "truth"] },
//   { reference: "2 Коринфянам 12:7-10", tags: ["weakness", "grace", "power", "humility"] },
//   { reference: "2 Коринфянам 13:5", tags: ["discernment", "faith", "repentance"] },
//   { reference: "2 Коринфянам 13:13", tags: ["grace", "love", "holy-spirit", "unity"] },
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
//     /^(?<book>(?:[1-3]\s+)?[A-Za-zА-Яа-яЁё\- ]+)\s+(?<chapter>\d+):(?<verseStart>\d+)(?:-(?<verseEnd>\d+))?$/
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
//     createdTags: 0,
//     reusedTags: 0,
//     updatedTags: 0,
//     createdVerses: 0,
//     reusedVerses: 0,
//     createdLinks: 0,
//     reusedLinks: 0,
//   };

//   const tagIdBySlug = new Map<TagSlug, string>();

//   try {
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
//         `seed entries: ${seedEntries.length}`,
//         `tags created: ${stats.createdTags}`,
//         `tags updated: ${stats.updatedTags}`,
//         `tags reused: ${stats.reusedTags}`,
//         `verses created: ${stats.createdVerses}`,
//         `verses reused: ${stats.reusedVerses}`,
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
