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
          "--normal-bg":
            "linear-gradient(140deg, color-mix(in srgb, var(--card) 92%, var(--primary) 8%) 0%, color-mix(in srgb, var(--background) 90%, var(--accent) 10%) 100%)",
          "--normal-border": "color-mix(in srgb, var(--border) 78%, var(--primary) 22%)",
          "--normal-text": "var(--foreground)",
          "--success-bg":
            "linear-gradient(140deg, color-mix(in srgb, var(--success) 28%, var(--card) 72%) 0%, color-mix(in srgb, var(--background) 86%, var(--success) 14%) 100%)",
          "--success-border": "color-mix(in srgb, var(--success) 58%, var(--border) 42%)",
          "--success-text": "color-mix(in srgb, var(--success) 72%, var(--foreground) 28%)",
          "--error-bg":
            "linear-gradient(140deg, color-mix(in srgb, var(--destructive) 24%, var(--card) 76%) 0%, color-mix(in srgb, var(--background) 86%, var(--destructive) 14%) 100%)",
          "--error-border": "color-mix(in srgb, var(--destructive) 54%, var(--border) 46%)",
          "--error-text": "color-mix(in srgb, var(--destructive) 76%, var(--foreground) 24%)",
          "--info-bg":
            "linear-gradient(140deg, color-mix(in srgb, var(--accent) 24%, var(--card) 76%) 0%, color-mix(in srgb, var(--background) 84%, var(--primary) 16%) 100%)",
          "--info-border": "color-mix(in srgb, var(--accent) 55%, var(--border) 45%)",
          "--info-text": "color-mix(in srgb, var(--foreground) 78%, var(--primary) 22%)",
          "--warning-bg":
            "linear-gradient(140deg, color-mix(in srgb, var(--primary) 27%, var(--card) 73%) 0%, color-mix(in srgb, var(--background) 82%, var(--accent) 18%) 100%)",
          "--warning-border": "color-mix(in srgb, var(--primary) 56%, var(--border) 44%)",
          "--warning-text": "color-mix(in srgb, var(--foreground) 72%, var(--primary) 28%)",
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
