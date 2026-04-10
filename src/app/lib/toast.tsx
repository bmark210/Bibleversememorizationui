"use client";

import {
  isValidElement,
  type CSSProperties,
  type ReactNode,
} from "react";
import { toast as sonner, type ExternalToast } from "sonner";

export const APP_TOASTER_ID = "app";
export const GALLERY_TOASTER_ID = "gallery";
export const TOAST_TOP_OFFSET_PX = 60;

type ToastSize = "compact" | "expanded";
type AppToastTone = "success" | "error" | "info" | "warning";

export type AppToastOptions = {
  description?: ReactNode;
  label?: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
  size?: ToastSize;
  toasterId?: string;
  duration?: number;
  id?: string | number;
  closeButton?: boolean;
  richColors?: boolean;
  className?: string;
  style?: CSSProperties;
};

const SIZE_DURATION: Record<ToastSize, number> = {
  compact: 3200,
  expanded: 5200,
};

const DEFAULT_LABEL_BY_TOASTER_ID: Partial<Record<string, string>> = {};

function resolveDuration(options?: AppToastOptions): number | undefined {
  if (options?.duration != null) return options.duration;
  if (options?.size) return SIZE_DURATION[options.size];
  if (options?.description || options?.meta) {
    return SIZE_DURATION.expanded;
  }
  return SIZE_DURATION.compact;
}

function resolveLabel(options?: AppToastOptions): ReactNode | null {
  if (options?.label) return options.label;
  const toasterId = options?.toasterId ?? APP_TOASTER_ID;
  return DEFAULT_LABEL_BY_TOASTER_ID[toasterId] ?? null;
}

function renderToastTitle(message: ReactNode, label: ReactNode | null) {
  if (!label) return message;

  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] opacity-60">
        {label}
      </p>
      <div>{message}</div>
    </div>
  );
}

function renderToastDescription(
  description?: ReactNode,
  meta?: ReactNode
): ReactNode | undefined {
  if (!description && !meta) return undefined;

  const metaNode =
    meta == null
      ? null
      : isValidElement(meta)
        ? meta
        : (
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-75">
              {meta}
            </div>
          );

  return (
    <div className="space-y-0.5 pt-0.5">
      {description ? <div>{description}</div> : null}
      {metaNode}
    </div>
  );
}

function showToast(
  tone: AppToastTone,
  message: ReactNode,
  options?: AppToastOptions
) {
  const label = resolveLabel(options);
  const data: ExternalToast = {
    id: options?.id,
    toasterId: options?.toasterId ?? APP_TOASTER_ID,
    duration: resolveDuration(options),
    closeButton: options?.closeButton ?? false,
    icon: options?.icon,
    richColors: options?.richColors,
    className: options?.className,
    style: options?.style,
    description: renderToastDescription(options?.description, options?.meta),
  };

  const title = renderToastTitle(message, label);

  switch (tone) {
    case "success":
      return sonner.success(title, data);
    case "error":
      return sonner.error(title, data);
    case "warning":
      return sonner.warning(title, data);
    case "info":
    default:
      return sonner.info(title, data);
  }
}

export const toast = {
  success(message: ReactNode, options?: AppToastOptions) {
    return showToast("success", message, options);
  },
  error(message: ReactNode, options?: AppToastOptions) {
    return showToast("error", message, options);
  },
  info(message: ReactNode, options?: AppToastOptions) {
    return showToast("info", message, options);
  },
  warning(message: ReactNode, options?: AppToastOptions) {
    return showToast("warning", message, options);
  },
  loading(message: ReactNode, options?: AppToastOptions) {
    const label = resolveLabel(options);
    const data: ExternalToast = {
      id: options?.id,
      toasterId: options?.toasterId ?? APP_TOASTER_ID,
      duration: options?.duration ?? Infinity,
      closeButton: options?.closeButton ?? false,
      icon: options?.icon,
      className: options?.className,
      style: options?.style,
      description: renderToastDescription(options?.description, options?.meta),
    };
    return sonner.loading(renderToastTitle(message, label), data);
  },
  dismiss(toastId?: string | number) {
    sonner.dismiss(toastId);
  },
};
