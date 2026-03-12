import { z } from "zod";
import { canonicalizeExternalVerseId } from "@/shared/bible/externalVerseId";

const sessionTrackSchema = z.enum([
  "reference",
  "incipit",
  "ending",
  "context",
  "mixed",
]);
const skillTrackSchema = z.enum(["reference", "incipit", "ending", "context"]);
const sessionOutcomeSchema = z.enum(["correct_first", "correct_retry", "wrong"]);

const externalVerseIdSchema = z
  .string()
  .trim()
  .min(1, "externalVerseId is required")
  .transform((value, context) => {
    const canonicalValue = canonicalizeExternalVerseId(value);
    if (!canonicalValue) {
      context.addIssue({
        code: "custom",
        message: "externalVerseId has invalid format",
      });
      return z.NEVER;
    }

    return canonicalValue;
  });

export const referenceSessionSchema = z
  .object({
    sessionTrack: sessionTrackSchema,
    updates: z.array(
      z
        .object({
          externalVerseId: externalVerseIdSchema,
          track: skillTrackSchema,
          outcome: sessionOutcomeSchema,
        })
        .strict()
    ),
  })
  .strict();

export type ReferenceSessionInput = z.infer<typeof referenceSessionSchema>;
