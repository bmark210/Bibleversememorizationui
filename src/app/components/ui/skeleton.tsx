'use client'

import { cn } from "./utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-[1rem] border border-border-subtle bg-gradient-to-br from-bg-elevated to-bg-subtle shadow-[var(--shadow-inset)]",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
