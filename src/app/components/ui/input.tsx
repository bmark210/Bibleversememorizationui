'use client'

import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-text-primary placeholder:text-text-muted selection:bg-brand-primary selection:text-brand-primary-foreground border-border-default flex h-11 w-full min-w-0 rounded-2xl border bg-bg-elevated px-4 py-2 text-base text-text-primary shadow-[var(--shadow-inset)] transition-[background-color,border-color,color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "hover:border-brand-primary/25 focus-visible:border-brand-primary focus-visible:ring-[3px] focus-visible:ring-focus-ring",
        "aria-invalid:border-state-error aria-invalid:ring-[3px] aria-invalid:ring-state-error/20",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
