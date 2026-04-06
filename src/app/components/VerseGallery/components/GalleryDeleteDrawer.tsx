import React from "react";
import { VerseDeleteDrawer } from "@/app/components/VerseDeleteDrawer";

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
    <VerseDeleteDrawer
      open={open}
      isActionPending={isActionPending}
      onOpenChange={onOpenChange}
      onConfirm={onConfirm}
    />
  );
});
