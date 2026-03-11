import {
  REFERENCE_TRAINER_OUTCOME_DELTAS,
  SKILL_SCORE_MAX,
  SKILL_SCORE_MIN,
  getAdaptiveScoreMultiplier,
} from "@/shared/constants/training";
import { clamp } from "@/shared/utils/clamp";
import type {
  ReferenceTrainerScoreRow,
  ReferenceTrainerSessionUpdate,
} from "@/modules/reference-trainer/domain/ReferenceTrainerTypes";

function clampSkillScore(value: number): number {
  return clamp(Math.round(value), SKILL_SCORE_MIN, SKILL_SCORE_MAX);
}

function computeAdaptiveDelta(currentScore: number, baseDelta: number): number {
  const isPositive = baseDelta > 0;
  const multiplier = getAdaptiveScoreMultiplier(currentScore, isPositive);
  return baseDelta * multiplier;
}

export function applySessionResults(params: {
  updates: ReferenceTrainerSessionUpdate[];
  rowsByExternalVerseId: Map<string, ReferenceTrainerScoreRow>;
}): ReferenceTrainerScoreRow[] {
  const touchedExternalIds: string[] = [];
  const touchedExternalIdSet = new Set<string>();

  for (const update of params.updates) {
    const row = params.rowsByExternalVerseId.get(update.externalVerseId);
    if (!row) continue;

    const baseDelta = REFERENCE_TRAINER_OUTCOME_DELTAS[update.outcome];
    if (update.track === "reference") {
      const delta = computeAdaptiveDelta(row.referenceScore, baseDelta);
      row.referenceScore = clampSkillScore(row.referenceScore + delta);
    } else if (update.track === "incipit") {
      const delta = computeAdaptiveDelta(row.incipitScore, baseDelta);
      row.incipitScore = clampSkillScore(row.incipitScore + delta);
    } else {
      const delta = computeAdaptiveDelta(row.contextScore, baseDelta);
      row.contextScore = clampSkillScore(row.contextScore + delta);
    }

    if (!touchedExternalIdSet.has(update.externalVerseId)) {
      touchedExternalIdSet.add(update.externalVerseId);
      touchedExternalIds.push(update.externalVerseId);
    }
  }

  return touchedExternalIds
    .map((externalVerseId) => params.rowsByExternalVerseId.get(externalVerseId))
    .filter((row): row is ReferenceTrainerScoreRow => row !== undefined);
}
