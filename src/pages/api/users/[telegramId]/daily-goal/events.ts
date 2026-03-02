import type { NextApiRequest, NextApiResponse } from "next";
import type { Prisma } from "@/generated/prisma/client";
import type {
  DailyGoalEventAction,
  DailyGoalEventRequest,
  DailyGoalProgressEvent,
  DailyGoalMutationResponse,
} from "@/app/features/daily-goal/types";
import { prisma } from "@/lib/prisma";
import {
  buildDailyGoalReadiness,
  getDayKeyInTimezone,
  parseDayKey,
  parseNonNegativeInt,
  parseTimezone,
} from "@/server/daily-goal/readiness";
import { applyDailyGoalEventAction, finalizeDailyGoalState } from "@/server/daily-goal/mutations";
import { parseDailyGoalServerStateV2, reconcileDailyGoalServerStateV2 } from "@/server/daily-goal/state";

type ErrorResponse = {
  error: string;
  details?: string;
};

function parseExpectedStateRev(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error("expectedStateRev must be a non-negative integer");
  }
  return parsed;
}

function parseAction(value: unknown): DailyGoalEventAction {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("action is required");
  }
  const action = value as Record<string, unknown>;
  const kind = action.kind;
  if (
    kind !== "progress_event" &&
    kind !== "mark_started" &&
    kind !== "set_preferred_resume_mode" &&
    kind !== "mark_completed"
  ) {
    throw new Error("Unsupported action kind");
  }
  if (kind === "progress_event") {
    if (!action.event || typeof action.event !== "object") {
      throw new Error("action.event is required for progress_event");
    }
    return {
      kind,
      event: action.event as DailyGoalProgressEvent,
    };
  }
  if (kind === "mark_started") {
    return { kind, startedAt: typeof action.startedAt === "string" ? action.startedAt : null };
  }
  if (kind === "set_preferred_resume_mode") {
    const mode = action.mode;
    return {
      kind,
      mode: mode === "learning" || mode === "review" ? mode : null,
    };
  }
  return {
    kind,
    completedAt: typeof action.completedAt === "string" ? action.completedAt : null,
  };
}

function buildMutationResponse(params: {
  dayKey: string;
  timezone: string;
  stateRev: number;
  state: ReturnType<typeof reconcileDailyGoalServerStateV2>["state"];
  readiness: ReturnType<typeof buildDailyGoalReadiness>;
  mutation: DailyGoalMutationResponse["mutation"];
}): DailyGoalMutationResponse {
  return {
    dayKey: params.dayKey,
    timezone: params.timezone,
    stateRev: params.stateRev,
    state: params.state,
    readiness: params.readiness,
    mutation: params.mutation,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DailyGoalMutationResponse | ErrorResponse>
) {
  const { telegramId } = req.query;
  if (!telegramId || Array.isArray(telegramId)) {
    return res.status(400).json({ error: "telegramId is required" });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = (req.body ?? {}) as Partial<DailyGoalEventRequest>;
    const expectedStateRev = parseExpectedStateRev(body.expectedStateRev);
    const requestedLearning = parseNonNegativeInt(body.newVersesCount as unknown as string, "newVersesCount");
    const requestedReview = parseNonNegativeInt(body.reviewVersesCount as unknown as string, "reviewVersesCount");
    const timezone = parseTimezone(body.timezone as unknown as string, "UTC");
    const dayKey = parseDayKey(body.dayKey as unknown as string) ?? getDayKeyInTimezone(timezone);
    const action = parseAction(body.action);

    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: {
        id: true,
        dailyGoalState: true,
        dailyGoalStateRev: true,
        dailyGoalLastCompletedDay: true,
        dailyStreak: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const verses = await prisma.userVerse.findMany({
      where: { telegramId },
      select: {
        status: true,
        masteryLevel: true,
        repetitions: true,
        nextReviewAt: true,
      },
    });

    const readiness = buildDailyGoalReadiness({
      verses,
      requestedLearning,
      requestedReview,
    });

    const reconciled = reconcileDailyGoalServerStateV2({
      currentState: user.dailyGoalState,
      dayKey,
      timezone,
      requestedCounts: {
        new: requestedLearning,
        review: requestedReview,
      },
    });

    if (user.dailyGoalStateRev !== expectedStateRev) {
      return res.status(409).json(
        buildMutationResponse({
          dayKey,
          timezone,
          stateRev: user.dailyGoalStateRev,
          state: reconciled.state,
          readiness,
          mutation: {
            applied: false,
            conflict: true,
            completedNow: false,
            completionCounterIncremented: false,
          },
        })
      );
    }

    const actionResult = applyDailyGoalEventAction({
      state: reconciled.state,
      action,
    });

    const finalized = finalizeDailyGoalState({
      state: actionResult.state,
      readiness,
      userLastCompletedDay: user.dailyGoalLastCompletedDay,
      userDailyStreak: user.dailyStreak,
    });

    const shouldPersist = reconciled.changed || actionResult.applied || finalized.changed;
    if (!shouldPersist) {
      return res.status(200).json(
        buildMutationResponse({
          dayKey,
          timezone,
          stateRev: user.dailyGoalStateRev,
          state: finalized.state,
          readiness,
          mutation: {
            applied: actionResult.applied,
            conflict: false,
            completedNow: finalized.completedNow,
            completionCounterIncremented: finalized.completionCounterIncremented,
          },
        })
      );
    }

    const data: Prisma.UserUpdateManyMutationInput = {
      dailyGoalState: finalized.state as unknown as Prisma.InputJsonValue,
      dailyGoalStateRev: { increment: 1 },
    };

    if (finalized.completionCounterIncremented) {
      data.dailyGoalsCompleted = { increment: 1 };
      data.dailyGoalLastCompletedDay = finalized.nextLastCompletedDay;
      data.dailyStreak = finalized.nextDailyStreak;
    }

    const updatedCount = await prisma.user.updateMany({
      where: { telegramId, dailyGoalStateRev: expectedStateRev },
      data,
    });

    if (updatedCount.count < 1) {
      const latestUser = await prisma.user.findUnique({
        where: { telegramId },
        select: {
          dailyGoalState: true,
          dailyGoalStateRev: true,
        },
      });
      if (!latestUser) {
        return res.status(404).json({ error: "User not found" });
      }
      const latestState =
        parseDailyGoalServerStateV2(latestUser.dailyGoalState) ?? reconciled.state;
      return res.status(409).json(
        buildMutationResponse({
          dayKey,
          timezone,
          stateRev: latestUser.dailyGoalStateRev,
          state: latestState,
          readiness,
          mutation: {
            applied: false,
            conflict: true,
            completedNow: false,
            completionCounterIncremented: false,
          },
        })
      );
    }

    return res.status(200).json(
      buildMutationResponse({
        dayKey,
        timezone,
        stateRev: expectedStateRev + 1,
        state: finalized.state,
        readiness,
        mutation: {
          applied: actionResult.applied,
          conflict: false,
          completedNow: finalized.completedNow,
          completionCounterIncremented: finalized.completionCounterIncremented,
        },
      })
    );
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("must be an integer") ||
        error.message.includes("expectedStateRev") ||
        error.message.includes("action"))
    ) {
      return res.status(400).json({ error: error.message });
    }
    console.error("Error applying daily goal event:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
