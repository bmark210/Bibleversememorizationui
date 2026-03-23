"use client";

import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
  DrawerClose,
} from "@/app/components/ui/drawer";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";

type TrainingConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  cancelLabel?: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  variant?: "destructive" | "primary";
};

export function TrainingConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  cancelLabel = "Остаться",
  confirmLabel,
  onCancel,
  onConfirm,
  variant = "destructive",
}: TrainingConfirmDialogProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
        onOpenChange(nextOpen);
      }}
    >
      <DrawerContent>
        <DrawerHeader className="pb-1">
          <DrawerTitle className="text-base text-foreground/90">
            {title}
          </DrawerTitle>
          <DrawerDescription className="text-sm text-muted-foreground/80">
            {description}
          </DrawerDescription>
        </DrawerHeader>

        <DrawerFooter className="flex-row gap-3 pt-2">
          <DrawerClose asChild>
            <Button
              variant="outline"
              className="flex-1 h-12 rounded-2xl border-border/60 bg-muted/35 text-sm font-medium text-foreground/70"
              onClick={onCancel}
            >
              {cancelLabel}
            </Button>
          </DrawerClose>
          <Button
            className={cn(
              "flex-1 h-12 rounded-2xl border text-sm font-medium",
              variant === "destructive"
                ? "border-rose-500/25 bg-rose-500/[0.06] text-rose-800 shadow-sm hover:bg-rose-500/[0.12] dark:text-rose-200"
                : "border-primary/30 bg-primary/85 text-primary-foreground hover:bg-primary/90",
            )}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
