"use client";

import { useEffect } from "react";
import { triggerHaptic } from "@/app/lib/haptics";

const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  "[role='button']",
  "[data-haptic='auto']",
].join(",");

function isDisabledElement(target: Element): boolean {
  if (target instanceof HTMLButtonElement) return target.disabled;
  if (target instanceof HTMLInputElement) return target.disabled;
  return (
    target.getAttribute("aria-disabled") === "true" ||
    target.hasAttribute("disabled")
  );
}

export function useGlobalHaptics() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const interactive = target.closest(INTERACTIVE_SELECTOR);
      if (!interactive) return;
      if (interactive.closest("[data-haptic-managed='true']")) return;
      if (interactive.getAttribute("data-haptic") === "off") return;
      if (isDisabledElement(interactive)) return;

      triggerHaptic("light");
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target;
      if (!(target instanceof Element)) return;

      const interactive = target.closest(INTERACTIVE_SELECTOR);
      if (!interactive) return;
      if (interactive.closest("[data-haptic-managed='true']")) return;
      if (interactive.getAttribute("data-haptic") === "off") return;
      if (isDisabledElement(interactive)) return;

      triggerHaptic("light");
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);
}
