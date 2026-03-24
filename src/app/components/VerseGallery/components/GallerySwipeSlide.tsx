"use client";

import { memo, useCallback, useEffect, useRef, type ReactNode } from "react";
import { useDrag } from "@use-gesture/react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { clamp } from "../utils";

type Props = {
  enabled: boolean;
  onSwipeStep: (step: 1 | -1) => Promise<boolean> | boolean;
  children: ReactNode;
};

const RESET_TWEEN: [number, number, number, number] = [0.22, 1, 0.36, 1];
const SWIPE_MAX_OFFSET_PX = 168;
const SWIPE_TRIGGER_DISTANCE_PX = 76;
const SWIPE_TRIGGER_VELOCITY = 0.32;
const SWIPE_RELEASE_BIAS_PX = 18;
const SWIPE_ASYNC_RESET_DELAY_MS = 120;
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

export const GallerySwipeSlide = memo(function GallerySwipeSlide({
  enabled,
  onSwipeStep,
  children,
}: Props) {
  const prefersReducedMotion = useReducedMotion();
  const dragY = useMotionValue(0);
  const dragScale = useTransform(
    dragY,
    [-SWIPE_MAX_OFFSET_PX, 0, SWIPE_MAX_OFFSET_PX],
    [0.982, 1, 0.982]
  );
  const dragOpacity = useTransform(
    dragY,
    [-SWIPE_MAX_OFFSET_PX, 0, SWIPE_MAX_OFFSET_PX],
    [0.88, 1, 0.88]
  );
  const resetAnimationRef = useRef<ReturnType<typeof animate> | null>(null);
  const fallbackResetTimerRef = useRef<number | null>(null);

  const clearFallbackReset = useCallback(() => {
    if (fallbackResetTimerRef.current === null || typeof window === "undefined") {
      return;
    }

    window.clearTimeout(fallbackResetTimerRef.current);
    fallbackResetTimerRef.current = null;
  }, []);

  const stopResetAnimation = useCallback(() => {
    resetAnimationRef.current?.stop();
    resetAnimationRef.current = null;
  }, []);

  const resetDragOffset = useCallback(
    (immediate = false) => {
      clearFallbackReset();
      stopResetAnimation();

      if (immediate || prefersReducedMotion) {
        dragY.set(0);
        return;
      }

      resetAnimationRef.current = animate(dragY, 0, {
        duration: 0.18,
        ease: RESET_TWEEN,
      });
    },
    [clearFallbackReset, dragY, prefersReducedMotion, stopResetAnimation]
  );

  useEffect(
    () => () => {
      clearFallbackReset();
      stopResetAnimation();
    },
    [clearFallbackReset, stopResetAnimation]
  );

  useEffect(() => {
    if (!enabled) {
      resetDragOffset(true);
    }
  }, [enabled, resetDragOffset]);

  const bind = useDrag(
    ({
      active,
      first,
      movement: [, movementY],
      velocity: [, velocityY],
      event,
      cancel,
      touches,
    }) => {
      if (!enabled) return;

      if (touches > 1) {
        cancel?.();
        resetDragOffset(true);
        return;
      }

      const target = event.target;
      if (
        first &&
        target instanceof HTMLElement &&
        target.closest(SWIPE_IGNORE_SELECTOR)
      ) {
        cancel?.();
        return;
      }

      const nextOffset = clamp(
        movementY,
        -SWIPE_MAX_OFFSET_PX,
        SWIPE_MAX_OFFSET_PX
      );

      if (active) {
        clearFallbackReset();
        stopResetAnimation();
        dragY.set(nextOffset);
        return;
      }

      const shouldCommit =
        Math.abs(movementY) >= SWIPE_TRIGGER_DISTANCE_PX ||
        Math.abs(velocityY) >= SWIPE_TRIGGER_VELOCITY;

      if (!shouldCommit) {
        resetDragOffset();
        return;
      }

      const step = movementY < 0 ? 1 : -1;
      dragY.set(
        clamp(
          nextOffset + (step === 1 ? -SWIPE_RELEASE_BIAS_PX : SWIPE_RELEASE_BIAS_PX),
          -SWIPE_MAX_OFFSET_PX,
          SWIPE_MAX_OFFSET_PX
        )
      );

      if (typeof window !== "undefined") {
        fallbackResetTimerRef.current = window.setTimeout(() => {
          fallbackResetTimerRef.current = null;
          resetDragOffset();
        }, SWIPE_ASYNC_RESET_DELAY_MS);
      }

      void Promise.resolve(onSwipeStep(step))
        .then((didNavigate) => {
          clearFallbackReset();
          if (!didNavigate) {
            resetDragOffset();
          }
        })
        .catch(() => {
          clearFallbackReset();
          resetDragOffset();
        });
    },
    {
      axis: "y",
      axisThreshold: { touch: 8 },
      filterTaps: true,
      pointer: { touch: true },
      rubberband: 0.16,
      threshold: 10,
    }
  );

  return (
    <div
      {...(enabled ? bind() : {})}
      className="w-full"
      style={{ touchAction: enabled ? "none" : undefined }}
    >
      <motion.div
        className="w-full"
        style={{
          y: dragY,
          scale: dragScale,
          opacity: dragOpacity,
          willChange: enabled ? "transform, opacity" : undefined,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
});
