import assert from "node:assert/strict";
import test from "node:test";
import { VerseStatus } from "@/shared/domain/verseStatus";
import { TrainingModeId } from "@/shared/training/modeEngine";
import {
  buildCommittedTrainingResultState,
  buildExerciseResultState,
} from "./trainingResultState";

test("buildExerciseResultState creates success result for local completion", () => {
  const result = buildExerciseResultState({
    result: {
      kind: "success",
      message: "Последовательность собрана верно.",
    },
    reference: "От Иоанна 1:29",
    verseText: "Вот Агнец Божий",
    status: "LEARNING",
    trainingModeId: TrainingModeId.ClickWordsNoHints,
  });

  assert.equal(result.kind, "exercise-success");
  assert.equal(result.footerMode, "rating-with-retry");
  assert.equal(result.statusLabel, "Успех");
  assert.equal(result.ratingStage, "learning");
  assert.equal(result.verseText, null);
});

test("buildExerciseResultState keeps verse text on failure result", () => {
  const result = buildExerciseResultState({
    result: {
      kind: "failure",
      reason: "max-mistakes",
      message: "Допущено 5 ошибок. Попробуйте ещё раз.",
    },
    reference: "От Иоанна 1:29",
    verseText: "Вот Агнец Божий",
    status: "LEARNING",
    trainingModeId: TrainingModeId.ClickWordsNoHints,
  });

  assert.equal(result.kind, "exercise-failure");
  assert.equal(result.footerMode, "retry-only");
  assert.equal(result.statusLabel, "Провал");
  assert.equal(result.verseText, "Вот Агнец Божий");
});

test("buildExerciseResultState creates revealed result with rating footer", () => {
  const result = buildExerciseResultState({
    result: {
      kind: "revealed",
      message: "Правильный текст открыт.",
    },
    reference: "От Иоанна 1:29",
    verseText: "Вот Агнец Божий",
    status: "REVIEW",
    trainingModeId: TrainingModeId.FullRecall,
  });

  assert.equal(result.kind, "exercise-revealed");
  assert.equal(result.footerMode, "rating-with-retry");
  assert.equal(result.ratingStage, "review");
  assert.equal(result.verseText, "Вот Агнец Божий");
});

test("buildCommittedTrainingResultState returns regress transition", () => {
  const result = buildCommittedTrainingResultState({
    verseKey: "verse-1",
    reference: "От Иоанна 1:29",
    previousStatus: VerseStatus.LEARNING,
    nextStatus: VerseStatus.LEARNING,
    previousModeId: TrainingModeId.FirstLettersTyping,
    nextModeId: TrainingModeId.ClickWordsHinted,
    nextReviewAt: null,
    reviewWasSuccessful: false,
    progressPopup: null,
  });

  assert.ok(result);
  assert.equal(result?.kind, "mode-regressed");
  assert.equal(result?.footerMode, "continue-only");
  assert.equal(result?.targetModeLabel != null, true);
});

test("buildCommittedTrainingResultState returns waiting review screen", () => {
  const nextReviewAt = new Date("2026-03-24T09:00:00.000Z");
  const result = buildCommittedTrainingResultState({
    verseKey: "verse-2",
    reference: "От Иоанна 1:29",
    previousStatus: VerseStatus.REVIEW,
    nextStatus: VerseStatus.REVIEW,
    previousModeId: TrainingModeId.FullRecall,
    nextModeId: TrainingModeId.FullRecall,
    nextReviewAt,
    reviewWasSuccessful: true,
    progressPopup: {
      id: "popup-1",
      reference: "От Иоанна 1:29",
      title: "Прогресс стиха",
      detail: null,
      xpDelta: 4,
      tone: "positive",
      stageStatus: "REVIEW",
      stageLabel: "Повторение",
    },
    nowMs: Date.parse("2026-03-23T09:00:00.000Z"),
  });

  assert.ok(result);
  assert.equal(result?.kind, "review-waiting");
  assert.equal(result?.footerMode, "continue-only");
  assert.equal(result?.nextReviewAt?.toISOString(), nextReviewAt.toISOString());
});

test("buildCommittedTrainingResultState returns mastered screen", () => {
  const result = buildCommittedTrainingResultState({
    verseKey: "verse-3",
    reference: "От Иоанна 1:29",
    previousStatus: VerseStatus.REVIEW,
    nextStatus: VerseStatus.MASTERED,
    previousModeId: TrainingModeId.FullRecall,
    nextModeId: TrainingModeId.FullRecall,
    nextReviewAt: null,
    reviewWasSuccessful: true,
    progressPopup: null,
  });

  assert.ok(result);
  assert.equal(result?.kind, "mastered");
  assert.equal(result?.title, "Стих выучен");
});
