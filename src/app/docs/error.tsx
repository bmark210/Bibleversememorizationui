"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-background/80 p-6 shadow-xl backdrop-blur">
        <div className="text-lg font-semibold">Не удалось загрузить документацию</div>
        <div className="mt-2 text-sm text-muted-foreground">
          Проверьте соединение и попробуйте ещё раз.
        </div>
        <button
          type="button"
          className="mt-5 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          onClick={reset}
        >
          Повторить
        </button>
      </div>
    </div>
  );
}

