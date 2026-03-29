import React, { useState, useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { SWIPE_HINT_KEY } from "../constants";
import type { PanelMode } from "../types";

type Props = {
  panelMode: PanelMode;
};

export const SwipeHint = React.memo(function SwipeHint({ panelMode }: Props) {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      return isTouch && !sessionStorage.getItem(SWIPE_HINT_KEY);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem(SWIPE_HINT_KEY, "1");
      } catch {}
    }, 4000);
    return () => clearTimeout(t);
  }, [visible]);

  const hintText =
    panelMode === "training"
      ? "Свайп ↑↓ — стихи в изучении"
      : "Свайп ↑↓ — листать · кнопки — действия";

  return (
    visible ? (
      <div className="absolute bottom-36 left-1/2 z-30 -translate-x-1/2 pointer-events-none">
        <div className="flex items-center gap-2.5 rounded-2xl border border-border/30 bg-foreground/10 px-5 py-2.5 backdrop-blur-sm animate-bounce">
          <div className="flex flex-col items-center gap-0">
            <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
            {hintText}
          </span>
        </div>
      </div>
    ) : null
  );
});
