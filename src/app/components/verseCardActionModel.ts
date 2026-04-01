import {
  Anchor,
  Brain,
  Clock3,
  Dumbbell,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { DisplayVerseStatus } from "@/app/types/verseStatus";
import { VerseStatus } from "@/shared/domain/verseStatus";
import { normalizeVerseFlow, type VerseFlow } from "@/shared/domain/verseFlow";
import { formatVerseAvailabilityLabel } from "@/app/components/formatVerseAvailabilityLabel";
import type { VerseStatusSummaryTone } from "@/app/components/VerseStatusSummary";
import { VERSE_CARD_COLOR_CONFIG } from "@/app/components/verseCardColorConfig";
import {
  getVerseDisplayStatus,
  getVerseNextAvailabilityAt,
  hasVerseAction,
  isVerseWaitingReview,
} from "@/shared/verseRules";

export type VerseCardActionId =
  | "add-to-my"
  | "start-learning"
  | "train"
  | "resume"
  | "anchor"
  | "pause";

export type VerseCardActionSpec = {
  id: VerseCardActionId;
  label: string;
  ariaLabel: string;
  title: string;
  icon: LucideIcon;
  dataTour?: string;
};

export type VerseCardActionModel = {
  primaryAction: VerseCardActionSpec | null;
  utilityAction: VerseCardActionSpec | null;
  waitingLabel: string | null;
  statusTone: VerseStatusSummaryTone | null;
  showProgress: boolean;
  isNotYetDue: boolean;
};

type ResolveVerseCardActionModelParams = {
  status: DisplayVerseStatus;
  flow?: VerseFlow | null;
  nextReviewAt?: Date | null;
  isAnchorEligible?: boolean;
  now?: Date;
  timeZone?: string;
};

function isValidDate(value: Date | null | undefined): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

export function resolveVerseCardActionModel(
  params: ResolveVerseCardActionModelParams,
): VerseCardActionModel {
  const {
    status,
    flow: rawFlow = null,
    nextReviewAt = null,
    isAnchorEligible = false,
    now = new Date(),
    timeZone,
  } = params;

  const flow = normalizeVerseFlow(rawFlow);
  const resolvedStatus = getVerseDisplayStatus({
    status,
    flow,
    masteryLevel: 0,
    repetitions: 0,
    nextReviewAt:
      isValidDate(nextReviewAt) ? nextReviewAt.toISOString() : flow?.availableAt ?? null,
    nextReview:
      isValidDate(nextReviewAt) ? nextReviewAt.toISOString() : flow?.availableAt ?? null,
  });
  const resolvedNextReviewAt =
    isValidDate(nextReviewAt)
      ? nextReviewAt
      : getVerseNextAvailabilityAt({
          status: resolvedStatus,
          flow,
          masteryLevel: 0,
          repetitions: 0,
          nextReviewAt: flow?.availableAt ?? null,
          nextReview: flow?.availableAt ?? null,
        });
  const isNotYetDue = isVerseWaitingReview(
    {
      status: resolvedStatus,
      flow,
      masteryLevel: 0,
      repetitions: 0,
      nextReviewAt: isValidDate(resolvedNextReviewAt)
        ? resolvedNextReviewAt.toISOString()
        : null,
      nextReview: isValidDate(resolvedNextReviewAt)
        ? resolvedNextReviewAt.toISOString()
        : null,
    },
    now,
  );
  const waitingLabel = isNotYetDue
    ? formatVerseAvailabilityLabel(resolvedNextReviewAt, { now, timeZone })
    : null;

  return {
    primaryAction: getPrimaryAction({
      status: resolvedStatus,
      flow,
      isNotYetDue,
      isAnchorEligible,
    }),
    utilityAction: getUtilityAction({ status: resolvedStatus, flow }),
    waitingLabel,
    statusTone: getStatusTone({ status: resolvedStatus, isNotYetDue }),
    showProgress:
      resolvedStatus !== "CATALOG" &&
      resolvedStatus !== VerseStatus.MY &&
      resolvedStatus !== VerseStatus.QUEUE,
    isNotYetDue,
  };
}

function getPrimaryAction(params: {
  status: DisplayVerseStatus;
  flow: VerseFlow | null;
  isNotYetDue: boolean;
  isAnchorEligible: boolean;
}): VerseCardActionSpec | null {
  const { status, flow, isNotYetDue, isAnchorEligible } = params;

  if (flow) {
    if (hasVerseAction({ flow }, "add_to_my")) {
      return {
        id: "add-to-my",
        label: "Добавить в мои",
        ariaLabel: "Добавить стих в мои стихи",
        title: "Добавить стих в мои стихи",
        icon: Plus,
        dataTour: "verse-card-add-button",
      };
    }

    if (hasVerseAction({ flow }, "start_learning")) {
      return {
        id: "start-learning",
        label: "Начать изучение",
        ariaLabel: "Начать изучение стиха",
        title: "Начать изучение",
        icon: Play,
        dataTour: "verse-card-promote-button",
      };
    }

    if (hasVerseAction({ flow }, "resume")) {
      return {
        id: "resume",
        label: "Возобновить",
        ariaLabel: "Возобновить изучение стиха",
        title: "Возобновить изучение",
        icon: Play,
      };
    }

    if (hasVerseAction({ flow }, "anchor")) {
      if (!isAnchorEligible) return null;
      return {
        id: "anchor",
        label: "Закрепить",
        ariaLabel: "Перейти к закреплению стиха",
        title: "Перейти к закреплению",
        icon: Anchor,
      };
    }

    if (hasVerseAction({ flow }, "train") && !isNotYetDue) {
      return {
        id: "train",
        label: "Тренироваться",
        ariaLabel:
          status === "REVIEW"
            ? "Перейти к повторению стиха"
            : "Продолжить тренировку стиха",
        title:
          status === "REVIEW"
            ? "Перейти к повторению"
            : "Продолжить тренировку",
        icon: Dumbbell,
      };
    }
  }

  if (status === "CATALOG") {
    return {
      id: "add-to-my",
      label: "Добавить в мои",
      ariaLabel: "Добавить стих в мои стихи",
      title: "Добавить стих в мои стихи",
      icon: Plus,
      dataTour: "verse-card-add-button",
    };
  }

  if (status === VerseStatus.QUEUE) {
    // Already queued — no CTA needed; the queue badge communicates the state
    return null;
  }

  if (status === VerseStatus.MY) {
    return {
      id: "start-learning",
      label: "Начать изучение",
      ariaLabel: "Начать изучение стиха",
      title: "Начать изучение",
      icon: Play,
      dataTour: "verse-card-promote-button",
    };
  }

  if (status === VerseStatus.STOPPED) {
    return {
      id: "resume",
      label: "Возобновить",
      ariaLabel: "Возобновить изучение стиха",
      title: "Возобновить изучение",
      icon: Play,
    };
  }

  if (status === "MASTERED") {
    if (!isAnchorEligible) return null;

    return {
      id: "anchor",
      label: "Закрепить",
      ariaLabel: "Перейти к закреплению стиха",
      title: "Перейти к закреплению",
      icon: Anchor,
    };
  }

  if (status === VerseStatus.LEARNING) {
    return {
      id: "train",
      label: "Тренироваться",
      ariaLabel: "Продолжить тренировку стиха",
      title: "Продолжить тренировку",
      icon: Dumbbell,
    };
  }

  if (status === "REVIEW" && !isNotYetDue) {
    return {
      id: "train",
      label: "Тренироваться",
      ariaLabel: "Перейти к повторению стиха",
      title: "Перейти к повторению",
      icon: Dumbbell,
    };
  }

  return null;
}

function getUtilityAction(params: {
  status: DisplayVerseStatus;
  flow: VerseFlow | null;
}): VerseCardActionSpec | null {
  const { status, flow } = params;
  if (flow && !hasVerseAction({ flow }, "pause")) {
    return null;
  }

  if (
    status === VerseStatus.LEARNING ||
    status === "REVIEW" ||
    status === "MASTERED"
  ) {
    return {
      id: "pause",
      label: "Пауза",
      ariaLabel: "Поставить стих на паузу",
      title: "Поставить стих на паузу",
      icon: Pause,
    };
  }

  return null;
}

function getStatusTone(params: {
  status: DisplayVerseStatus;
  isNotYetDue: boolean;
}): VerseStatusSummaryTone | null {
  const { status, isNotYetDue } = params;

  if (status === "CATALOG" || status === VerseStatus.MY) {
    return null;
  }

  if (status === VerseStatus.STOPPED) {
    const stoppedTone = VERSE_CARD_COLOR_CONFIG.statusPills.stopped;
    return {
      icon: Pause,
      title: "На паузе",
      ...stoppedTone,
    };
  }

  if (status === "MASTERED") {
    const masteredTone = VERSE_CARD_COLOR_CONFIG.statusPills.mastered;
    return {
      icon: Trophy,
      title: "Выучен",
      ...masteredTone,
    };
  }

  if (status === VerseStatus.LEARNING) {
    const learningTone = VERSE_CARD_COLOR_CONFIG.statusPills.learning;
    return {
      icon: Brain,
      title: "В изучении",
      ...learningTone,
    };
  }

  if (status === "REVIEW") {
    if (isNotYetDue) {
      return {
        icon: Clock3,
        title: "В ожидании",
        ...VERSE_CARD_COLOR_CONFIG.statusPills.reviewWaiting,
      };
    }

    return {
      icon: RefreshCw,
      title: "Повторение",
      ...VERSE_CARD_COLOR_CONFIG.statusPills.review,
    };
  }

  return null;
}
