import assert from "node:assert/strict";
import test from "node:test";
import { buildVerseDeletionXpFeedback } from "./verseXp";

test("buildVerseDeletionXpFeedback shows XP decrease when verse had progress", () => {
  const feedback = buildVerseDeletionXpFeedback({
    xpLoss: 187,
  });

  assert.equal(feedback.title, "Стих удалён");
  assert.equal(
    feedback.description,
    "Рейтинг обновлён на сервере: −187 XP."
  );
});

test("buildVerseDeletionXpFeedback reports unchanged XP when verse had no progress", () => {
  const feedback = buildVerseDeletionXpFeedback({
    xpLoss: 0,
    resetToCatalog: true,
  });

  assert.equal(feedback.title, "Сброшено в каталог");
  assert.equal(
    feedback.description,
    "Удаление прошло успешно. Суммарный XP не изменился."
  );
});
