import {
  Anchor,
  Brain,
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
  const isNotYetDue =
    flow?.code === "REVIEW_WAITING" ||
    (status === "REVIEW" &&
      isValidDate(nextReviewAt) &&
      nextReviewAt.getTime() > now.getTime());
  const waitingLabel = isNotYetDue
    ? formatVerseAvailabilityLabel(nextReviewAt, { now, timeZone })
    : null;

  return {
    primaryAction: getPrimaryAction({ status, isNotYetDue, isAnchorEligible }),
    utilityAction: getUtilityAction(status),
    waitingLabel,
    statusTone: getStatusTone({ status, isNotYetDue }),
    showProgress: status !== "CATALOG" && status !== VerseStatus.MY,
    isNotYetDue,
  };
}

function getPrimaryAction(params: {
  status: DisplayVerseStatus;
  isNotYetDue: boolean;
  isAnchorEligible: boolean;
}): VerseCardActionSpec | null {
  const { status, isNotYetDue, isAnchorEligible } = params;

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

function getUtilityAction(status: DisplayVerseStatus): VerseCardActionSpec | null {
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
  const { status } = params;

  if (status === "CATALOG" || status === VerseStatus.MY) {
    return null;
  }

  if (status === VerseStatus.STOPPED) {
    return {
      icon: Pause,
      title: "На паузе",
      pillClassName: "border-rose-500/20 bg-rose-500/[0.08]",
      iconClassName: "text-rose-700 dark:text-rose-300",
      titleClassName: "text-rose-700/80 dark:text-rose-300/80",
    };
  }

  if (status === "MASTERED") {
    return {
      icon: Trophy,
      title: "Выучен",
      pillClassName: "border-amber-500/25 bg-amber-500/[0.08]",
      iconClassName: "text-amber-800 dark:text-amber-300",
      titleClassName: "text-amber-800/80 dark:text-amber-300/80",
    };
  }

  if (status === VerseStatus.LEARNING) {
    return {
      icon: Brain,
      title: "В изучении",
      pillClassName: "border-emerald-500/20 bg-emerald-500/[0.08]",
      iconClassName: "text-emerald-700 dark:text-emerald-300",
      titleClassName: "text-emerald-700/80 dark:text-emerald-300/80",
    };
  }

  if (status === "REVIEW") {
    return {
      icon: RefreshCw,
      title: "Повторение",
      pillClassName: "border-violet-500/20 bg-violet-500/[0.08]",
      iconClassName: "text-violet-700 dark:text-violet-300",
      titleClassName: "text-violet-700/80 dark:text-violet-300/80",
    };
  }

  return null;
}
