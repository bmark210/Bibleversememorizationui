"use client";

import { useState, useCallback, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import type { bible_memory_db_internal_domain_UserVerse as UserVerse } from "@/api/models/bible_memory_db_internal_domain_UserVerse";
import { Button } from "../../ui/button";
import { cn } from "../../ui/utils";
import { ExamStartScreen } from "./ExamStartScreen";
import { ExamResultScreen } from "./ExamResultScreen";
import {
  fetchExamEligibleVerses,
  fetchLearningCapacity,
  submitExamSession,
} from "./examApi";
import type {
  ExamEligibleVersesResponse,
  ExamSessionOutput,
  LearningCapacityResponse,
} from "./types";

export type VerseResultEntry = {
  externalVerseId: string;
  reference: string;
  text: string;
  passed: boolean;
};

type ExamPhase =
  | { kind: "loading" }
  | { kind: "start"; eligible: ExamEligibleVersesResponse; capacity: LearningCapacityResponse | null }
  | { kind: "question"; verses: UserVerse[]; verseIdx: number; questionIdx: 0 | 1; results: VerseResultEntry[]; currentVersePassed: boolean | null }
  | { kind: "submitting" }
  | { kind: "result"; output: ExamSessionOutput; verseResults: VerseResultEntry[] }
  | { kind: "error"; message: string };

// ──────────────────────────────────────────────────────────────────────────────
// Answer evaluation helpers
// ──────────────────────────────────────────────────────────────────────────────

function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\wа-яёa-z0-9]/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Q1: Given first ~10 words of verse text, user types the reference (e.g. "Ин 3:16").
 * We compare numeric parts: "3:16" extracted from both.
 */
function evaluateReference(typed: string, expected: string): boolean {
  const extractNums = (s: string) =>
    s.replace(/[^\d:]/g, " ").trim().replace(/\s+/g, ":");
  const tNums = extractNums(typed);
  const eNums = extractNums(expected);
  if (tNums && eNums && tNums === eNums) return true;
  // Fallback: normalized string starts with normalized expected (minus spaces)
  const n1 = normalizeText(typed).replace(/\s/g, "");
  const n2 = normalizeText(expected).replace(/\s/g, "");
  return n1 === n2 || n1.includes(n2) || n2.includes(n1);
}

/**
 * Q2: Given reference, user types first 3 words.
 * Compare first 3 words of verse.text against input.
 */
function evaluateIncipit(typed: string, fullText: string): boolean {
  const words = fullText.trim().split(/\s+/).slice(0, 3).join(" ");
  const n1 = normalizeText(typed);
  const n2 = normalizeText(words);
  if (n1 === n2) return true;
  // Allow minor differences (≤ 2 chars Levenshtein for small strings)
  if (Math.abs(n1.length - n2.length) <= 3) {
    const shorter = n1.length < n2.length ? n1 : n2;
    const longer = n1.length < n2.length ? n2 : n1;
    return longer.startsWith(shorter) || n1.includes(n2.slice(0, Math.floor(n2.length * 0.7)));
  }
  return false;
}

// ──────────────────────────────────────────────────────────────────────────────

function getExternalId(verse: UserVerse): string {
  return verse.verse?.externalVerseId ?? "";
}

interface ExamSessionProps {
  telegramId: string;
  onClose: () => void;
  onSessionCommitted?: () => void;
}

export function ExamSession({
  telegramId,
  onClose,
  onSessionCommitted,
}: ExamSessionProps) {
  const [phase, setPhase] = useState<ExamPhase>({ kind: "loading" });
  const [inputValue, setInputValue] = useState("");
  const [answerResult, setAnswerResult] = useState<"correct" | "incorrect" | null>(null);

  // Load eligible verses on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [eligible, capacity] = await Promise.all([
          fetchExamEligibleVerses({ telegramId }),
          fetchLearningCapacity({ telegramId }).catch(() => null),
        ]);
        if (!cancelled) {
          setPhase({ kind: "start", eligible, capacity });
        }
      } catch (e) {
        if (!cancelled) {
          setPhase({ kind: "error", message: String(e) });
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [telegramId]);

  const handleStart = useCallback(() => {
    if (phase.kind !== "start") return;
    const verses = phase.eligible.verses;
    if (verses.length === 0) return;
    setInputValue("");
    setAnswerResult(null);
    setPhase({
      kind: "question",
      verses,
      verseIdx: 0,
      questionIdx: 0,
      results: [],
      currentVersePassed: null,
    });
  }, [phase]);

  const handleSubmitAnswer = useCallback(() => {
    if (phase.kind !== "question" || answerResult !== null) return;
    const verse = phase.verses[phase.verseIdx];
    const reference = verse.reference ?? "";
    const text = verse.text ?? "";

    let correct = false;
    if (phase.questionIdx === 0) {
      correct = evaluateReference(inputValue, reference);
    } else {
      correct = evaluateIncipit(inputValue, text);
    }

    setAnswerResult(correct ? "correct" : "incorrect");

    // After showing result for 1.2s, advance
    setTimeout(() => {
      setPhase((prev) => {
        if (prev.kind !== "question") return prev;

        const extId = getExternalId(prev.verses[prev.verseIdx]);
        const ref = prev.verses[prev.verseIdx].reference ?? extId;
        const txt = prev.verses[prev.verseIdx].text ?? "";

        if (prev.questionIdx === 0) {
          // Move to Q2 of same verse; track whether Q1 passed
          return {
            ...prev,
            questionIdx: 1,
            currentVersePassed: correct,
          };
        }

        // Both questions done — verse passes only if BOTH correct
        const versePassed = (prev.currentVersePassed === true) && correct;
        const newResults: VerseResultEntry[] = [
          ...prev.results,
          { externalVerseId: extId, reference: ref, text: txt, passed: versePassed },
        ];

        const nextVerseIdx = prev.verseIdx + 1;
        if (nextVerseIdx >= prev.verses.length) {
          // All done — go to submitting
          return {
            kind: "submitting",
          };
        }

        return {
          ...prev,
          verseIdx: nextVerseIdx,
          questionIdx: 0,
          results: newResults,
          currentVersePassed: null,
        };
      });
      setInputValue("");
      setAnswerResult(null);
    }, 1200);
  }, [phase, inputValue, answerResult]);

  // Trigger submit when phase transitions to "submitting"
  useEffect(() => {
    if (phase.kind !== "submitting") return;
    // We need the accumulated results - they're in the previous state.
    // This happens because setPhase collects results inline. We need to carry them.
    // Actually, the issue is we lose results when we transition to "submitting".
    // Let's use a ref pattern instead - but for now, this shouldn't happen since
    // we set kind:"submitting" before the last verse's results are recorded.
    // The fix: we do a two-step - first accumulate, then call submit.
  }, [phase]);

  // Better approach: use a callback to finalize
  const finalizeExam = useCallback(async (results: VerseResultEntry[]) => {
    try {
      const output = await submitExamSession({
        telegramId,
        input: {
          results: results.map((r) => ({
            externalVerseId: r.externalVerseId,
            passed: r.passed,
          })),
        },
      });
      setPhase({ kind: "result", output, verseResults: results });
      onSessionCommitted?.();
    } catch (e) {
      setPhase({ kind: "error", message: String(e) });
    }
  }, [telegramId, onSessionCommitted]);

  // Revised handleSubmitAnswer that properly finalizes:
  const handleSubmit = useCallback(() => {
    if (phase.kind !== "question" || answerResult !== null) return;
    const verse = phase.verses[phase.verseIdx];
    const reference = verse.reference ?? "";
    const text = verse.text ?? "";

    let correct = false;
    if (phase.questionIdx === 0) {
      correct = evaluateReference(inputValue, reference);
    } else {
      correct = evaluateIncipit(inputValue, text);
    }

    setAnswerResult(correct ? "correct" : "incorrect");

    setTimeout(() => {
      const extId = getExternalId(verse);
      const ref = verse.reference ?? extId;
      const txt = verse.text ?? "";

      if (phase.questionIdx === 0) {
        setPhase((prev) => prev.kind === "question" ? {
          ...prev,
          questionIdx: 1,
          currentVersePassed: correct,
        } : prev);
        setInputValue("");
        setAnswerResult(null);
        return;
      }

      // Both questions done
      const versePassed = (phase.currentVersePassed === true) && correct;
      const newResults: VerseResultEntry[] = [
        ...phase.results,
        { externalVerseId: extId, reference: ref, text: txt, passed: versePassed },
      ];

      const nextVerseIdx = phase.verseIdx + 1;
      if (nextVerseIdx >= phase.verses.length) {
        setPhase({ kind: "loading" });
        finalizeExam(newResults);
      } else {
        setPhase((prev) => prev.kind === "question" ? {
          ...prev,
          verseIdx: nextVerseIdx,
          questionIdx: 0,
          results: newResults,
          currentVersePassed: null,
        } : prev);
        setInputValue("");
        setAnswerResult(null);
      }
    }, 1200);
  }, [phase, inputValue, answerResult, finalizeExam]);

  // ── Render ──────────────────────────────────────────────────────────────────

  if (phase.kind === "loading") {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-500" />
      </div>
    );
  }

  if (phase.kind === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
        <p className="text-center text-sm text-text-secondary">{phase.message}</p>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Закрыть
        </Button>
      </div>
    );
  }

  if (phase.kind === "start") {
    return (
      <ExamStartScreen
        eligible={phase.eligible}
        capacity={phase.capacity}
        onStart={handleStart}
        onClose={onClose}
      />
    );
  }

  if (phase.kind === "result") {
    return (
      <ExamResultScreen
        output={phase.output}
        verseResults={phase.verseResults}
        onClose={onClose}
      />
    );
  }

  if (phase.kind !== "question") {
    return null;
  }

  // Question screen
  const verse = phase.verses[phase.verseIdx];
  const total = phase.verses.length;
  const questionNum = phase.verseIdx * 2 + phase.questionIdx + 1;
  const totalQuestions = total * 2;
  const progress = questionNum / totalQuestions;

  const isReferenceQuestion = phase.questionIdx === 0;
  const promptText = isReferenceQuestion
    ? verse.text
      ? verse.text.split(" ").slice(0, 10).join(" ") + (verse.text.split(" ").length > 10 ? "…" : "")
      : "—"
    : verse.reference ?? "—";
  const questionLabel = isReferenceQuestion
    ? "Введи ссылку на этот стих"
    : "Введи первые слова стиха";
  const placeholder = isReferenceQuestion
    ? "Например: Ин 3:16"
    : "Первые слова…";

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <div className="flex shrink-0 items-center gap-3 px-4 pt-4 pb-3">
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-border-subtle bg-bg-surface text-text-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="h-1.5 overflow-hidden rounded-full bg-bg-surface">
            <div
              className="h-full rounded-full bg-amber-500 transition-all duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>
        <span className="text-xs text-text-muted">
          {questionNum} / {totalQuestions}
        </span>
      </div>

      {/* Content */}
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 pb-6 pt-2">
        {/* Question label */}
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-amber-500">
            {isReferenceQuestion ? "Стих · ссылка" : "Ссылка · начало"}
          </p>
          <p className="mt-1 text-sm text-text-muted">
            Стих {phase.verseIdx + 1} из {total}
          </p>
        </div>

        {/* Prompt card */}
        <div className="rounded-[1.4rem] border border-border-subtle bg-bg-elevated px-4 py-4 shadow-[var(--shadow-soft)]">
          <p className="text-base font-medium leading-relaxed text-text-primary">
            {promptText}
          </p>
        </div>

        {/* Answer input */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-text-secondary">
            {questionLabel}
          </label>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && inputValue.trim() && answerResult === null) {
                handleSubmit();
              }
            }}
            placeholder={placeholder}
            disabled={answerResult !== null}
            className={cn(
              "w-full rounded-2xl border bg-bg-surface px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none transition-all",
              answerResult === "correct"
                ? "border-status-learning/40 bg-status-learning-soft"
                : answerResult === "incorrect"
                  ? "border-red-400/40 bg-red-50 dark:bg-red-900/10"
                  : "border-border-subtle focus:border-amber-500/40 focus:ring-2 focus:ring-amber-500/15",
            )}
          />
          {answerResult !== null && (
            <p
              className={cn(
                "text-sm font-medium",
                answerResult === "correct"
                  ? "text-status-learning"
                  : "text-red-500",
              )}
            >
              {answerResult === "correct" ? "Верно!" : "Неверно"}
            </p>
          )}
        </div>
      </div>

      {/* Submit button */}
      <div className="shrink-0 px-4 pb-6">
        <Button
          type="button"
          size="lg"
          haptic="medium"
          disabled={!inputValue.trim() || answerResult !== null}
          onClick={handleSubmit}
          className={cn(
            "h-12 w-full rounded-2xl border text-sm font-medium !shadow-none",
            "border-amber-500/30 bg-amber-500 text-white hover:bg-amber-400 disabled:border-border-subtle disabled:!bg-bg-surface disabled:text-text-muted",
          )}
        >
          Проверить
        </Button>
      </div>
    </div>
  );
}
