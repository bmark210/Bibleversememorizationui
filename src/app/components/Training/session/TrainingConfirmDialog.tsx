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
import {
  TRAINING_ACTION_BUTTON_MEDIUM_CLASS,
  TRAINING_ACTION_ROW_PADDING_CLASS,
} from "@/app/components/training-session/trainingActionTokens";

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
          <DrawerTitle className="text-base text-text-primary">
            {title}
          </DrawerTitle>
          <DrawerDescription className="text-sm text-text-secondary">
            {description}
          </DrawerDescription>
        </DrawerHeader>

        <DrawerFooter className={`flex-row gap-3 pt-2 ${TRAINING_ACTION_ROW_PADDING_CLASS}`}>
          <DrawerClose asChild>
            <Button
              variant="outline"
              className={`flex-1 border-border-subtle bg-bg-subtle text-text-secondary hover:border-brand-primary/20 hover:bg-bg-elevated hover:text-brand-primary ${TRAINING_ACTION_BUTTON_MEDIUM_CLASS}`}
              onClick={onCancel}
            >
              {cancelLabel}
            </Button>
          </DrawerClose>
          <Button
            className={cn(
              `flex-1 border ${TRAINING_ACTION_BUTTON_MEDIUM_CLASS}`,
              variant === "destructive"
                ? "border-status-paused/25 bg-status-paused-soft text-status-paused shadow-[var(--shadow-soft)] hover:border-status-paused/35 hover:bg-status-paused-soft"
                : "border-brand-primary bg-brand-primary text-brand-primary-foreground hover:border-brand-primary-hover hover:bg-brand-primary-hover",
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
