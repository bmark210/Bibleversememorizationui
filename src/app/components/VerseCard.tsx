"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";

import { cn } from "./ui/utils";

type VerseCardMinHeight = "auto" | "preview" | "training";

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
}

const MIN_HEIGHT_CLASS_BY_KIND: Record<VerseCardMinHeight, string> = {
  auto: "",
  preview: "h-[520px]",
  training: "h-[clamp(24rem,calc(100dvh-18rem),39rem)]",
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
}: VerseCardProps) {
  const enableTapScale = !bodyScrollable;

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
          MIN_HEIGHT_CLASS_BY_KIND[minHeight],
          isActive ? "opacity-100 scale-100" : "opacity-60 scale-95"
        )}
      >
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
