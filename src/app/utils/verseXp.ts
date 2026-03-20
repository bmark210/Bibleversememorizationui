const xpNumberFormatter = new Intl.NumberFormat("ru-RU");

export function buildVerseDeletionXpFeedback(params: {
  xpLoss: number;
  resetToCatalog?: boolean;
}) {
  const title = params.resetToCatalog ? "Сброшено в каталог" : "Стих удалён";
  const formatted = xpNumberFormatter.format(
    Math.max(0, Math.round(params.xpLoss))
  );
  const description =
    params.xpLoss > 0
      ? `Рейтинг обновлён на сервере: −${formatted} XP.`
      : "Удаление прошло успешно. Суммарный XP не изменился.";

  return {
    title,
    description,
  };
}
