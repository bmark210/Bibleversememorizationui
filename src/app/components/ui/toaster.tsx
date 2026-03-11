"use client";

import { Toaster as SonnerToaster } from "sonner";
import type { ToasterProps } from "sonner";
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
  return (
    <SonnerToaster
      id={id}
      position={position}
      theme="system"
      closeButton={false}
      visibleToasts={visibleToasts}
      gap={gap}
      offset={offset}
      mobileOffset={mobileOffset}
      toastOptions={{
        ...toastOptions,
        unstyled: true,
      }}
      {...props}
    />
  );
};

export { Toaster };
