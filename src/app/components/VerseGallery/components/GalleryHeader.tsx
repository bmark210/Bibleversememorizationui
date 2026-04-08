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
      className="relative z-40 shrink-0"
      style={{ paddingTop: `${topInset}px` }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-full bg-gradient-to-b from-bg-app/88 to-transparent"
        style={{ height: HEADER_VEIL_HEIGHT_PX }}
      />

      <div className="max-w-4xl mx-auto px-4 py-2">
        <div className="flex min-h-9 items-center justify-center">
          <div
            role="status"
            aria-label={`Стих ${Math.min(displayActive + 1, displayTotal)} из ${displayTotal}`}
            className="max-w-[46vw] rounded-full border border-border-default/55 bg-bg-elevated px-3.5 py-1.5 shadow-[var(--shadow-soft)] sm:max-w-[240px]"
          >
            <span className="block truncate text-sm font-semibold tabular-nums text-center text-text-secondary">
              {Math.min(displayActive + 1, displayTotal)} / {displayTotal}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});
