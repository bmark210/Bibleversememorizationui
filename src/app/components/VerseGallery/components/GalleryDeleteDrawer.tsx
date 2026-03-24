import React from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/app/components/ui/drawer";
import { Button } from "@/app/components/ui/button";

type Props = {
  open: boolean;
  isActionPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

export const GalleryDeleteDrawer = React.memo(function GalleryDeleteDrawer({
  open,
  isActionPending,
  onOpenChange,
  onConfirm,
}: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="pb-1">
          <DrawerTitle className="text-base text-foreground/90">
            Удалить стих?
          </DrawerTitle>
          <DrawerDescription className="text-sm text-muted-foreground/80">
            Это действие нельзя отменить. Стих будет удалён из вашей коллекции.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="flex-row gap-3 pt-2">
          <DrawerClose asChild>
            <Button
              variant="outline"
              className="h-12 flex-1 rounded-2xl border-border/60 bg-muted/35 text-sm font-medium text-foreground/70"
            >
              Отмена
            </Button>
          </DrawerClose>
          <Button
            className="h-12 flex-1 rounded-2xl border border-rose-500/25 bg-rose-500/[0.06] text-sm font-semibold text-rose-800 shadow-sm hover:bg-rose-500/[0.12] dark:text-rose-200"
            disabled={isActionPending}
            onClick={onConfirm}
          >
            Удалить
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
});
