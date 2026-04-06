"use client";

import {
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useDrag } from "@use-gesture/react";
import { cn } from "@/app/components/ui/utils";

const SWIPE_DISTANCE_RATIO = 0.18;
const SWIPE_DISTANCE_MIN_PX = 72;
const SWIPE_DISTANCE_MAX_PX = 148;
const SWIPE_TRIGGER_VELOCITY = 0.52;
const SWIPE_IGNORE_SELECTOR = [
  "button",
  "a",
  "input",
  "textarea",
  "select",
  "[role='button']",
  "[contenteditable='true']",
  "[data-gallery-swipe-ignore='true']",
].join(", ");

type Props = {
  slideKey: string;
  direction: number;
  enabled: boolean;
  className?: string;
  onNavigate: (dir: "prev" | "next") => Promise<boolean>;
  children: ReactNode;
};

function getSwipeThreshold(element: HTMLElement | null) {
  const height = Math.max(
    element?.getBoundingClientRect().height ?? 0,
    typeof window !== "undefined" ? window.innerHeight : 0,
    1
  );

  return Math.min(
    SWIPE_DISTANCE_MAX_PX,
    Math.max(SWIPE_DISTANCE_MIN_PX, height * SWIPE_DISTANCE_RATIO)
  );
}

function shouldIgnoreTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(SWIPE_IGNORE_SELECTOR));
}

function SwipeSlideBody({
  enabled,
  onNavigate,
  children,
}: Omit<Props, "className" | "slideKey" | "direction">) {
  const dragRef = useRef<HTMLDivElement | null>(null);
  const isNavigatingRef = useRef(false);
  const [dragOffsetY, setDragOffsetY] = useState(0);

  const navigateWithSwipe = useCallback(
    async (step: 1 | -1) => {
      if (isNavigatingRef.current) return;
      isNavigatingRef.current = true;

      const didNavigate = await onNavigate(step === 1 ? "next" : "prev");
      if (!didNavigate) {
        setDragOffsetY(0);
      }

      isNavigatingRef.current = false;
    },
    [onNavigate]
  );

  useDrag(
    ({
      active,
      movement: [, offsetY],
      direction: [, directionY],
      swipe: [, swipeY],
      velocity: [, velocityY],
      event,
      cancel,
    }) => {
      if (!enabled || isNavigatingRef.current) {
        cancel();
        return;
      }

      if (shouldIgnoreTarget(event.target)) {
        cancel();
        return;
      }

      if (active) {
        setDragOffsetY(offsetY);
        return;
      }

      const swipeStep = swipeY === -1 ? 1 : swipeY === 1 ? -1 : 0;
      if (swipeStep !== 0) {
        void navigateWithSwipe(swipeStep as 1 | -1);
        return;
      }

      const threshold = getSwipeThreshold(dragRef.current);
      const movementDirection = offsetY !== 0 ? Math.sign(offsetY) : directionY;
      const didPassDistance = Math.abs(offsetY) >= threshold;
      const didPassVelocity =
        Math.abs(velocityY) >= SWIPE_TRIGGER_VELOCITY && movementDirection !== 0;

      if (didPassDistance || didPassVelocity) {
        void navigateWithSwipe(movementDirection < 0 ? 1 : -1);
        return;
      }

      setDragOffsetY(0);
    },
    {
      target: dragRef,
      axis: "y",
      filterTaps: true,
      pointer: { touch: true },
      eventOptions: { passive: false },
      rubberband: 0.14,
      swipe: {
        velocity: [0, SWIPE_TRIGGER_VELOCITY],
        distance: [0, 56],
        duration: 260,
      },
    }
  );

  return (
    <div className="col-start-1 row-start-1 w-full overflow-visible">
      <div
        ref={dragRef}
        style={{
          transform: dragOffsetY === 0 ? undefined : `translateY(${dragOffsetY}px)`,
          touchAction: enabled ? "pan-x" : "auto",
        }}
        className="h-full w-full"
      >
        {children}
      </div>
    </div>
  );
}

export function GallerySwipeSlide({
  slideKey,
  direction: _direction,
  enabled,
  className,
  onNavigate,
  children,
}: Props) {
  return (
    <div
      className={cn("relative isolate grid w-full place-items-center overflow-visible", className)}
    >
      <SwipeSlideBody
        key={slideKey}
        enabled={enabled}
        onNavigate={onNavigate}
      >
        {children}
      </SwipeSlideBody>
    </div>
  );
}
