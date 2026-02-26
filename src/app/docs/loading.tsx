export default function Loading() {
  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="space-y-2">
          <div className="h-9 w-64 rounded-xl bg-muted/45 dark:bg-muted/30 animate-pulse" />
          <div className="h-4 w-80 max-w-full rounded-lg bg-muted/40 dark:bg-muted/25 animate-pulse" />
        </div>

        <div className="rounded-2xl border border-border/70 p-5 sm:p-6 bg-card/50">
          <div className="space-y-3">
            <div className="h-5 w-52 rounded-lg bg-muted/45 dark:bg-muted/30 animate-pulse" />
            <div className="h-4 w-full rounded bg-muted/40 dark:bg-muted/25 animate-pulse" />
            <div className="h-4 w-11/12 rounded bg-muted/40 dark:bg-muted/25 animate-pulse" />
            <div className="h-4 w-4/5 rounded bg-muted/40 dark:bg-muted/25 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
