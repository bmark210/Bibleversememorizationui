import {
  expandParsedExternalVerseNumbers,
  parseExternalVerseId,
} from "@/shared/bible/externalVerseId";
import {
  DEFAULT_HELLOAO_TRANSLATION,
  getHelloaoChapterVerseMap,
  normalizeHelloaoTranslation,
} from "@/shared/bible/helloao";
import { ExternalApiError, ValidationError } from "@/shared/errors/AppError";
import {
  getDifficultyLevelByLetters,
  normalizeVerseDifficultyLetters,
  type VerseDifficultyLevel,
} from "@/shared/verses/difficulty";

function buildExternalVerseText(params: {
  externalVerseId: string;
  translation: string;
  chapterMap: Map<number, string>;
}): string {
  const parsed = parseExternalVerseId(params.externalVerseId);
  if (!parsed) {
    throw new ValidationError("Invalid externalVerseId");
  }

  return expandParsedExternalVerseNumbers(parsed)
    .map((verseNumber) => params.chapterMap.get(verseNumber))
    .filter(
      (chunk): chunk is string =>
        typeof chunk === "string" && chunk.trim().length > 0
    )
    .join(" ")
    .trim();
}

export async function resolveVerseDifficultyByExternalVerseId(params: {
  externalVerseId: string;
  translation?: string;
}): Promise<{
  text: string;
  difficultyLetters: number;
  difficultyLevel: VerseDifficultyLevel;
}> {
  const parsed = parseExternalVerseId(params.externalVerseId);
  if (!parsed) {
    throw new ValidationError("Invalid externalVerseId");
  }

  const translation = normalizeHelloaoTranslation(
    params.translation ?? DEFAULT_HELLOAO_TRANSLATION
  );
  const chapterMap = await getHelloaoChapterVerseMap({
    translation,
    book: parsed.book,
    chapter: parsed.chapter,
  });

  const text = buildExternalVerseText({
    externalVerseId: params.externalVerseId,
    translation,
    chapterMap,
  });

  if (!text) {
    throw new ExternalApiError(
      `Unable to resolve verse text for ${params.externalVerseId}`
    );
  }

  const difficultyLetters = normalizeVerseDifficultyLetters(text);

  return {
    text,
    difficultyLetters,
    difficultyLevel: getDifficultyLevelByLetters(difficultyLetters),
  };
}
