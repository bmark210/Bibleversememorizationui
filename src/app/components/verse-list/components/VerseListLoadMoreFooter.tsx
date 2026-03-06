type VerseListLoadMoreFooterProps = {
  visible: boolean;
  isFetchingMore: boolean;
  showDelayedLoadMoreSkeleton: boolean;
  loadMoreError: string | null;
  hasMoreVerses: boolean;
  versesLength: number;
  onRetryLoadMore: () => void;
};

export function VerseListLoadMoreFooter({
  visible,
  isFetchingMore: _isFetchingMore,
  showDelayedLoadMoreSkeleton: _showDelayedLoadMoreSkeleton,
  loadMoreError: _loadMoreError,
  hasMoreVerses: _hasMoreVerses,
  versesLength: _versesLength,
  onRetryLoadMore: _onRetryLoadMore,
}: VerseListLoadMoreFooterProps) {
  if (!visible) return null;

  return (
    null
    // <div className="space-y-3">
    //   <div className="flex justify-center mt-4">
    //     {isFetchingMore ? null : loadMoreError ? (
    //       <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={onRetryLoadMore}>
    //         Повторить загрузку
    //       </Button>
    //     ) : !hasMoreVerses && versesLength > 0 ? (
    //       <Badge variant="outline" className="rounded-full px-3 py-1 text-muted-foreground">
    //         Все стихи загружены
    //       </Badge>
    //     ) : null}
    //   </div>
    // </div>
  );
}
