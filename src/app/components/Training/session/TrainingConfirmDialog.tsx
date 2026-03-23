"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";

const DIALOG_CONTENT_CLASS =
  "rounded-3xl border border-border/60 bg-background/95 shadow-2xl backdrop-blur-xl";
const DIALOG_CANCEL_CLASS =
  "rounded-full border border-border/60 bg-muted/35 text-foreground/70";
const DIALOG_PRIMARY_CLASS =
  "rounded-full border border-border/60 bg-primary/80 text-primary-foreground hover:bg-primary/90";
const DIALOG_DESTRUCTIVE_CLASS =
  "rounded-full border border-border/60 bg-destructive text-background hover:bg-destructive/90 dark:text-destructive-foreground/80";

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
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel();
        onOpenChange(nextOpen);
      }}
    >
      <AlertDialogContent className={DIALOG_CONTENT_CLASS}>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base text-foreground/90">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-muted-foreground/90">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            className={DIALOG_CANCEL_CLASS}
            onClick={onCancel}
          >
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            className={
              variant === "destructive"
                ? DIALOG_DESTRUCTIVE_CLASS
                : DIALOG_PRIMARY_CLASS
            }
            onClick={onConfirm}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
