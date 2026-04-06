import type { DisplayVerseStatus } from "@/app/types/verseStatus";
import { DISPLAY_STATUS_LABELS } from "@/shared/constants/ui";
const TRACK_LABELS: Record<SkillTrack, string> = {
  reference: "Ссылка",
  incipit: "Начало",
  ending: "Конец",
  context: "Контекст",
};

type SkillTrack = "reference" | "incipit" | "ending" | "context";

type TrainingProgressPopupContext = "core" | "anchor";

export type TrainingProgressPopupVerseSnapshot = {
  status: DisplayVerseStatus;
};

export type TrainingProgressPopupPayload = {
  id: string;
  reference: string;
  title: string;
  detail: string | null;
  xpDelta: number;
  tone: "positive" | "negative";
  stageStatus: DisplayVerseStatus;
  stageLabel: string;
};

const STAGE_RANK: Partial<Record<DisplayVerseStatus, number>> = {
  CATALOG: -1,
  STOPPED: 0,
  MY: 1,
  LEARNING: 2,
  REVIEW: 3,
  MASTERED: 4,
};

function getStageRank(status: DisplayVerseStatus) {
  return STAGE_RANK[status] ?? 0;
}

function buildPopupTitle(params: {
  beforeStatus: DisplayVerseStatus;
  afterStatus: DisplayVerseStatus;
  xpDelta: number;
  context: TrainingProgressPopupContext;
}) {
  const stageDelta =
    getStageRank(params.afterStatus) - getStageRank(params.beforeStatus);

  if (stageDelta > 0) return "Этап повышен";
  if (stageDelta < 0) return "Этап понижен";
  if (params.context === "anchor") {
    return params.xpDelta > 0 ? "Прогресс закрепления" : "Откат закрепления";
  }
  return params.xpDelta > 0 ? "Прогресс стиха" : "Откат по стиху";
}

function buildPopupDetail(params: {
  context: TrainingProgressPopupContext;
  track?: SkillTrack;
}) {
  if (params.context !== "anchor") return null;
  if (!params.track) return "Закрепление";
  return `Закрепление · ${TRACK_LABELS[params.track]}`;
}

export function buildTrainingProgressPopupPayload(params: {
  reference: string;
  context: TrainingProgressPopupContext;
  before: TrainingProgressPopupVerseSnapshot;
  after: TrainingProgressPopupVerseSnapshot;
  xpDelta: number;
  track?: SkillTrack;
}): TrainingProgressPopupPayload | null {
  const xpDelta = Math.trunc(params.xpDelta);
  const stageChanged = params.before.status !== params.after.status;

  if (xpDelta === 0 && !stageChanged) {
    return null;
  }

  const stageDelta =
    getStageRank(params.after.status) - getStageRank(params.before.status);
  const tone =
    xpDelta === 0
      ? stageDelta >= 0
        ? "positive"
        : "negative"
      : xpDelta > 0
        ? "positive"
        : "negative";

  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    reference: params.reference,
    title: buildPopupTitle({
      beforeStatus: params.before.status,
      afterStatus: params.after.status,
      xpDelta,
      context: params.context,
    }),
    detail: buildPopupDetail({
      context: params.context,
      track: params.track,
    }),
    xpDelta,
    tone,
    stageStatus: params.after.status,
    stageLabel:
      DISPLAY_STATUS_LABELS[params.after.status] ?? String(params.after.status),
  };
}
