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
    "group rounded-[26px] border px-4 py-3.5 shadow-[var(--shadow-floating)] backdrop-blur-2xl",
  content: "gap-1.5",
  title: "text-[0.98rem] font-semibold leading-5 tracking-[-0.012em] text-current",
  description: "text-[0.84rem] leading-5 text-current opacity-84",
  closeButton:
    "border border-current/15 bg-current/[0.06] text-current/80 transition-colors hover:bg-current/[0.1] hover:text-current",
  success:
    "shadow-[var(--shadow-floating)]",
  error:
    "shadow-[var(--shadow-floating)]",
  warning:
    "shadow-[var(--shadow-floating)]",
  info:
    "shadow-[var(--shadow-floating)]",
  icon:
    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-current/18 bg-current/[0.08] text-current",
} as const;

const DEFAULT_TOAST_STYLE = {
  "--border-radius": "26px",
  "--normal-bg": "rgba(var(--bg-elevated-rgb), 0.96)",
  "--normal-bg-hover": "rgba(var(--bg-elevated-rgb), 0.99)",
  "--normal-border": "rgba(var(--border-default-rgb), 0.66)",
  "--normal-border-hover": "rgba(var(--brand-primary-rgb), 0.38)",
  "--normal-text": "rgb(var(--text-primary-rgb))",
  "--success-bg": "rgba(var(--state-success-rgb), 0.2)",
  "--success-border": "rgba(var(--state-success-rgb), 0.4)",
  "--success-text": "rgb(var(--state-success-rgb))",
  "--warning-bg": "rgba(var(--state-warning-rgb), 0.2)",
  "--warning-border": "rgba(var(--state-warning-rgb), 0.4)",
  "--warning-text": "rgb(var(--state-warning-rgb))",
  "--error-bg": "rgba(var(--state-error-rgb), 0.2)",
  "--error-border": "rgba(var(--state-error-rgb), 0.4)",
  "--error-text": "rgb(var(--state-error-rgb))",
  "--info-bg": "rgba(var(--state-info-rgb), 0.2)",
  "--info-border": "rgba(var(--state-info-rgb), 0.4)",
  "--info-text": "rgb(var(--state-info-rgb))",
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
