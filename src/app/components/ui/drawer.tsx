"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "vaul";

import { useTelegramSafeArea } from "@/app/hooks/useTelegramSafeArea";
import { cn } from "./utils";

const OVERLAY_CHROME =
  "fixed inset-0 z-50 bg-overlay-scrim data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";

function Drawer({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  return (
    <DrawerPrimitive.Root
      data-slot="drawer"
      {...props}
      // These MUST come AFTER {...props} so callers cannot override them.
      // Prevents vaul from touching body styles:
      //  • shouldScaleBackground — no scale-down animation on the wrapper
      //  • setBackgroundColorOnScale — no body.style.background = 'black'
      //  • noBodyStyles — disables vaul's Safari position:fixed body hack
      //    that collapses the body and hides the html::before gradient
      shouldScaleBackground={false}
      setBackgroundColorOnScale={false}
      noBodyStyles
    />
  );
}

const DrawerTrigger = DrawerPrimitive.Trigger;
const DrawerPortal = DrawerPrimitive.Portal;
const DrawerClose = DrawerPrimitive.Close;

const DrawerOverlay = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Overlay>
>(function DrawerOverlay({ className, ...props }, ref) {
  return (
    <DrawerPrimitive.Overlay
      ref={ref}
      data-slot="drawer-overlay"
      className={cn(
        OVERLAY_CHROME,
        className,
      )}
      {...props}
    />
  );
});

const DrawerContent = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Content> & {
    overlayClassName?: string;
  }
>(function DrawerContent({
  className,
  children,
  style,
  overlayClassName,
  ...props
}, ref) {
  const { contentSafeAreaInset } = useTelegramSafeArea();
  const bottomInset = contentSafeAreaInset.bottom;

  return (
    <DrawerPortal>
      <DrawerOverlay className={overlayClassName} />
      <DrawerPrimitive.Content
        ref={ref}
        data-slot="drawer-content"
        className={cn(
          "group/drawer-content bg-bg-elevated fixed z-50 flex h-auto flex-col border-border-subtle text-text-primary shadow-[var(--shadow-floating)] !outline-none",
          "data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] !data-[vaul-drawer-direction=top]:rounded-b-xl data-[vaul-drawer-direction=top]:border-b",
          "data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] !data-[vaul-drawer-direction=bottom]:rounded-t-[2rem] data-[vaul-drawer-direction=bottom]:border-t",
          "data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=right]:sm:max-w-sm",
          "data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=left]:sm:max-w-sm",
          className,
        )}
        style={{
          ...style,
          paddingBottom:
            style &&
            typeof style === "object" &&
            "paddingBottom" in style &&
            style.paddingBottom != null
              ? style.paddingBottom
              : `${bottomInset}px`,
        }}
        {...props}
      >
        <div className="bg-border-subtle mx-auto mt-4 hidden h-1.5 w-[92px] shrink-0 rounded-full group-data-[vaul-drawer-direction=bottom]/drawer-content:block" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  );
});

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  );
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

const DrawerTitle = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Title>
>(function DrawerTitle({
  className,
  ...props
}, ref) {
  return (
    <DrawerPrimitive.Title
      ref={ref}
      data-slot="drawer-title"
      className={cn("[font-family:var(--font-heading)] text-xl font-semibold tracking-tight text-text-primary", className)}
      {...props}
    />
  );
});

const DrawerDescription = React.forwardRef<
  React.ElementRef<typeof DrawerPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DrawerPrimitive.Description>
>(function DrawerDescription({
  className,
  ...props
}, ref) {
  return (
    <DrawerPrimitive.Description
      ref={ref}
      data-slot="drawer-description"
      className={cn("text-sm leading-relaxed text-text-secondary", className)}
      {...props}
    />
  );
});

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
};
