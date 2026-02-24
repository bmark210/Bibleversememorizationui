"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

import { cn } from "./ui/utils";

type VerseCardMinHeight = "auto" | "preview" | "training";
export type VerseCardPreviewTone = "new" | "learning" | "review" | "stopped";

export interface VerseCardProps {
  isActive?: boolean;
  topBadge?: ReactNode;
  header?: ReactNode;
  body: ReactNode;
  footer?: ReactNode;
  centerAction?: ReactNode;
  shellClassName?: string;
  contentClassName?: string;
  minHeight?: VerseCardMinHeight;
  bodyScrollable?: boolean;
  previewTone?: VerseCardPreviewTone;
}

const MIN_HEIGHT_CLASS_BY_KIND: Record<VerseCardMinHeight, string> = {
  auto: "",
  preview: "h-[520px]",
  training: "h-[clamp(24rem,calc(100dvh-18rem),39rem)]",
};

const PREVIEW_TONE_CARD_CLASS: Record<VerseCardPreviewTone, string> = {
  new: "border-sky-500/20 bg-gradient-to-br from-sky-500/8 via-card to-card/85",
  learning: "border-emerald-500/20 bg-gradient-to-br from-emerald-500/8 via-card to-card/85",
  review: "border-violet-500/22 bg-gradient-to-br from-violet-500/10 via-card to-card/85",
  stopped: "border-rose-500/20 bg-gradient-to-br from-rose-500/8 via-card to-card/85",
};

const PREVIEW_TONE_GLOW_CLASS: Record<VerseCardPreviewTone, string> = {
  new: "bg-sky-500/18",
  learning: "bg-emerald-500/16",
  review: "bg-violet-500/18",
  stopped: "bg-rose-500/16",
};

const PREVIEW_TONE_LINE_CLASS: Record<VerseCardPreviewTone, string> = {
  new: "from-sky-500/0 via-sky-500/35 to-sky-500/0",
  learning: "from-emerald-500/0 via-emerald-500/35 to-emerald-500/0",
  review: "from-violet-500/0 via-violet-500/35 to-violet-500/0",
  stopped: "from-rose-500/0 via-rose-500/35 to-rose-500/0",
};

export function VerseCard({
  isActive = true,
  topBadge,
  header,
  body,
  footer,
  centerAction,
  shellClassName,
  contentClassName,
  minHeight = "training",
  bodyScrollable = false,
  previewTone,
}: VerseCardProps) {
  const enableTapScale = !bodyScrollable;
  const isPreviewToneActive = Boolean(previewTone);
  const tone = previewTone ?? "learning";

  return (
    <div className={cn("relative w-full max-w-2xl mx-auto select-none", shellClassName)}>
      <motion.div
        whileTap={enableTapScale ? { scale: 0.985 } : undefined}
        className={cn(
          "relative z-10 w-full bg-gradient-to-br from-card to-card/80",
          "backdrop-blur-sm rounded-[3rem] border-2 border-border/50",
          "shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)]",
          "p-6 sm:p-10 flex flex-col overflow-hidden",
          "transition-[opacity,transform] duration-300",
          isPreviewToneActive && PREVIEW_TONE_CARD_CLASS[tone],
          MIN_HEIGHT_CLASS_BY_KIND[minHeight],
          isActive ? "opacity-100 scale-100" : "opacity-60 scale-95"
        )}
      >
        {isPreviewToneActive && (
          <>
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute left-10 right-10 top-0 h-px bg-gradient-to-r",
                PREVIEW_TONE_LINE_CLASS[tone]
              )}
            />
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute -top-10 left-1/2 h-24 w-[70%] -translate-x-1/2 rounded-full blur-3xl",
                PREVIEW_TONE_GLOW_CLASS[tone]
              )}
            />
          </>
        )}

        {topBadge && (
          <div className="z-50 absolute top-[-30px] left-1/2 -translate-x-1/2 h-fit pointer-events-none">
            {topBadge}
          </div>
        )}

        {header ? <div className="flex-shrink-0 mb-2">{header}</div> : null}

        <div className="relative flex-1 min-h-0">
          <div
            data-verse-card-scroll-body={bodyScrollable ? "true" : undefined}
            className={cn(
              "h-full min-h-0",
              bodyScrollable && "overflow-y-auto overscroll-contain touch-pan-y pr-1 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]",
              contentClassName
            )}
          >
            {body}
          </div>

          {bodyScrollable && (
            <>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-3 bg-gradient-to-b from-card/55 to-transparent"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-card/65 to-transparent"
              />
            </>
          )}
        </div>

        {centerAction ? (
          <div className="flex-shrink-0 mt-4 mb-2 flex justify-center">{centerAction}</div>
        ) : null}

        {footer ? <div className="flex-shrink-0 mt-6">{footer}</div> : null}
      </motion.div>
    </div>
  );
}
