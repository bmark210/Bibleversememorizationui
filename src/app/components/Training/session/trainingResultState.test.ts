import assert from "node:assert/strict";
import test from "node:test";
import { VerseStatus } from "@/shared/domain/verseStatus";
import { TrainingModeId } from "@/shared/training/modeEngine";
import {
  buildExerciseResultState,
  buildTrainingCommitToastPayload,
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

test("buildTrainingCommitToastPayload returns regress toast", () => {
  const result = buildTrainingCommitToastPayload({
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
  assert.equal(result?.title, "Прогресс обновлён");
  assert.equal(result?.meta, null);
  assert.equal(result?.xpLabel, null);
});

test("buildTrainingCommitToastPayload returns waiting review toast with xp and time", () => {
  const nextReviewAt = new Date("2026-03-24T09:00:00.000Z");
  const result = buildTrainingCommitToastPayload({
    verseKey: "verse-2",
    reference: "От Иоанна 1:29",
    previousStatus: "REVIEW",
    nextStatus: "REVIEW",
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
  assert.equal(result?.title, "+4 XP");
  assert.equal(result?.xpLabel, "+4 XP");
  assert.equal(result?.meta, null);
});

test("buildTrainingCommitToastPayload returns mastered toast", () => {
  const result = buildTrainingCommitToastPayload({
    verseKey: "verse-3",
    reference: "От Иоанна 1:29",
    previousStatus: "REVIEW",
    nextStatus: "MASTERED",
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

test("buildTrainingCommitToastPayload falls back to progress toast when no transition", () => {
  const result = buildTrainingCommitToastPayload({
    verseKey: "verse-4",
    reference: "От Иоанна 1:29",
    previousStatus: VerseStatus.LEARNING,
    nextStatus: VerseStatus.LEARNING,
    previousModeId: TrainingModeId.ClickWordsNoHints,
    nextModeId: TrainingModeId.ClickWordsNoHints,
    nextReviewAt: null,
    reviewWasSuccessful: false,
    progressPopup: {
      id: "popup-2",
      reference: "От Иоанна 1:29",
      title: "Прогресс стиха",
      detail: null,
      xpDelta: 2,
      tone: "positive",
      stageStatus: "LEARNING",
      stageLabel: "Изучение",
    },
  });

  assert.ok(result);
  assert.equal(result?.kind, "progress-updated");
  assert.equal(result?.title, "+2 XP");
  assert.equal(result?.meta, null);
  assert.equal(result?.xpLabel, "+2 XP");
});
