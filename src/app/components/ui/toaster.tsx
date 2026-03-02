"use client";

import { Toaster as HotToaster, type ToasterProps } from "react-hot-toast";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <HotToaster
      position="top-center"
      gutter={8}
      containerStyle={{ zIndex: 9999 }}
      toastOptions={{
        duration: 4000,
        style: {
          background: "var(--popover)",
          color: "var(--popover-foreground)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          boxShadow: "0 10px 28px rgba(0,0,0,0.18)",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };

