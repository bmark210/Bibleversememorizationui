import { useEffect } from "react";

const GALLERY_SCROLL_LOCK_COUNT_DATA_KEY = "verseGalleryScrollLockCount";
const GALLERY_PREV_OVERFLOW_DATA_KEY = "verseGalleryPrevOverflow";
const GALLERY_PREV_OVERFLOW_Y_DATA_KEY = "verseGalleryPrevOverflowY";
const GALLERY_PREV_TOUCH_ACTION_DATA_KEY = "verseGalleryPrevTouchAction";
const GALLERY_PREV_OVERSCROLL_DATA_KEY = "verseGalleryPrevOverscrollBehavior";

function getElementScrollLockCount(element: HTMLElement): number {
  const raw = Number(
    element.dataset[GALLERY_SCROLL_LOCK_COUNT_DATA_KEY] ?? "0"
  );
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

function lockScrollOnElement(element: HTMLElement) {
  const lockCount = getElementScrollLockCount(element);
  if (lockCount === 0) {
    element.dataset[GALLERY_PREV_OVERFLOW_DATA_KEY] = element.style.overflow;
    element.dataset[GALLERY_PREV_OVERFLOW_Y_DATA_KEY] = element.style.overflowY;
    element.dataset[GALLERY_PREV_TOUCH_ACTION_DATA_KEY] =
      element.style.touchAction;
    element.dataset[GALLERY_PREV_OVERSCROLL_DATA_KEY] =
      element.style.overscrollBehavior;

    element.style.overflow = "hidden";
    element.style.overflowY = "hidden";
    element.style.touchAction = "none";
    element.style.overscrollBehavior = "none";
  }

  element.dataset[GALLERY_SCROLL_LOCK_COUNT_DATA_KEY] = String(lockCount + 1);
}

function unlockScrollOnElement(element: HTMLElement) {
  const lockCount = getElementScrollLockCount(element);
  if (lockCount <= 1) {
    const prevOverflow = element.dataset[GALLERY_PREV_OVERFLOW_DATA_KEY] ?? "";
    const prevOverflowY =
      element.dataset[GALLERY_PREV_OVERFLOW_Y_DATA_KEY] ?? "";
    const prevTouchAction =
      element.dataset[GALLERY_PREV_TOUCH_ACTION_DATA_KEY] ?? "";
    const prevOverscrollBehavior =
      element.dataset[GALLERY_PREV_OVERSCROLL_DATA_KEY] ?? "";

    if (prevOverflow) element.style.overflow = prevOverflow;
    else element.style.removeProperty("overflow");

    if (prevOverflowY) element.style.overflowY = prevOverflowY;
    else element.style.removeProperty("overflow-y");

    if (prevTouchAction) element.style.touchAction = prevTouchAction;
    else element.style.removeProperty("touch-action");

    if (prevOverscrollBehavior) {
      element.style.overscrollBehavior = prevOverscrollBehavior;
    } else {
      element.style.removeProperty("overscroll-behavior");
    }

    delete element.dataset[GALLERY_SCROLL_LOCK_COUNT_DATA_KEY];
    delete element.dataset[GALLERY_PREV_OVERFLOW_DATA_KEY];
    delete element.dataset[GALLERY_PREV_OVERFLOW_Y_DATA_KEY];
    delete element.dataset[GALLERY_PREV_TOUCH_ACTION_DATA_KEY];
    delete element.dataset[GALLERY_PREV_OVERSCROLL_DATA_KEY];
    return;
  }

  element.dataset[GALLERY_SCROLL_LOCK_COUNT_DATA_KEY] = String(lockCount - 1);
}

export function useGalleryScrollLock() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const scrollLockTargets = new Set<HTMLElement>();
    const appScrollContainer =
      document.querySelector<HTMLElement>(".app-scroll");
    if (appScrollContainer) scrollLockTargets.add(appScrollContainer);
    const mainScrollContainer = document.querySelector<HTMLElement>("main");
    if (mainScrollContainer) scrollLockTargets.add(mainScrollContainer);
    if (scrollLockTargets.size === 0) return;

    scrollLockTargets.forEach(lockScrollOnElement);
    return () => {
      scrollLockTargets.forEach(unlockScrollOnElement);
    };
  }, []);
}
