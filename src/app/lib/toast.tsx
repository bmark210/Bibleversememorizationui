"use client";

import type { ReactNode } from "react";
import {
  BadgeCheck,
  BadgeInfo,
  CircleX,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import { toast as sonner } from "sonner";
import { cn } from "@/app/components/ui/utils";

export const APP_TOASTER_ID = "app";
export const GALLERY_TOASTER_ID = "gallery";
export const TOAST_TOP_OFFSET_PX = 60;

type ToastSize = "compact" | "expanded";
type AppToastTone = "success" | "error" | "info" | "warning";

export type AppToastOptions = {
  description?: ReactNode;
  label?: ReactNode;
  meta?: ReactNode;
  size?: ToastSize;
  toasterId?: string;
  duration?: number;
  id?: string | number;
};

type AppToastCardProps = {
  tone: AppToastTone;
  title: ReactNode;
  description?: ReactNode;
  label?: ReactNode;
  meta?: ReactNode;
  size: ToastSize;
  onClose: () => void;
};

type ToneStyle = {
  eyebrow: string;
  Icon: LucideIcon;
  shellClassName: string;
  overlayClassName: string;
  iconWrapClassName: string;
  iconClassName: string;
  labelClassName: string;
  closeButtonClassName: string;
};

const SIZE_DURATION: Record<ToastSize, number> = {
  compact: 3200,
  expanded: 5200,
};

const DEFAULT_LABEL_BY_TOASTER_ID: Partial<Record<string, string>> = {
  [GALLERY_TOASTER_ID]: "Тренировка",
};

const TONE_STYLES: Record<AppToastTone, ToneStyle> = {
  success: {
    eyebrow: "Успех",
    Icon: BadgeCheck,
    shellClassName:
      "border-emerald-500/30 bg-gradient-to-br from-emerald-500/[0.14] via-background/96 to-amber-500/[0.10] shadow-[0_24px_60px_-32px_rgba(5,150,105,0.52)]",
    overlayClassName:
      "bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.22),transparent_52%),radial-gradient(circle_at_bottom_left,rgba(245,158,11,0.14),transparent_56%)]",
    iconWrapClassName:
      "border-emerald-500/25 bg-emerald-500/[0.12] text-emerald-800 dark:text-emerald-300",
    iconClassName: "text-emerald-700 dark:text-emerald-300",
    labelClassName:
      "border-emerald-500/25 bg-emerald-500/[0.10] text-emerald-800 dark:text-emerald-300",
    closeButtonClassName:
      "border-emerald-500/20 bg-background/72 text-emerald-900/75 hover:bg-background/88 dark:text-emerald-200/80",
  },
  error: {
    eyebrow: "Ошибка",
    Icon: CircleX,
    shellClassName:
      "border-rose-500/30 bg-gradient-to-br from-rose-500/[0.14] via-background/96 to-background shadow-[0_24px_60px_-32px_rgba(225,29,72,0.5)]",
    overlayClassName:
      "bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.18),transparent_48%),radial-gradient(circle_at_bottom_left,rgba(190,24,93,0.14),transparent_56%)]",
    iconWrapClassName:
      "border-rose-500/25 bg-rose-500/[0.12] text-rose-800 dark:text-rose-300",
    iconClassName: "text-rose-700 dark:text-rose-300",
    labelClassName:
      "border-rose-500/25 bg-rose-500/[0.10] text-rose-800 dark:text-rose-300",
    closeButtonClassName:
      "border-rose-500/20 bg-background/72 text-rose-900/75 hover:bg-background/88 dark:text-rose-200/80",
  },
  warning: {
    eyebrow: "Внимание",
    Icon: TriangleAlert,
    shellClassName:
      "border-amber-500/30 bg-gradient-to-br from-amber-500/[0.16] via-background/96 to-background shadow-[0_24px_60px_-32px_rgba(217,119,6,0.48)]",
    overlayClassName:
      "bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.2),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(217,119,6,0.12),transparent_56%)]",
    iconWrapClassName:
      "border-amber-500/25 bg-amber-500/[0.12] text-amber-900 dark:text-amber-300",
    iconClassName: "text-amber-800 dark:text-amber-300",
    labelClassName:
      "border-amber-500/25 bg-amber-500/[0.10] text-amber-900 dark:text-amber-300",
    closeButtonClassName:
      "border-amber-500/20 bg-background/72 text-amber-950/75 hover:bg-background/88 dark:text-amber-200/80",
  },
  info: {
    eyebrow: "Инфо",
    Icon: BadgeInfo,
    shellClassName:
      "border-sky-500/30 bg-gradient-to-br from-sky-500/[0.14] via-background/96 to-primary/[0.08] shadow-[0_24px_60px_-32px_rgba(14,116,144,0.48)]",
    overlayClassName:
      "bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.16),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_56%)]",
    iconWrapClassName:
      "border-sky-500/25 bg-sky-500/[0.12] text-sky-900 dark:text-sky-300",
    iconClassName: "text-sky-700 dark:text-sky-300",
    labelClassName:
      "border-sky-500/25 bg-sky-500/[0.10] text-sky-900 dark:text-sky-300",
    closeButtonClassName:
      "border-sky-500/20 bg-background/72 text-sky-950/75 hover:bg-background/88 dark:text-sky-200/80",
  },
};

function resolveDuration(options?: AppToastOptions): number | undefined {
  if (options?.duration != null) return options.duration;
  if (options?.size) return SIZE_DURATION[options.size];
  if (options?.description || options?.meta) {
    return SIZE_DURATION.expanded;
  }
  return SIZE_DURATION.compact;
}

function resolveSize(options?: AppToastOptions): ToastSize {
  if (options?.size) return options.size;
  if (options?.description || options?.meta) return "expanded";
  return "compact";
}

function resolveLabel(options?: AppToastOptions) {
  if (options?.label) return options.label;
  const toasterId = options?.toasterId ?? APP_TOASTER_ID;
  return DEFAULT_LABEL_BY_TOASTER_ID[toasterId] ?? null;
}

function AppToastCard({
  tone,
  title,
  description,
  label,
  meta,
  size,
  onClose,
}: AppToastCardProps) {
  const styles = TONE_STYLES[tone];
  const isCompact = size === "compact";
  const Icon = styles.Icon;

  return (
    <div
      className={cn(
        "pointer-events-auto relative overflow-hidden rounded-[28px] border backdrop-blur-2xl",
        isCompact
          ? "w-[min(24rem,calc(100vw-1rem))]"
          : "w-[min(28rem,calc(100vw-1rem))]",
        styles.shellClassName
      )}
    >
      <div
        aria-hidden="true"
        className={cn("pointer-events-none absolute inset-0", styles.overlayClassName)}
      />

      <button
        type="button"
        onClick={onClose}
        aria-label="Закрыть уведомление"
        className={cn(
          "absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border backdrop-blur-md transition-colors",
          styles.closeButtonClassName
        )}
      >
        <X className="h-4 w-4" />
      </button>

      <div
        className={cn(
          "relative flex items-start gap-3 pr-14",
          isCompact ? "px-3.5 py-3" : "px-4 py-3.5"
        )}
      >
        <div
          className={cn(
            "mt-0.5 inline-flex shrink-0 items-center justify-center rounded-[18px] border",
            isCompact ? "h-11 w-11" : "h-12 w-12",
            styles.iconWrapClassName
          )}
        >
          <Icon className={cn(isCompact ? "h-5 w-5" : "h-[1.15rem] w-[1.15rem]", styles.iconClassName)} />
        </div>

        <div className="min-w-0 flex-1">
          <p className={cn("font-semibold uppercase tracking-[0.18em]", isCompact ? "text-[10px]" : "text-[11px]")}>
            {styles.eyebrow}
          </p>

          <div
            className={cn(
              "mt-1 leading-tight text-foreground/90",
              isCompact ? "text-sm font-semibold" : "text-[0.95rem] font-semibold"
            )}
          >
            {title}
          </div>

          {description ? (
            <div
              className={cn(
                "mt-1.5 text-foreground/72",
                isCompact ? "text-[0.8rem] leading-[1.35rem]" : "text-[0.82rem] leading-[1.4rem]"
              )}
            >
              {description}
            </div>
          ) : null}

          {label || meta ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-foreground/68">
              {label ? (
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 font-medium",
                    styles.labelClassName
                  )}
                >
                  {label}
                </span>
              ) : null}
              {meta ? <span className="truncate">{meta}</span> : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function showToast(tone: AppToastTone, message: ReactNode, options?: AppToastOptions) {
  const size = resolveSize(options);
  const label = resolveLabel(options);

  return sonner.custom(
    (toastId) => (
      <AppToastCard
        tone={tone}
        title={message}
        description={options?.description}
        label={label ?? undefined}
        meta={options?.meta}
        size={size}
        onClose={() => sonner.dismiss(toastId)}
      />
    ),
    {
      id: options?.id,
      toasterId: options?.toasterId ?? APP_TOASTER_ID,
      duration: resolveDuration(options),
      unstyled: true,
    }
  );
}

export const toast = {
  success(message: ReactNode, options?: AppToastOptions) {
    return showToast("success", message, options);
  },
  error(message: ReactNode, options?: AppToastOptions) {
    return showToast("error", message, options);
  },
  info(message: ReactNode, options?: AppToastOptions) {
    return showToast("info", message, options);
  },
  warning(message: ReactNode, options?: AppToastOptions) {
    return showToast("warning", message, options);
  },
  dismiss(toastId?: string | number) {
    sonner.dismiss(toastId);
  },
};
