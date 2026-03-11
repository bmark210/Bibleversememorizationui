// import nextEnv from "@next/env";

// nextEnv.loadEnvConfig(process.cwd());

// const DATASET_NAME = "mark-popular";
// const EXPECTED_SEED_ENTRY_COUNT = 35;

// const TAG_TITLES = {
//   contentment: "Довольство",
//   covenant: "Завет",
//   discernment: "Различение",
//   discipleship: "Ученичество",
//   faith: "Вера",
//   forgiveness: "Прощение",
//   gospel: "Евангелие",
//   holiness: "Святость",
//   "holy-spirit": "Святой Дух",
//   hope: "Надежда",
//   humility: "Смирение",
//   identity: "Идентичность",
//   "jesus-christ": "Иисус Христос",
//   joy: "Радость",
//   kingdom: "Царство Божье",
//   law: "Закон",
//   love: "Любовь",
//   mercy: "Милость",
//   mission: "Миссия",
//   obedience: "Послушание",
//   peace: "Мир",
//   perseverance: "Стойкость",
//   prayer: "Молитва",
//   provision: "Божье обеспечение",
//   repentance: "Покаяние",
//   resurrection: "Воскресение",
//   salvation: "Спасение",
//   service: "Служение",
//   stewardship: "Верность",
//   suffering: "Страдания",
//   temptation: "Искушение",
//   truth: "Истина",
//   warning: "Предостережение",
//   wisdom: "Мудрость",
//   witness: "Свидетельство",
//   worship: "Поклонение",
// } as const;

// type TagSlug = keyof typeof TAG_TITLES;

// type SeedEntry = {
//   reference: string;
//   tags: readonly TagSlug[];
// };

// const BOOK_NAME_TO_ID: Record<string, number> = {
//   mark: 41,
//   mrk: 41,
//   "марка": 41,
//   "от марка": 41,
//   "евангелие от марка": 41,
// };

// // Набор нормализован по Top Verses: соседние популярные стихи объединены в отрывки до 5 стихов.
// const NORMALIZED_SEED_ENTRIES: readonly SeedEntry[] = [
//   { reference: "Марка 1:1", tags: ["gospel", "jesus-christ"] },
//   { reference: "Марка 1:8-11", tags: ["holy-spirit", "jesus-christ", "identity"] },
//   { reference: "Марка 1:14-15", tags: ["gospel", "repentance", "kingdom"] },
//   { reference: "Марка 1:21-22", tags: ["truth", "wisdom", "jesus-christ"] },
//   { reference: "Марка 1:35", tags: ["prayer", "discipleship"] },
//   { reference: "Марка 1:40-42", tags: ["faith", "mercy", "jesus-christ"] },
//   { reference: "Марка 2:1-5", tags: ["faith", "forgiveness", "jesus-christ"] },
//   { reference: "Марка 2:27-28", tags: ["truth", "worship", "jesus-christ"] },
//   { reference: "Марка 3:4-5", tags: ["mercy", "discernment", "jesus-christ"] },
//   { reference: "Марка 4:35-39", tags: ["faith", "peace", "jesus-christ"] },
//   { reference: "Марка 6:30-32", tags: ["service", "discipleship", "wisdom"] },
//   { reference: "Марка 7:1-5", tags: ["discernment", "truth", "warning"] },
//   { reference: "Марка 7:21-23", tags: ["holiness", "warning", "truth"] },
//   { reference: "Марка 7:24-27", tags: ["faith", "mercy", "hope"] },
//   { reference: "Марка 8:27-31", tags: ["jesus-christ", "identity", "resurrection"] },
//   { reference: "Марка 8:34-38", tags: ["discipleship", "salvation", "warning"] },
//   { reference: "Марка 9:1-3", tags: ["kingdom", "jesus-christ", "hope"] },
//   { reference: "Марка 9:23-24", tags: ["faith", "hope", "humility"] },
//   { reference: "Марка 9:43-47", tags: ["holiness", "warning", "temptation"] },
//   { reference: "Марка 10:13-16", tags: ["kingdom", "faith", "humility"] },
//   { reference: "Марка 10:17-21", tags: ["discipleship", "love", "stewardship"] },
//   { reference: "Марка 10:45", tags: ["service", "salvation", "jesus-christ"] },
//   { reference: "Марка 10:46-50", tags: ["faith", "hope", "jesus-christ"] },
//   { reference: "Марка 11:1-5", tags: ["mission", "obedience", "provision"] },
//   { reference: "Марка 11:22-25", tags: ["faith", "prayer", "forgiveness"] },
//   { reference: "Марка 12:28-31", tags: ["love", "obedience", "law"] },
//   { reference: "Марка 12:41-44", tags: ["stewardship", "faith", "worship"] },
//   { reference: "Марка 13:32-33", tags: ["warning", "wisdom", "perseverance"] },
//   { reference: "Марка 14:12-16", tags: ["provision", "obedience", "discipleship"] },
//   { reference: "Марка 14:22-24", tags: ["covenant", "worship", "jesus-christ"] },
//   { reference: "Марка 15:34", tags: ["suffering", "jesus-christ"] },
//   { reference: "Марка 16:1-5", tags: ["resurrection", "hope", "witness"] },
//   { reference: "Марка 16:9-11", tags: ["resurrection", "witness", "hope"] },
//   { reference: "Марка 16:15-18", tags: ["mission", "salvation", "faith"] },
//   { reference: "Марка 16:19-20", tags: ["mission", "jesus-christ", "witness"] },
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
