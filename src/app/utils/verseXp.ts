export function buildVerseDeletionFeedback(params: {
  resetToCatalog?: boolean;
}) {
  const title = params.resetToCatalog ? "Сброшено в каталог" : "Стих удалён";
  const description = params.resetToCatalog
    ? "Стих убран из коллекции и снова доступен в каталоге."
    : "Стих убран из коллекции. Накопленный рейтинг сохранён.";

  return {
    title,
    description,
  };
}
