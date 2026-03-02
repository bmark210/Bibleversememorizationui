"use client";

import type { ReactNode } from "react";
import {
  toast as hotToast,
  type Toast,
  type ToastOptions,
} from "react-hot-toast";

export const APP_TOASTER_ID = "app";
export const GALLERY_TOASTER_ID = "gallery";

type ToastSize = "compact" | "expanded";
export type AppToastOptions = ToastOptions & {
  description?: ReactNode;
  size?: ToastSize;
};

type CustomRenderable = ReactNode | ((t: Toast) => ReactNode);
type ToastTone = "success" | "error" | "info";

const TOAST_STYLE_BASE: NonNullable<ToastOptions["style"]> = {
  background: "var(--popover)",
  color: "var(--popover-foreground)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  boxShadow: "0 10px 28px rgba(0,0,0,0.18)",
};

const TOAST_SIZE_PRESETS: Record<ToastSize, Pick<ToastOptions, "duration" | "style">> = {
  compact: {
    duration: 3200,
    style: { padding: "10px 12px", minHeight: "44px" },
  },
  expanded: {
    duration: 5200,
    style: { padding: "12px 14px", minHeight: "56px", width: "min(92vw, 430px)" },
  },
};

const TOAST_TONE_PRESETS: Record<ToastTone, Pick<ToastOptions, "icon" | "style">> = {
  success: {
    icon: "✅",
    style: { borderColor: "rgba(16, 185, 129, 0.38)" },
  },
  error: {
    icon: "⛔",
    style: { borderColor: "rgba(239, 68, 68, 0.4)" },
  },
  info: {
    icon: "ℹ️",
    style: { borderColor: "rgba(14, 165, 233, 0.36)" },
  },
};

function withDescription(message: ReactNode, description?: ReactNode) {
  if (!description) return message;
  return (
    <div className="space-y-0.5">
      <div className="text-sm font-medium leading-tight">{message}</div>
      <div className="text-xs leading-tight text-muted-foreground">{description}</div>
    </div>
  );
}

function splitOptions(options?: AppToastOptions) {
  if (!options) {
    return {
      description: undefined as ReactNode | undefined,
      size: undefined as ToastSize | undefined,
      toastOptions: undefined as ToastOptions | undefined,
    };
  }
  const { description, size, ...toastOptions } = options;
  return { description, size, toastOptions };
}

function resolvePresetOptions(
  tone: ToastTone,
  options?: AppToastOptions
): ToastOptions {
  const { description, size, toastOptions } = splitOptions(options);
  const presetSize: ToastSize = size ?? (description ? "expanded" : "compact");
  const sizePreset = TOAST_SIZE_PRESETS[presetSize];
  const tonePreset = TOAST_TONE_PRESETS[tone];

  return {
    toasterId: APP_TOASTER_ID,
    ...sizePreset,
    ...tonePreset,
    ...toastOptions,
    style: {
      ...TOAST_STYLE_BASE,
      ...sizePreset.style,
      ...tonePreset.style,
      ...(toastOptions?.style ?? {}),
    },
  };
}

export const toast = {
  success(message: ReactNode, options?: AppToastOptions) {
    const { description } = splitOptions(options);
    const presetOptions = resolvePresetOptions("success", options);
    return hotToast.success(withDescription(message, description) as any, presetOptions);
  },
  error(message: ReactNode, options?: AppToastOptions) {
    const { description } = splitOptions(options);
    const presetOptions = resolvePresetOptions("error", options);
    return hotToast.error(withDescription(message, description) as any, presetOptions);
  },
  info(message: ReactNode, options?: AppToastOptions) {
    const { description } = splitOptions(options);
    const presetOptions = resolvePresetOptions("info", options);
    return hotToast(withDescription(message, description) as any, presetOptions);
  },
  custom(renderable: CustomRenderable, options?: ToastOptions) {
    return hotToast.custom(renderable as any, {
      toasterId: APP_TOASTER_ID,
      ...options,
    });
  },
  dismiss(toastId?: string) {
    hotToast.dismiss(toastId);
  },
};
