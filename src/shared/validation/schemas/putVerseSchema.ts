import { z } from "zod";
import { canonicalizeExternalVerseId } from "@/shared/bible/externalVerseId";

const externalVerseIdValidationMessage =
  `externalVerseId must be in format "book-chapter-verse" (single verse only, ranges are no longer supported)`;

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
