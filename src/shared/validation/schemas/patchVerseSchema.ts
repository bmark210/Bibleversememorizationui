import { z } from "zod";
import { VerseStatus } from "@/generated/prisma";
import {
  MASTERY_MAX,
  REVIEW_REPETITIONS_MAX,
  TRAINING_MODE_ID_MAX,
  TRAINING_MODE_ID_MIN,
} from "@/shared/constants/training";

const isoDateTimeSchema = z.iso.datetime({ offset: true });

export const patchVerseSchema = z
  .object({
    masteryLevel: z
      .number()
      .finite()
      .int()
      .min(0)
      .max(MASTERY_MAX)
      .optional(),
    repetitions: z
      .number()
      .finite()
      .int()
      .min(0)
      .max(REVIEW_REPETITIONS_MAX)
      .optional(),
    lastReviewedAt: z.union([isoDateTimeSchema, z.null()]).optional(),
    nextReviewAt: z.union([isoDateTimeSchema, z.null()]).optional(),
    lastTrainingModeId: z
      .union([
        z
          .number()
          .finite()
          .int()
          .min(TRAINING_MODE_ID_MIN)
          .max(TRAINING_MODE_ID_MAX),
        z.null(),
      ])
      .optional(),
    status: z
      .enum([VerseStatus.MY, VerseStatus.LEARNING, VerseStatus.STOPPED])
      .optional(),
  })
  .strict();

export type PatchVerseInput = z.infer<typeof patchVerseSchema>;
