"use client";

import { Toaster as SonnerToaster } from "sonner";
import type { ToasterProps } from "sonner";
import type { CSSProperties } from "react";
import { APP_TOASTER_ID, TOAST_TOP_OFFSET_PX } from "@/app/lib/toast";

const DEFAULT_OFFSET = {
  top: `calc(env(safe-area-inset-top) + ${TOAST_TOP_OFFSET_PX}px)`,
  left: 14,
  right: 14,
  bottom: 14,
};

const DEFAULT_MOBILE_OFFSET = {
  top: `calc(env(safe-area-inset-top) + ${TOAST_TOP_OFFSET_PX}px)`,
  left: 10,
  right: 10,
  bottom: 10,
};

const DEFAULT_TOAST_CLASS_NAMES = {
  toast:
    "group rounded-[26px] border px-4 py-3.5 shadow-[0_24px_72px_-36px_rgba(15,23,42,0.56)] backdrop-blur-2xl",
  content: "gap-1.5",
  title: "text-[0.98rem] font-semibold leading-5 tracking-[-0.012em] text-current",
  description: "text-[0.84rem] leading-5 text-current opacity-84",
  closeButton:
    "border border-current/15 bg-black/5 text-current/80 transition-colors hover:bg-black/10 hover:text-current",
  success:
    "shadow-[0_28px_74px_-38px_rgba(79,114,88,0.56)]",
  error:
    "shadow-[0_28px_74px_-38px_rgba(184,74,58,0.56)]",
  warning:
    "shadow-[0_28px_74px_-38px_rgba(184,147,95,0.58)]",
  info:
    "shadow-[0_28px_74px_-38px_rgba(212,165,116,0.54)]",
  icon:
    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-current/18 bg-current/[0.08] text-current",
} as const;

const DEFAULT_TOAST_STYLE = {
  "--border-radius": "26px",
  "--normal-bg": "rgba(var(--color-card-rgb), 0.96)",
  "--normal-bg-hover": "rgba(var(--color-card-rgb), 0.99)",
  "--normal-border": "rgba(var(--color-border-rgb), 0.58)",
  "--normal-border-hover": "rgba(var(--color-border-rgb), 0.78)",
  "--normal-text": "rgb(var(--color-foreground-rgb))",
  "--success-bg": "rgba(var(--color-success-rgb), 0.22)",
  "--success-border": "rgba(var(--color-success-rgb), 0.44)",
  "--success-text": "rgb(var(--color-success-rgb))",
  "--warning-bg": "rgba(var(--color-accent-rgb), 0.24)",
  "--warning-border": "rgba(var(--color-accent-rgb), 0.44)",
  "--warning-text": "rgb(var(--color-accent-rgb))",
  "--error-bg": "rgba(var(--color-destructive-rgb), 0.22)",
  "--error-border": "rgba(var(--color-destructive-rgb), 0.44)",
  "--error-text": "rgb(var(--color-destructive-rgb))",
  "--info-bg": "rgba(var(--color-primary-rgb), 0.22)",
  "--info-border": "rgba(var(--color-primary-rgb), 0.44)",
  "--info-text": "rgb(var(--color-primary-rgb))",
} as CSSProperties;

const Toaster = ({
  id = APP_TOASTER_ID,
  position = "top-center",
  visibleToasts = 4,
  gap = 10,
  offset = DEFAULT_OFFSET,
  mobileOffset = DEFAULT_MOBILE_OFFSET,
  toastOptions,
  ...props
}: ToasterProps) => {
  const mergedClassNames = {
    ...DEFAULT_TOAST_CLASS_NAMES,
    ...(toastOptions?.classNames ?? {}),
  };

  return (
    <SonnerToaster
      id={id}
      position={position}
      theme="system"
      richColors
      closeButton={false}
      expand
      visibleToasts={visibleToasts}
      gap={gap}
      offset={offset}
      mobileOffset={mobileOffset}
      toastOptions={{
        ...toastOptions,
        style: {
          ...DEFAULT_TOAST_STYLE,
          ...(toastOptions?.style ?? {}),
        },
        classNames: mergedClassNames,
      }}
      {...props}
    />
  );
};

export { Toaster };
