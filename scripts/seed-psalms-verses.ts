// import nextEnv from "@next/env";

// nextEnv.loadEnvConfig(process.cwd());

// const DATASET_NAME = "psalms-popular";
// const EXPECTED_SEED_ENTRY_COUNT = 48;

// const TAG_TITLES = {
//   blessing: "Благословение",
//   creation: "Творение",
//   discernment: "Различение",
//   faith: "Вера",
//   family: "Семья",
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
//   obedience: "Послушание",
//   peace: "Мир",
//   perseverance: "Стойкость",
//   prayer: "Молитва",
//   provision: "Божье обеспечение",
//   refuge: "Прибежище",
//   repentance: "Покаяние",
//   resurrection: "Воскресение",
//   righteousness: "Праведность",
//   salvation: "Спасение",
//   suffering: "Страдания",
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
//   psalms: 19,
//   psalm: 19,
//   psa: 19,
//   "псалтирь": 19,
//   "псалом": 19,
//   "псалмы": 19,
// };

// // Для Псалтири ссылки уже приведены к нумерации rus_syn/HelloAO, так как она местами
// // отличается от англоязычных списков популярности и может включать надписания в стихах.
// const NORMALIZED_SEED_ENTRIES: readonly SeedEntry[] = [
//   { reference: "Псалтирь 1:1-3", tags: ["blessing", "obedience", "truth"] },
//   { reference: "Псалтирь 1:5-6", tags: ["warning", "righteousness"] },
//   { reference: "Псалтирь 2:1-3", tags: ["warning", "kingdom"] },
//   { reference: "Псалтирь 2:7-8", tags: ["jesus-christ", "kingdom", "hope"] },
//   { reference: "Псалтирь 8:4-5", tags: ["creation", "humility", "worship"] },
//   { reference: "Псалтирь 11:7", tags: ["truth", "holiness"] },
//   { reference: "Псалтирь 13:1", tags: ["warning", "truth"] },
//   { reference: "Псалтирь 15:10-11", tags: ["resurrection", "hope", "joy"] },
//   { reference: "Псалтирь 18:2-4", tags: ["creation", "worship", "witness"] },
//   { reference: "Псалтирь 18:8-10", tags: ["truth", "wisdom", "obedience"] },
//   { reference: "Псалтирь 18:15", tags: ["prayer", "worship", "truth"] },
//   { reference: "Псалтирь 21:2", tags: ["suffering", "jesus-christ"] },
//   { reference: "Псалтирь 22:1-4", tags: ["refuge", "peace", "provision"] },
//   { reference: "Псалтирь 23:1-2", tags: ["creation", "worship"] },
//   { reference: "Псалтирь 26:1-4", tags: ["faith", "worship", "hope"] },
//   { reference: "Псалтирь 26:14", tags: ["hope", "perseverance"] },
//   { reference: "Псалтирь 31:1-2", tags: ["forgiveness", "joy", "salvation"] },
//   { reference: "Псалтирь 33:2-5", tags: ["worship", "joy", "witness"] },
//   { reference: "Псалтирь 33:9", tags: ["faith", "blessing", "joy"] },
//   { reference: "Псалтирь 33:19", tags: ["hope", "mercy"] },
//   { reference: "Псалтирь 36:4-5", tags: ["joy", "faith", "hope"] },
//   { reference: "Псалтирь 41:2-3", tags: ["hope", "worship"] },
//   { reference: "Псалтирь 45:2-3", tags: ["refuge", "hope", "faith"] },
//   { reference: "Псалтирь 45:11", tags: ["worship", "truth"] },
//   { reference: "Псалтирь 50:3-7", tags: ["repentance", "forgiveness", "mercy"] },
//   { reference: "Псалтирь 50:12", tags: ["repentance", "holiness", "prayer"] },
//   { reference: "Псалтирь 89:2-3", tags: ["refuge", "creation", "hope"] },
//   { reference: "Псалтирь 89:12-14", tags: ["wisdom", "repentance", "hope"] },
//   { reference: "Псалтирь 90:1-4", tags: ["refuge", "faith", "hope"] },
//   { reference: "Псалтирь 90:11-12", tags: ["provision", "hope", "faith"] },
//   { reference: "Псалтирь 99:1-3", tags: ["worship", "joy", "creation"] },
//   { reference: "Псалтирь 102:1-5", tags: ["worship", "joy", "forgiveness", "mercy"] },
//   { reference: "Псалтирь 109:1", tags: ["jesus-christ", "kingdom"] },
//   { reference: "Псалтирь 110:10", tags: ["wisdom", "truth"] },
//   { reference: "Псалтирь 117:22-24", tags: ["jesus-christ", "joy", "hope"] },
//   { reference: "Псалтирь 118:1-2", tags: ["blessing", "obedience", "truth"] },
//   { reference: "Псалтирь 118:9-11", tags: ["truth", "holiness", "wisdom"] },
//   { reference: "Псалтирь 118:89", tags: ["truth", "hope"] },
//   { reference: "Псалтирь 118:105", tags: ["truth", "wisdom"] },
//   { reference: "Псалтирь 120:1-2", tags: ["hope", "faith", "provision"] },
//   { reference: "Псалтирь 121:6-8", tags: ["peace", "prayer", "unity"] },
//   { reference: "Псалтирь 126:1-3", tags: ["family", "provision", "hope"] },
//   { reference: "Псалтирь 132:1", tags: ["unity", "joy", "love"] },
//   { reference: "Псалтирь 137:2", tags: ["worship", "truth"] },
//   { reference: "Псалтирь 138:1-3", tags: ["worship", "truth", "hope"] },
//   { reference: "Псалтирь 138:7-10", tags: ["refuge", "hope", "faith"] },
//   { reference: "Псалтирь 138:13-14", tags: ["creation", "identity", "worship"] },
//   { reference: "Псалтирь 138:23-24", tags: ["prayer", "discernment", "truth"] },
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
