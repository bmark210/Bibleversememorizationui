"use client";

import type { ReactNode } from "react";
import { cn } from "@/app/components/ui/utils";
import { QuestionBadge, SurfacePanel } from "./AnchorTrainingCardUi";

type AnchorTrainingStateCardProps = {
  title: string;
  description: string;
  action?: ReactNode;
  visual?: "loading";
};

function LoadingPlaceholder({ className }: { className: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "rounded-full bg-gradient-to-r from-border/45 via-primary/[0.14] to-border/45 animate-pulse",
        className
      )}
    />
  );
}

function AnchorTrainingLoadingVisual() {
  const loadingDots = [
    { className: "bg-primary/70", delayMs: 0 },
    { className: "bg-primary/80", delayMs: 160 },
    { className: "bg-primary/70", delayMs: 320 },
  ] as const;

  return (
    <div className="mx-auto w-full max-w-sm" aria-hidden="true">
      <div className="rounded-[2rem] border border-border/55 bg-background/72 p-4 shadow-[0_18px_50px_-40px_rgba(0,0,0,0.45)] backdrop-blur-sm sm:p-5">
        <div className="flex items-center justify-center gap-2.5">
          {loadingDots.map((dot, i) => (
            <span
              key={i}
              className={cn("h-2 w-2 rounded-full animate-pulse", dot.className)}
              style={{ animationDelay: `${dot.delayMs}ms` }}
            />
          ))}
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-[1.5rem] border border-border/50 bg-background/90 px-4 py-4">
            <LoadingPlaceholder className="mx-auto h-2.5 w-16" />
            <LoadingPlaceholder className="mx-auto mt-3 h-3 w-full max-w-[13.5rem]" />
            <LoadingPlaceholder className="mx-auto mt-2 h-3 w-4/5 max-w-[11.5rem]" />
          </div>

          <div className="space-y-2">
            <LoadingPlaceholder className="mx-auto h-2.5 w-3/4" />
            <LoadingPlaceholder className="mx-auto h-2.5 w-1/2" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function AnchorTrainingStateCard({
  title,
  description,
  action,
  visual,
}: AnchorTrainingStateCardProps) {
  return (
    <div className="flex h-full w-full min-w-0 flex-col items-center justify-center">
      <div className="w-full max-w-lg space-y-5 text-center">
        <QuestionBadge className="border-border/60 bg-background/80 text-foreground/70">
          Закрепление
        </QuestionBadge>

        <SurfacePanel className="border-border/60 bg-gradient-to-br from-background via-background to-muted/45 px-6 py-6 sm:px-8">
          <p className="text-xl font-medium font-serif italic !text-primary/90">
            {title}
          </p>
        </SurfacePanel>

        {visual === "loading" ? <AnchorTrainingLoadingVisual /> : null}

        <p className="max-w-lg text-center text-sm leading-relaxed text-foreground/68">
          {description}
        </p>

        {action && <div className="pt-2">{action}</div>}
      </div>
    </div>
  );
}
