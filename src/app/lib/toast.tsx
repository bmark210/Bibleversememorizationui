"use client";

import type { ReactNode } from "react";
import {
  toast as hotToast,
  type Toast,
  type ToastOptions,
} from "react-hot-toast";

export type AppToastOptions = ToastOptions & {
  description?: ReactNode;
};

type CustomRenderable = ReactNode | ((t: Toast) => ReactNode);

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
      toastOptions: undefined as ToastOptions | undefined,
    };
  }
  const { description, ...toastOptions } = options;
  return { description, toastOptions };
}

export const toast = {
  success(message: ReactNode, options?: AppToastOptions) {
    const { description, toastOptions } = splitOptions(options);
    return hotToast.success(withDescription(message, description) as any, toastOptions);
  },
  error(message: ReactNode, options?: AppToastOptions) {
    const { description, toastOptions } = splitOptions(options);
    return hotToast.error(withDescription(message, description) as any, toastOptions);
  },
  info(message: ReactNode, options?: AppToastOptions) {
    const { description, toastOptions } = splitOptions(options);
    return hotToast(withDescription(message, description) as any, {
      icon: "ℹ️",
      ...toastOptions,
    });
  },
  custom(renderable: CustomRenderable, options?: ToastOptions) {
    return hotToast.custom(renderable as any, options);
  },
  dismiss(toastId?: string) {
    hotToast.dismiss(toastId);
  },
};
