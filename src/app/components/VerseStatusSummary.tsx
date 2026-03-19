import type { LucideIcon } from "lucide-react";
import { cn } from "@/app/components/ui/utils";

export type VerseStatusSummaryTone = {
  icon: LucideIcon;
  title: string;
  pillClassName: string;
  iconClassName: string;
  titleClassName: string;
};

type VerseStatusSummaryProps = {
  tone: VerseStatusSummaryTone;
  progressPercent: number;
  size?: "sm" | "md";
  className?: string;
};

const SIZE_CONFIG = {
  sm: {
    containerGap: "gap-2",
    pill: "gap-1.5 px-3 py-1.5",
    icon: "h-3.5 w-3.5",
    title: "text-[11px]",
    progressWrap: "gap-0.5",
    value: "text-[1.2rem]",
    percent: "pt-[0.18rem] text-[0.58rem]",
  },
  md: {
    containerGap: "gap-2",
    pill: "gap-2 px-3.5 py-2",
    icon: "h-4 w-4",
    title: "text-sm",
    progressWrap: "gap-0.5",
    value: "text-[1.6rem]",
    percent: "pt-[0.22rem] text-[0.68rem]",
  },
} as const;

export function VerseStatusSummary({
  tone,
  progressPercent,
  size = "md",
  className,
}: VerseStatusSummaryProps) {
  return (
    <div className={cn("flex items-center", SIZE_CONFIG[size].containerGap, className)}>
      <VerseStatusPill tone={tone} size={size} />
      <VerseProgressValue progressPercent={progressPercent} size={size} />
    </div>
  );
}

export function VerseStatusPill({
  tone,
  size = "md",
  className,
}: {
  tone: VerseStatusSummaryTone;
  size?: "sm" | "md";
  className?: string;
}) {
  const config = SIZE_CONFIG[size];

  return (
    <div
      className={cn(
        "inline-flex min-w-0 items-center rounded-full border shadow-sm backdrop-blur-sm",
        config.pill,
        tone.pillClassName,
        className,
      )}
    >
      <tone.icon className={cn("flex-shrink-0", config.icon, tone.iconClassName)} />
      <span
        className={cn(
          "min-w-0 truncate font-semibold leading-none",
          config.title,
          tone.titleClassName,
        )}
      >
        {tone.title}
      </span>
    </div>
  );
}

export function VerseProgressValue({
  progressPercent,
  size = "md",
  className,
}: {
  progressPercent: number;
  size?: "sm" | "md";
  className?: string;
}) {
  const config = SIZE_CONFIG[size];
  const normalizedPercent = Math.max(0, Math.min(100, Math.round(progressPercent)));

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-start leading-none text-primary/85 drop-shadow-[0_1px_0_rgba(0,0,0,0.28)]",
        config.progressWrap,
        className,
      )}
      aria-label={`Освоение ${normalizedPercent}%`}
    >
      <span className={cn("font-bold tabular-nums tracking-[-0.04em]", config.value)}>
        {normalizedPercent}
      </span>
      <span className={cn("font-semibold opacity-72", config.percent)}>%</span>
    </div>
  );
}
