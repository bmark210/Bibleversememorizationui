import { Verse } from '@/app/App';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';

export function ConfirmDeleteModal({
  verse,
  open,
  onOpenChange,
  onConfirm,
  isSubmitting,
}: {
  verse: Verse | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
  isSubmitting: boolean;
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Удалить стих?</AlertDialogTitle>
          <AlertDialogDescription>
            Стих будет удалён из вашего списка. Прогресс будет потерян.
            {verse ? ` (${verse.reference})` : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting} className="rounded-full border border-border/60 bg-muted/35 text-foreground/90">Отмена</AlertDialogCancel>
          <AlertDialogAction
            disabled={isSubmitting}
            className=" rounded-full border border-border/60 bg-muted/35 text-foreground/90"
            onClick={(e) => {
              e.preventDefault();
              void onConfirm();
            }}
          >
            {isSubmitting ? 'Удаление...' : 'Удалить'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

