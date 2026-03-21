export {
  normalizeBookName,
  softenBookName,
  normalizeIncipitText,
  extractWordTokens,
  parseReferenceParts,
  normalizeReferenceForComparison,
  matchesReferenceWithTolerance,
  matchesIncipitWithTolerance,
  parseReferenceChapterAndVerseStart,
} from "./AnchorValidationService";

export type {
  ReferenceParseResult,
  IncipitEvaluation,
} from "./AnchorValidationService";
