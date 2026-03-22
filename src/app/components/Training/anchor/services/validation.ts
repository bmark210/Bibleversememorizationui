export {
  normalizeBookName,
  softenBookName,
  normalizeIncipitText,
  extractWordTokens,
  parseReferenceParts,
  normalizeReferenceForComparison,
  matchesReferenceWithTolerance,
  matchesIncipitWithTolerance,
  calculateTextMatchPercent,
  parseReferenceChapterAndVerseStart,
} from "./AnchorValidationService";

export type {
  ReferenceParseResult,
  IncipitEvaluation,
} from "./AnchorValidationService";
