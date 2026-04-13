'use client'

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { triggerHaptic, type HapticStyle } from "@/app/lib/haptics";
import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border text-sm font-medium tracking-[-0.01em] transition-[background-color,border-color,color,box-shadow,transform] duration-200 disabled:pointer-events-none disabled:opacity-45 disabled:saturate-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-focus-ring aria-invalid:border-state-error aria-invalid:ring-[3px] aria-invalid:ring-state-error/20",
  {
    variants: {
      variant: {
        default:
          "border-brand-primary bg-brand-primary text-brand-primary-foreground shadow-[var(--shadow-soft)] hover:bg-brand-primary-hover hover:border-brand-primary-hover active:bg-brand-primary-active active:border-brand-primary-active",
        destructive:
          "border-state-error bg-state-error text-text-inverse shadow-[var(--shadow-soft)] hover:bg-state-error/90 hover:border-state-error active:translate-y-[1px]",
        outline:
          "border-border-default bg-bg-elevated text-text-primary shadow-[var(--shadow-soft)] hover:border-brand-primary/30 hover:bg-bg-surface hover:text-brand-primary",
        secondary:
          "border-border-subtle bg-bg-subtle text-text-primary shadow-[var(--shadow-soft)] hover:border-brand-secondary/35 hover:bg-brand-secondary/10 hover:text-text-primary",
        ghost:
          "border-transparent bg-transparent text-text-secondary shadow-none hover:bg-interactive-hover hover:text-text-primary",
        link: "border-transparent bg-transparent px-0 text-brand-primary underline-offset-4 shadow-none hover:text-brand-primary-hover hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2 has-[>svg]:px-3",
        sm: "h-9 gap-1.5 rounded-lg px-3.5 has-[>svg]:px-3",
        lg: "h-11 rounded-2xl px-6 has-[>svg]:px-4",
        icon: "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    haptic?: HapticStyle | false;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      haptic = "light",
      onClick,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
      onClick?.(event as React.MouseEvent<HTMLButtonElement>);

      const isAriaDisabled =
        event.currentTarget.getAttribute("aria-disabled") === "true";
      if (haptic && !isAriaDisabled && !event.defaultPrevented) {
        triggerHaptic(haptic);
      }

      if (event.currentTarget instanceof HTMLElement) {
        event.currentTarget.blur();
      }
    };

    return (
      <Comp
        ref={ref}
        data-slot="button"
        data-haptic-managed="true"
        className={cn(
          buttonVariants({ variant, size, className }),
          "focus:outline-none focus:ring-offset-0"
        )}
        onClick={handleClick}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
