import React from "react";
import { createPortal } from "react-dom";
import { Toaster } from "@/app/components/ui/toaster";
import { GALLERY_TOASTER_ID } from "@/app/lib/toast";

type Props = {
  topOffsetPx: number;
};

export const GalleryToasterPortal = React.memo(function GalleryToasterPortal({
  topOffsetPx,
}: Props) {
  if (typeof document === "undefined") return null;

  return createPortal(
    <Toaster
      id={GALLERY_TOASTER_ID}
      offset={{ top: `${Math.max(0, topOffsetPx)}px` }}
    />,
    document.body
  );
});
