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
          "--normal-bg": "var(--toast-normal-bg)",
          "--normal-border": "var(--toast-normal-border)",
          "--normal-text": "var(--toast-normal-text)",
          "--success-bg": "var(--toast-success-bg)",
          "--success-border": "var(--toast-success-border)",
          "--success-text": "var(--toast-success-text)",
          "--error-bg": "var(--toast-error-bg)",
          "--error-border": "var(--toast-error-border)",
          "--error-text": "var(--toast-error-text)",
          "--info-bg": "var(--toast-info-bg)",
          "--info-border": "var(--toast-info-border)",
          "--info-text": "var(--toast-info-text)",
          "--warning-bg": "var(--toast-warning-bg)",
          "--warning-border": "var(--toast-warning-border)",
          "--warning-text": "var(--toast-warning-text)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "relative rounded-[1.1rem]! border! px-4! pb-3! !mt-20 backdrop-blur-xl! shadow-[0_24px_50px_-24px_rgba(34,24,14,0.6)]!",
          title: "text-[0.94rem]! leading-tight! font-semibold!",
          description: "mt-0.5 text-[0.78rem]! leading-relaxed!",
          content: "gap-1.5!",
          icon: "opacity-95!",
          closeButton:
            "rounded-full! border border-border/70! bg-background/80! text-foreground/80! backdrop-blur-md! transition-colors !",
          default: "shadow-[0_18px_42px_-24px_rgba(139,105,20,0.72)]!",
          success: "shadow-[0_18px_42px_-24px_rgba(22,163,74,0.75)]!",
          info: "shadow-[0_18px_42px_-24px_rgba(180,131,59,0.7)]!",
          warning: "shadow-[0_18px_42px_-24px_rgba(202,138,4,0.75)]!",
          error: "shadow-[0_18px_42px_-24px_rgba(220,38,38,0.75)]!",
          actionButton:
            "rounded-lg! border border-border/60! bg-background/70! text-foreground! ",
          cancelButton:
            "rounded-lg! border border-border/60! bg-background/70! text-muted-foreground! ",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
