"use client";

import type { Verse } from "@/app/domain/verse";
import { VerseAction, VerseFlowCode } from "@/shared/domain/verseFlow";
import { VerseStatus } from "@/shared/domain/verseStatus";
import { resolveVerseState } from "@/shared/verseRules";

export type TextVerseActionKind = "pause" | "resume" | null;

export type TextVersePresentation = {
  label: string;
  toneClassName: string;
  actionKind: TextVerseActionKind;
};

const TONE_QUEUE =
  "border-[color:var(--status-queue-soft)] bg-[color:var(--status-queue-tint)] text-[color:var(--status-queue)]";
const TONE_LEARNING =
  "border-[color:var(--status-learning-soft)] bg-[color:var(--status-learning-tint)] text-[color:var(--status-learning)]";
const TONE_REVIEW =
  "border-[color:var(--status-review-soft)] bg-[color:var(--status-review-tint)] text-[color:var(--status-review)]";
const TONE_WAITING =
  "border-[color:var(--state-warning)]/25 bg-[color:var(--state-warning)]/10 text-[color:var(--state-warning)]";
const TONE_MASTERED =
  "border-[color:var(--status-mastered-soft)] bg-[color:var(--status-mastered-tint)] text-[color:var(--status-mastered)]";
const TONE_PAUSED =
  "border-[color:var(--status-paused-soft)] bg-[color:var(--status-paused-tint)] text-[color:var(--status-paused)]";
const TONE_FALLBACK = "border-border-subtle bg-bg-surface/80 text-text-secondary";

function resolveActionKind(verse: Verse): TextVerseActionKind {
  const resolved = resolveVerseState(verse);
  const allowedActions = new Set(verse.flow?.allowedActions ?? []);

  if (allowedActions.has(VerseAction.RESUME) || resolved.isPaused) {
    return "resume";
  }

  if (allowedActions.has(VerseAction.PAUSE)) {
    return "pause";
  }

  if (resolved.isMastered) {
    return null;
  }

  if (resolved.isQueued || resolved.isLearning || resolved.isReview) {
    return "pause";
  }

  return null;
}

export function resolveTextVersePresentation(verse: Verse): TextVersePresentation {
  const resolved = resolveVerseState(verse);
  const flowCode = verse.flow?.code ?? null;

  if (flowCode === VerseFlowCode.LEARNING || (!flowCode && resolved.isLearning)) {
    return { label: "Изучение", toneClassName: TONE_LEARNING, actionKind: resolveActionKind(verse) };
  }

  if (
    flowCode === VerseFlowCode.REVIEW_DUE ||
    (!flowCode && resolved.isReview && !resolved.isWaitingReview)
  ) {
    return { label: "Повтор", toneClassName: TONE_REVIEW, actionKind: resolveActionKind(verse) };
  }

  if (
    flowCode === VerseFlowCode.REVIEW_WAITING ||
    (!flowCode && resolved.isReview && resolved.isWaitingReview)
  ) {
    return { label: "Ожидание", toneClassName: TONE_WAITING, actionKind: resolveActionKind(verse) };
  }

  if (flowCode === VerseFlowCode.MASTERED || (!flowCode && resolved.isMastered)) {
    return { label: "Готов", toneClassName: TONE_MASTERED, actionKind: null };
  }

  if (
    flowCode === VerseFlowCode.PAUSED_LEARNING ||
    flowCode === VerseFlowCode.PAUSED_REVIEW ||
    flowCode === VerseFlowCode.PAUSED_MASTERED ||
    (!flowCode && (resolved.isPaused || verse.status === VerseStatus.STOPPED))
  ) {
    return { label: "Пауза", toneClassName: TONE_PAUSED, actionKind: "resume" };
  }

  if (
    flowCode === VerseFlowCode.MY ||
    flowCode === VerseFlowCode.QUEUE ||
    (!flowCode && (resolved.isQueued || verse.status === VerseStatus.QUEUE))
  ) {
    return { label: "Очередь", toneClassName: TONE_QUEUE, actionKind: "pause" };
  }

  if (resolved.isPaused || verse.status === VerseStatus.STOPPED) {
    return { label: "Пауза", toneClassName: TONE_PAUSED, actionKind: "resume" };
  }

  if (resolved.isMastered) {
    return { label: "Готов", toneClassName: TONE_MASTERED, actionKind: null };
  }

  if (resolved.isReview) {
    return {
      label: resolved.isWaitingReview ? "Ожидание" : "Повтор",
      toneClassName: resolved.isWaitingReview ? TONE_WAITING : TONE_REVIEW,
      actionKind: resolveActionKind(verse),
    };
  }

  if (resolved.isLearning) {
    return { label: "Изучение", toneClassName: TONE_LEARNING, actionKind: resolveActionKind(verse) };
  }

  if (resolved.isQueued) {
    return { label: "Очередь", toneClassName: TONE_QUEUE, actionKind: "pause" };
  }

  return { label: "Очередь", toneClassName: TONE_FALLBACK, actionKind: resolveActionKind(verse) };
}

export function getTextVerseStatusMutation(verse: Verse): {
  label: string;
  nextStatus: "QUEUE" | "STOPPED";
} | null {
  const { actionKind } = resolveTextVersePresentation(verse);

  if (actionKind === "pause") {
    return { label: "Пауза", nextStatus: "STOPPED" };
  }

  if (actionKind === "resume") {
    return { label: "Возобновить", nextStatus: "QUEUE" };
  }

  return null;
}
