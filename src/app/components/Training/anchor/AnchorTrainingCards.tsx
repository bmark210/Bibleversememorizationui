"use client";

import type { ReactNode } from "react";
import { cn } from "@/app/components/ui/utils";

type AnchorTrainingStateCardProps = {
  title: string;
  description: string;
  action?: ReactNode;
  visual?: "loading";
};

function MinimalSpinner() {
  return (
    <div className="flex items-center justify-center py-6" aria-hidden="true">
      <div className="relative h-8 w-8">
        <div className="absolute inset-0 rounded-full border-2 border-primary/10" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary/60 animate-spin" />
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
      <div className="w-full max-w-sm space-y-4 text-center px-2">
        {visual === "loading" ? <MinimalSpinner /> : null}

        <div className="space-y-2">
          <p className="text-base font-medium text-foreground/85">
            {title}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground/70">
            {description}
          </p>
        </div>

        {action && <div className="pt-1">{action}</div>}
      </div>
    </div>
  );
}
