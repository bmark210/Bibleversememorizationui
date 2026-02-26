'use client'

import { cn } from "./utils";

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        "animate-pulse rounded-md border border-border/35 bg-gradient-to-br from-card/75 to-card/55",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
