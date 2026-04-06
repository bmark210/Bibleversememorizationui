import React from "react";

type Props = {
  displayActive: number;
  displayTotal: number;
  topInset: number;
};

const HEADER_VEIL_HEIGHT_PX = 48;

export const GalleryHeader = React.memo(function GalleryHeader({
  displayActive,
  displayTotal,
  topInset,
}: Props) {
  return (
    <div
      className="relative shrink-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl"
      style={{ paddingTop: `${topInset}px` }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-full bg-gradient-to-b from-background/72 to-transparent"
        style={{ height: HEADER_VEIL_HEIGHT_PX }}
      />

      <div className="max-w-4xl mx-auto px-4 py-2">
        <div className="flex min-h-9 items-center justify-center">
          <div
            role="status"
            aria-label={`Стих ${Math.min(displayActive + 1, displayTotal)} из ${displayTotal}`}
            className="px-3 py-1 rounded-full bg-background/90 backdrop-blur-md border border-border/50 shadow-lg max-w-[46vw] sm:max-w-[240px]"
          >
            <span className="block truncate text-sm font-semibold tabular-nums text-center text-foreground/75">
              {Math.min(displayActive + 1, displayTotal)} / {displayTotal}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
