"use client";

import { Toaster as SonnerToaster } from "sonner";
import type { ToasterProps } from "sonner";
import { APP_TOASTER_ID } from "@/app/lib/toast";

const Toaster = ({ id = APP_TOASTER_ID, ...props }: ToasterProps) => {
  return (
    <SonnerToaster
      id={id}
      position="top-center"
      richColors
      closeButton
      gap={8}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-border": "var(--border)",
          "--normal-text": "var(--popover-foreground)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "rounded-xl! shadow-lg! backdrop-blur!",
          description: "text-xs! leading-tight!",
          closeButton: "rounded-lg!",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
