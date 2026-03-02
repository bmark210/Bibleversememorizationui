"use client";

import type { ReactNode } from "react";
import { toast as sonner } from "sonner";

export const APP_TOASTER_ID = "app";
export const GALLERY_TOASTER_ID = "gallery";

type ToastSize = "compact" | "expanded";

export type AppToastOptions = {
  description?: ReactNode;
  size?: ToastSize;
  toasterId?: string;
  duration?: number;
  id?: string;
};

const SIZE_DURATION: Record<ToastSize, number> = {
  compact: 3200,
  expanded: 5200,
};

function resolveDuration(options?: AppToastOptions): number | undefined {
  if (options?.duration != null) return options.duration;
  if (options?.size) return SIZE_DURATION[options.size];
  return undefined;
}

export const toast = {
  success(message: ReactNode, options?: AppToastOptions) {
    return sonner.success(message as string, {
      description: options?.description as ReactNode,
      duration: resolveDuration(options),
      id: options?.id,
      toasterId: options?.toasterId ?? APP_TOASTER_ID,
    });
  },
  error(message: ReactNode, options?: AppToastOptions) {
    return sonner.error(message as string, {
      description: options?.description as ReactNode,
      duration: resolveDuration(options),
      id: options?.id,
      toasterId: options?.toasterId ?? APP_TOASTER_ID,
    });
  },
  info(message: ReactNode, options?: AppToastOptions) {
    return sonner(message as string, {
      description: options?.description as ReactNode,
      duration: resolveDuration(options),
      id: options?.id,
      toasterId: options?.toasterId ?? APP_TOASTER_ID,
    });
  },
  dismiss(toastId?: string | number) {
    sonner.dismiss(toastId);
  },
};
