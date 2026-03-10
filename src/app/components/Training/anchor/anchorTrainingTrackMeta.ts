import type { AnchorTrainingTrack } from "../types";
import type { SessionTrack, SkillTrack } from "./anchorTrainingTypes";

export type TrackAccent = {
  badgeClassName: string;
  panelClassName: string;
  softPanelClassName: string;
  statClassName: string;
  dotClassName: string;
  lineClassName: string;
};

export const TRACK_OPTIONS: AnchorTrainingTrack[] = [
  "incipit",
  "context",
  "reference",
  "mixed",
];

export const TRACK_LABELS: Record<SkillTrack, string> = {
  reference: "Ссылка",
  incipit: "Начала",
  context: "Контекст",
};

export const SESSION_TRACK_LABELS: Record<SessionTrack, string> = {
  reference: "Ссылка",
  incipit: "Начала",
  context: "Контекст",
  mixed: "Смешанный",
};

export const TRACK_ACCENTS: Record<SessionTrack | SkillTrack, TrackAccent> = {
  reference: {
    badgeClassName:
      "border-sky-500/20 bg-sky-500/[0.08] text-sky-700 dark:text-sky-300",
    panelClassName:
      "border-sky-500/18 bg-gradient-to-br from-sky-500/[0.10] via-background to-background",
    softPanelClassName:
      "border-sky-500/14 bg-sky-500/[0.07] text-sky-800 dark:text-sky-300",
    statClassName:
      "border-sky-500/18 bg-sky-500/[0.08] text-sky-800 dark:text-sky-300",
    dotClassName: "bg-sky-500",
    lineClassName: "from-transparent via-sky-500/45 to-transparent",
  },
  incipit: {
    badgeClassName:
      "border-rose-500/20 bg-rose-500/[0.08] text-rose-700 dark:text-rose-300",
    panelClassName:
      "border-rose-500/18 bg-gradient-to-br from-rose-500/[0.10] via-background to-background",
    softPanelClassName:
      "border-rose-500/14 bg-rose-500/[0.07] text-rose-800 dark:text-rose-300",
    statClassName:
      "border-rose-500/18 bg-rose-500/[0.08] text-rose-800 dark:text-rose-300",
    dotClassName: "bg-rose-500",
    lineClassName: "from-transparent via-rose-500/45 to-transparent",
  },
  context: {
    badgeClassName:
      "border-teal-500/20 bg-teal-500/[0.08] text-teal-700 dark:text-teal-300",
    panelClassName:
      "border-teal-500/18 bg-gradient-to-br from-teal-500/[0.10] via-background to-background",
    softPanelClassName:
      "border-teal-500/14 bg-teal-500/[0.07] text-teal-800 dark:text-teal-300",
    statClassName:
      "border-teal-500/18 bg-teal-500/[0.08] text-teal-800 dark:text-teal-300",
    dotClassName: "bg-teal-500",
    lineClassName: "from-transparent via-teal-500/45 to-transparent",
  },
  mixed: {
    badgeClassName: "border-primary/20 bg-primary/[0.08] text-primary",
    panelClassName:
      "border-primary/18 bg-gradient-to-br from-primary/[0.10] via-background to-background",
    softPanelClassName:
      "border-primary/14 bg-primary/[0.07] text-primary",
    statClassName: "border-primary/18 bg-primary/[0.08] text-primary",
    dotClassName: "bg-primary",
    lineClassName: "from-transparent via-primary/45 to-transparent",
  },
};

export const TRACK_THEME: Record<
  AnchorTrainingTrack,
  {
    dotClassName: string;
    triggerClassName: string;
    contentClassName: string;
    itemClassName: string;
  }
> = {
  incipit: {
    dotClassName: "bg-rose-500",
    triggerClassName:
      "border-rose-500/18 bg-gradient-to-r from-rose-500/[0.08] via-background/94 to-background text-foreground shadow-[0_12px_28px_-24px_rgba(244,63,94,0.65)]",
    contentClassName: "border-border/60 bg-background/95 backdrop-blur-xl",
    itemClassName:
      "focus:bg-rose-500/[0.08] focus:text-rose-700 dark:focus:text-rose-300 data-[state=checked]:bg-rose-500/[0.10] data-[state=checked]:text-rose-700 dark:data-[state=checked]:text-rose-300",
  },
  context: {
    dotClassName: "bg-teal-500",
    triggerClassName:
      "border-teal-500/18 bg-gradient-to-r from-teal-500/[0.08] via-background/94 to-background text-foreground shadow-[0_12px_28px_-24px_rgba(20,184,166,0.65)]",
    contentClassName: "border-border/60 bg-background/95 backdrop-blur-xl",
    itemClassName:
      "focus:bg-teal-500/[0.08] focus:text-teal-700 dark:focus:text-teal-300 data-[state=checked]:bg-teal-500/[0.10] data-[state=checked]:text-teal-700 dark:data-[state=checked]:text-teal-300",
  },
  reference: {
    dotClassName: "bg-sky-500",
    triggerClassName:
      "border-sky-500/18 bg-gradient-to-r from-sky-500/[0.08] via-background/94 to-background text-foreground shadow-[0_12px_28px_-24px_rgba(14,165,233,0.65)]",
    contentClassName: "border-border/60 bg-background/95 backdrop-blur-xl",
    itemClassName:
      "focus:bg-sky-500/[0.08] focus:text-sky-700 dark:focus:text-sky-300 data-[state=checked]:bg-sky-500/[0.10] data-[state=checked]:text-sky-700 dark:data-[state=checked]:text-sky-300",
  },
  mixed: {
    dotClassName: "bg-primary",
    triggerClassName:
      "border-primary/18 bg-gradient-to-r from-primary/[0.08] via-background/94 to-background text-foreground shadow-[0_12px_28px_-24px_rgba(0,0,0,0.34)]",
    contentClassName: "border-border/60 bg-background/95 backdrop-blur-xl",
    itemClassName:
      "focus:bg-primary/[0.08] focus:text-primary data-[state=checked]:bg-primary/[0.10] data-[state=checked]:text-primary",
  },
};

export function getSummaryLabel(selectedTrack: SessionTrack) {
  return selectedTrack === "mixed"
    ? "Смешанная сессия"
    : `Режим: ${SESSION_TRACK_LABELS[selectedTrack]}`;
}

