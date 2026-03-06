import { z } from "zod";
import {
  canonicalizeExternalVerseId,
  MAX_EXTERNAL_VERSE_RANGE_SIZE,
} from "@/shared/bible/externalVerseId";

const externalVerseIdValidationMessage =
  `externalVerseId must be in format "book-chapter-verse" or "book-chapter-verseStart-verseEnd" with range up to ${MAX_EXTERNAL_VERSE_RANGE_SIZE} verses`;

export const putVerseSchema = z.object({
  telegramId: z.string().trim().min(1, "telegramId is required"),
  externalVerseId: z
    .string()
    .trim()
    .min(1, "externalVerseId is required")
    .transform((value, context) => {
      const canonicalValue = canonicalizeExternalVerseId(value);
      if (!canonicalValue) {
        context.addIssue({
          code: "custom",
          message: externalVerseIdValidationMessage,
        });
        return z.NEVER;
      }

      return canonicalValue;
    }),
});

export type PutVerseInput = z.infer<typeof putVerseSchema>;
