// import nextEnv from "@next/env";

// nextEnv.loadEnvConfig(process.cwd());

// const DATASET_NAME = "luke-popular";
// const EXPECTED_SEED_ENTRY_COUNT = 38;

// const TAG_TITLES = {
//   blessing: "Благословение",
//   contentment: "Довольство",
//   covenant: "Завет",
//   discernment: "Различение",
//   discipleship: "Ученичество",
//   faith: "Вера",
//   forgiveness: "Прощение",
//   generosity: "Щедрость",
//   gospel: "Евангелие",
//   "holy-spirit": "Святой Дух",
//   hope: "Надежда",
//   humility: "Смирение",
//   "jesus-christ": "Иисус Христос",
//   justice: "Справедливость",
//   joy: "Радость",
//   judgment: "Суд",
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
//   righteousness: "Праведность",
//   salvation: "Спасение",
//   service: "Служение",
//   stewardship: "Верность",
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
//   luke: 42,
//   luk: 42,
//   "луки": 42,
//   "от луки": 42,
//   "евангелие от луки": 42,
// };

// // Набор нормализован по Top Verses: соседние популярные стихи объединены в отрывки до 5 стихов.
// const NORMALIZED_SEED_ENTRIES: readonly SeedEntry[] = [
//   { reference: "Луки 1:1-4", tags: ["truth", "witness"] },
//   { reference: "Луки 1:26-30", tags: ["hope", "jesus-christ"] },
//   { reference: "Луки 1:31-35", tags: ["jesus-christ", "holy-spirit", "salvation"] },
//   { reference: "Луки 1:46-49", tags: ["joy", "worship", "humility"] },
//   { reference: "Луки 2:1-5", tags: ["hope", "humility"] },
//   { reference: "Луки 2:6-7", tags: ["jesus-christ", "humility", "hope"] },
//   { reference: "Луки 2:8-12", tags: ["joy", "hope", "salvation"] },
//   { reference: "Луки 2:13-14", tags: ["joy", "peace", "worship"] },
//   { reference: "Луки 4:1-4", tags: ["temptation", "obedience", "truth"] },
//   { reference: "Луки 4:16-19", tags: ["mission", "salvation", "hope"] },
//   { reference: "Луки 6:20-23", tags: ["blessing", "kingdom", "hope"] },
//   { reference: "Луки 6:27-31", tags: ["love", "obedience", "mercy"] },
//   { reference: "Луки 6:38", tags: ["mercy", "stewardship", "generosity"] },
//   { reference: "Луки 7:36-38", tags: ["repentance", "worship", "love"] },
//   { reference: "Луки 9:23", tags: ["discipleship", "obedience", "service"] },
//   { reference: "Луки 10:1-3", tags: ["mission", "service", "witness"] },
//   { reference: "Луки 10:25-28", tags: ["love", "obedience", "law"] },
//   { reference: "Луки 10:38-42", tags: ["discipleship", "worship", "wisdom"] },
//   { reference: "Луки 11:1-4", tags: ["prayer", "kingdom", "provision", "forgiveness"] },
//   { reference: "Луки 12:13-15", tags: ["stewardship", "warning", "contentment"] },
//   { reference: "Луки 12:32-34", tags: ["kingdom", "faith", "stewardship", "hope"] },
//   { reference: "Луки 13:1-5", tags: ["repentance", "warning", "judgment"] },
//   { reference: "Луки 14:25-27", tags: ["discipleship", "service", "obedience"] },
//   { reference: "Луки 15:1-5", tags: ["salvation", "mission", "love"] },
//   { reference: "Луки 15:6-7", tags: ["joy", "salvation", "repentance"] },
//   { reference: "Луки 15:20-24", tags: ["forgiveness", "love", "joy", "salvation"] },
//   { reference: "Луки 16:19-23", tags: ["judgment", "warning", "stewardship"] },
//   { reference: "Луки 18:1-5", tags: ["prayer", "perseverance", "faith"] },
//   { reference: "Луки 18:6-8", tags: ["prayer", "faith", "justice"] },
//   { reference: "Луки 18:9-13", tags: ["humility", "prayer", "repentance"] },
//   { reference: "Луки 18:14", tags: ["humility", "righteousness"] },
//   { reference: "Луки 19:9-10", tags: ["salvation", "mission", "repentance"] },
//   { reference: "Луки 22:19-20", tags: ["covenant", "worship", "jesus-christ"] },
//   { reference: "Луки 23:34", tags: ["forgiveness", "love", "jesus-christ"] },
//   { reference: "Луки 23:42-43", tags: ["salvation", "hope", "jesus-christ"] },
//   { reference: "Луки 24:1-5", tags: ["resurrection", "hope", "jesus-christ"] },
//   { reference: "Луки 24:44-47", tags: ["mission", "repentance", "truth"] },
//   { reference: "Луки 24:48-49", tags: ["witness", "mission", "holy-spirit"] },
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
