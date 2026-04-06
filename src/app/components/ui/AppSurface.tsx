"use client";

import * as React from "react";
import { SURFACE_PAD } from "@/app/components/ui/responsiveTokens";
import { cn } from "./utils";
import { Card } from "./card";

export function AppSurface({
  className,
  ...props
}: React.ComponentProps<typeof Card>) {
  return (
    <Card
      className={cn(
        "gap-0 min-h-0 rounded-[1.55rem] border-border-subtle bg-bg-overlay shadow-[var(--shadow-soft)] backdrop-blur-2xl sm:rounded-[1.8rem]",
        SURFACE_PAD,
        className,
      )}
      {...props}
    />
  );
}
