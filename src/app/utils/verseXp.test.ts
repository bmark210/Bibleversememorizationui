import assert from "node:assert/strict";
import test from "node:test";
import { buildVerseDeletionFeedback } from "./verseXp";

test("buildVerseDeletionFeedback keeps rating when verse is removed", () => {
  const feedback = buildVerseDeletionFeedback({});

  assert.equal(feedback.title, "Стих удалён");
  assert.equal(
    feedback.description,
    "Стих убран из коллекции. Накопленный рейтинг сохранён."
  );
});

test("buildVerseDeletionFeedback describes catalog reset without XP messaging", () => {
  const feedback = buildVerseDeletionFeedback({
    resetToCatalog: true,
  });

  assert.equal(feedback.title, "Сброшено в каталог");
  assert.equal(
    feedback.description,
    "Стих убран из коллекции и снова доступен в каталоге."
  );
});
