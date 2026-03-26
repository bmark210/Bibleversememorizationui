'use client'

import * as React from "react";

import { cn } from "./utils";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        data-slot="textarea"
        className={cn(
          "resize-none flex field-sizing-content min-h-24 w-full rounded-[1.4rem] border border-border-default bg-bg-elevated px-4 py-3 text-base text-text-primary shadow-[var(--shadow-inset)] transition-[background-color,border-color,color,box-shadow] outline-none placeholder:text-text-muted hover:border-brand-primary/25 focus-visible:border-brand-primary focus-visible:ring-[3px] focus-visible:ring-focus-ring aria-invalid:border-state-error aria-invalid:ring-[3px] aria-invalid:ring-state-error/20 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export { Textarea };
