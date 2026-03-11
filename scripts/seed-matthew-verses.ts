// import nextEnv from "@next/env";

// nextEnv.loadEnvConfig(process.cwd());

// const DATASET_NAME = "matthew-popular";
// const EXPECTED_SEED_ENTRY_COUNT = 37;

// const TAG_TITLES = {
//   authority: "Власть",
//   baptism: "Крещение",
//   blessing: "Благословение",
//   church: "Церковь",
//   covenant: "Завет",
//   discernment: "Различение",
//   discipleship: "Ученичество",
//   discipline: "Дисциплина",
//   faith: "Вера",
//   forgiveness: "Прощение",
//   gospel: "Евангелие",
//   "holy-spirit": "Святой Дух",
//   holiness: "Святость",
//   hope: "Надежда",
//   humility: "Смирение",
//   identity: "Идентичность",
//   "jesus-christ": "Иисус Христос",
//   judgment: "Суд",
//   kingdom: "Царство Божье",
//   law: "Закон",
//   light: "Свет",
//   love: "Любовь",
//   mercy: "Милость",
//   mission: "Миссия",
//   obedience: "Послушание",
//   peace: "Мир",
//   perseverance: "Стойкость",
//   prayer: "Молитва",
//   provision: "Божье обеспечение",
//   purity: "Чистота",
//   rest: "Покой",
//   resurrection: "Воскресение",
//   righteousness: "Праведность",
//   salvation: "Спасение",
//   service: "Служение",
//   stewardship: "Верность",
//   temptation: "Искушение",
//   truth: "Истина",
//   unity: "Единство",
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
//   matthew: 40,
//   matt: 40,
//   "матфея": 40,
//   "от матфея": 40,
//   "евангелие от матфея": 40,
// };

// // Набор нормализован по Top Verses: соседние популярные стихи объединены в отрывки до 5 стихов.
// const NORMALIZED_SEED_ENTRIES: readonly SeedEntry[] = [
//   { reference: "Матфея 1:21-23", tags: ["salvation", "jesus-christ", "hope"] },
//   { reference: "Матфея 3:11-12", tags: ["baptism", "holy-spirit", "judgment"] },
//   { reference: "Матфея 3:16-17", tags: ["jesus-christ", "holy-spirit", "identity"] },
//   { reference: "Матфея 4:1-4", tags: ["temptation", "obedience", "truth"] },
//   { reference: "Матфея 5:1-5", tags: ["blessing", "humility", "kingdom"] },
//   { reference: "Матфея 5:7-9", tags: ["mercy", "peace", "kingdom"] },
//   { reference: "Матфея 5:13-16", tags: ["light", "witness", "discipleship"] },
//   { reference: "Матфея 5:17-19", tags: ["law", "obedience", "righteousness"] },
//   { reference: "Матфея 5:27-28", tags: ["purity", "holiness", "temptation"] },
//   { reference: "Матфея 5:43-45", tags: ["love", "obedience", "witness"] },
//   { reference: "Матфея 6:5-8", tags: ["prayer", "humility", "worship"] },
//   { reference: "Матфея 6:9-13", tags: ["prayer", "kingdom", "provision", "forgiveness"] },
//   { reference: "Матфея 6:19-21", tags: ["stewardship", "worship", "kingdom"] },
//   { reference: "Матфея 6:24", tags: ["worship", "stewardship"] },
//   { reference: "Матфея 6:25-27", tags: ["faith", "peace", "provision"] },
//   { reference: "Матфея 6:31-34", tags: ["kingdom", "faith", "provision", "peace"] },
//   { reference: "Матфея 7:1-5", tags: ["discernment", "humility", "love"] },
//   { reference: "Матфея 7:7-11", tags: ["prayer", "faith", "provision"] },
//   { reference: "Матфея 7:12", tags: ["love", "obedience"] },
//   { reference: "Матфея 7:13-14", tags: ["salvation", "warning"] },
//   { reference: "Матфея 7:15-16", tags: ["discernment", "warning"] },
//   { reference: "Матфея 7:21-23", tags: ["obedience", "judgment", "warning"] },
//   { reference: "Матфея 7:24-27", tags: ["obedience", "wisdom", "perseverance"] },
//   { reference: "Матфея 11:28-30", tags: ["rest", "discipleship", "humility"] },
//   { reference: "Матфея 16:15-18", tags: ["jesus-christ", "church", "identity"] },
//   { reference: "Матфея 16:24-26", tags: ["discipleship", "salvation", "service"] },
//   { reference: "Матфея 18:15-17", tags: ["church", "discipline", "love"] },
//   { reference: "Матфея 18:18-20", tags: ["church", "prayer", "unity"] },
//   { reference: "Матфея 18:21-22", tags: ["forgiveness", "love"] },
//   { reference: "Матфея 22:37-40", tags: ["love", "obedience", "law"] },
//   { reference: "Матфея 24:14", tags: ["gospel", "mission", "kingdom"] },
//   { reference: "Матфея 25:31-34", tags: ["judgment", "kingdom", "jesus-christ"] },
//   { reference: "Матфея 25:40", tags: ["love", "service", "jesus-christ"] },
//   { reference: "Матфея 25:41", tags: ["judgment", "warning"] },
//   { reference: "Матфея 26:26-28", tags: ["covenant", "jesus-christ", "worship"] },
//   { reference: "Матфея 28:5-6", tags: ["resurrection", "hope", "jesus-christ"] },
//   { reference: "Матфея 28:16-20", tags: ["mission", "authority", "baptism", "holy-spirit"] },
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
