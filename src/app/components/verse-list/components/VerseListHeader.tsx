import React from "react";
import { cn } from "../../ui/utils";

type VerseListHeaderProps = {
  isFullscreen?: boolean;
};

export function VerseListHeader({
  isFullscreen = false,
}: VerseListHeaderProps) {
  if (isFullscreen) return null;

  return (
    <div
      className={cn(
        "px-4 pt-3 sm:px-6 sm:pt-5 lg:px-8 lg:pt-7",
      )}
    >
      <h1 className="text-primary">Cтиxи</h1>
    </div>
  );
}
