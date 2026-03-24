"use client";

import {
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useDrag } from "@use-gesture/react";
import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
} from "motion/react";
import { cn } from "@/app/components/ui/utils";

const ENTER_EXIT_OFFSET_PX = 100;
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

const ENTER_SPRING = {
  type: "spring" as const,
  stiffness: 380,
  damping: 32,
  mass: 0.85,
};

const EXIT_TRANSITION = {
  duration: 0.2,
  ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
};

const SNAP_BACK_SPRING = {
  type: "spring" as const,
  stiffness: 500,
  damping: 38,
  mass: 0.85,
};

type Props = {
  slideKey: string;
  direction: number;
  enabled: boolean;
  className?: string;
  onNavigate: (dir: "prev" | "next") => Promise<boolean>;
  children: ReactNode;
};

type SlideBodyProps = Omit<Props, "className" | "slideKey">;

function getInitialOffset(direction: number) {
  if (direction > 0) return ENTER_EXIT_OFFSET_PX;
  if (direction < 0) return -ENTER_EXIT_OFFSET_PX;
  return 0;
}

function getExitOffset(direction: number) {
  if (direction > 0) return -ENTER_EXIT_OFFSET_PX;
  if (direction < 0) return ENTER_EXIT_OFFSET_PX;
  return 0;
}

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

/**
 * Two-layer architecture:
 *  - Outer motion.div: handles enter/exit animations (y offset, opacity, scale)
 *  - Inner motion.div: handles drag gesture via MotionValue (dragY)
 *
 * This prevents the drag MotionValue from overriding framer-motion's
 * initial/animate/exit y values — a bug that broke enter/exit slide transitions.
 */
function SwipeSlideBody({
  direction,
  enabled,
  onNavigate,
  children,
}: SlideBodyProps) {
  const dragRef = useRef<HTMLDivElement | null>(null);
  const isNavigatingRef = useRef(false);
  const dragY = useMotionValue(0);
  const prefersReducedMotion = useReducedMotion();

  const animateBack = useCallback(async () => {
    if (prefersReducedMotion) {
      dragY.jump(0);
      return;
    }

    await animate(dragY, 0, SNAP_BACK_SPRING).finished.catch(() => {});
  }, [prefersReducedMotion, dragY]);

  const navigateWithSwipe = useCallback(
    async (step: 1 | -1) => {
      if (isNavigatingRef.current) return;
      isNavigatingRef.current = true;

      const didNavigate = await onNavigate(step === 1 ? "next" : "prev");
      if (!didNavigate) {
        await animateBack();
      }

      isNavigatingRef.current = false;
    },
    [animateBack, onNavigate]
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
        dragY.set(offsetY);
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

      void animateBack();
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
    <motion.div
      initial={{
        y: getInitialOffset(direction),
        opacity: direction === 0 ? 1 : 0,
        scale: direction === 0 ? 1 : 0.97,
      }}
      animate={{
        y: 0,
        opacity: 1,
        scale: 1,
        transition: ENTER_SPRING,
      }}
      exit={{
        y: getExitOffset(direction),
        opacity: 0,
        scale: 0.97,
        transition: EXIT_TRANSITION,
      }}
      className="absolute inset-0 will-change-transform"
    >
      <motion.div
        ref={dragRef}
        style={{
          y: dragY,
          touchAction: enabled ? "pan-x" : "auto",
        }}
        className="h-full w-full"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

export function GallerySwipeSlide({
  slideKey,
  direction,
  enabled,
  className,
  onNavigate,
  children,
}: Props) {
  return (
    <div className={cn("relative h-full min-h-0 w-full overflow-hidden", className)}>
      <AnimatePresence initial={false} mode="popLayout">
        <SwipeSlideBody
          key={slideKey}
          direction={direction}
          enabled={enabled}
          onNavigate={onNavigate}
        >
          {children}
        </SwipeSlideBody>
      </AnimatePresence>
    </div>
  );
}
