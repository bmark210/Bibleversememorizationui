import { memo } from "react";
import { cn } from "@/app/components/ui/utils";
import { clamp } from "../utils";
import { MAX_DOTS, EMULATED_DOT_COUNT } from "../constants";

type Props = {
  total: number;
  active: number;
};

export const DotProgress = memo(function DotProgress({ total, active }: Props) {
  const safeTotal = Math.max(0, total);
  const safeActive = clamp(active, 0, Math.max(0, safeTotal - 1));
  const currentValue = safeTotal > 0 ? safeActive + 1 : 0;
  const isEmulated = safeTotal > MAX_DOTS;
  const dotCount = isEmulated ? EMULATED_DOT_COUNT : safeTotal;
  const activeDotIndex =
    dotCount <= 1 || safeTotal <= 1
      ? 0
      : Math.round((safeActive / (safeTotal - 1)) * (dotCount - 1));

  if (dotCount <= 0) {
    return (
      <div
        role="status"
        aria-label="Нет карточек"
        className="px-3 py-2.5 rounded-full bg-background/90 backdrop-blur-md border border-border/50 shadow-lg"
      >
        <div className="h-2 w-20 rounded-full bg-muted/40" />
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-label={`Стих ${currentValue} из ${safeTotal}`}
      className={cn(
        "relative overflow-hidden rounded-full bg-background/90 backdrop-blur-md border border-border/50 shadow-lg",
        isEmulated
          ? "w-[min(46vw,220px)] min-w-[146px] px-3 py-2.5"
          : "px-3 py-2.5"
      )}
    >
      {isEmulated && (
        <>
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-3 top-1/2 h-px -translate-y-1/2 bg-border/25" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background/95 to-transparent" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background/95 to-transparent" />
        </>
      )}

      <div className={cn("relative flex items-center", isEmulated ? "w-full justify-between" : "gap-1.5")}>
        {Array.from({ length: dotCount }).map((_, i) => {
          const isActiveDot = i === activeDotIndex;
          const distance = Math.abs(i - activeDotIndex);
          const compressedSize = distance >= 6 ? 4 : distance >= 4 ? 5 : 6;
          const baseDotSize = isEmulated ? compressedSize : 8;
          const baseOpacity = isEmulated ? clamp(0.95 - distance * 0.12, 0.18, 0.9) : 0.32;

          return (
            <div
              key={i}
              className={cn("relative flex items-center justify-center", isEmulated ? "shrink-0" : "")}
            >
              {isActiveDot ? (
                <>
                  <span
                    aria-hidden="true"
                    className="absolute rounded-full bg-primary/28 blur-md pointer-events-none animate-pulse"
                    style={{ width: isEmulated ? 20 : 24, height: isEmulated ? 10 : 11 }}
                  />
                  {/* Active pill — CSS transition instead of motion.div */}
                  <div
                    className="relative rounded-full border border-primary/40 bg-gradient-to-r from-primary/80 via-primary to-primary/80 shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_2px_10px_rgba(0,0,0,0.22)] transition-all duration-300 ease-out"
                    style={{ width: isEmulated ? 18 : 20, height: isEmulated ? 8 : 9 }}
                  >
                    <span aria-hidden="true" className="absolute left-[12%] right-[12%] top-[1px] h-[2px] rounded-full bg-white/28" />
                    <span aria-hidden="true" className="absolute inset-y-[1px] left-[1px] w-[28%] rounded-full bg-white/10 blur-[1px]" />
                  </div>
                </>
              ) : (
                // Inactive dots — CSS transition instead of motion.div
                <div
                  className="rounded-full bg-muted-foreground/55 transition-all duration-200 ease-out"
                  style={{
                    width: baseDotSize,
                    height: baseDotSize,
                    opacity: baseOpacity,
                    transform: isEmulated && distance >= 5 ? "scale(0.95)" : "scale(1)",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
