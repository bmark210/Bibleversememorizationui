import type {
  Alignment,
  AllowedButtons,
  Driver,
  PopoverDOM,
  Side,
} from "driver.js";
import { triggerHaptic } from "@/app/lib/haptics";
import { ONBOARDING_PRIMARY_VERSE_ID } from "@/app/onboarding/onboardingMockVerseFlow";
import { useVerseSectionTutorialStore } from "./store";
import type { VerseSectionTutorialSource } from "./storage";

export type VerseSectionTutorialPage =
  | "dashboard"
  | "verses"
  | "training"
  | "profile";

export type VerseSectionTutorialElementTarget =
  | string
  | (() => Element | null);

export type VerseSectionTutorialRuntime = {
  source: VerseSectionTutorialSource;
  goNext: () => Promise<void>;
  goPrevious: () => Promise<void>;
  goToStep: (index: number, direction?: 1 | -1) => Promise<void>;
  waitForElement: (
    target?: VerseSectionTutorialElementTarget,
    options?: { timeoutMs?: number },
  ) => Promise<Element | null>;
  waitForCondition: (
    predicate: () => boolean,
    options?: { timeoutMs?: number; signal?: AbortSignal },
  ) => Promise<boolean>;
};

export type VerseSectionTutorialStep = {
  id: string;
  page: VerseSectionTutorialPage;
  title: string;
  description: string;
  element?: VerseSectionTutorialElementTarget;
  side?: Side;
  align?: Alignment;
  disableActiveInteraction?: boolean;
  showButtons?: AllowedButtons[];
  showProgress?: boolean;
  prepare?: (runtime: VerseSectionTutorialRuntime) => void | Promise<void>;
  skipWhen?: (
    runtime: VerseSectionTutorialRuntime,
  ) => boolean | Promise<boolean>;
  onPopoverRender?: (popover: PopoverDOM, driver: Driver) => void;
  onHighlighted?:
    | ((
        runtime: VerseSectionTutorialRuntime,
      ) => void | (() => void) | Promise<void | (() => void)>)
    | undefined;
  autoAction?: (runtime: VerseSectionTutorialRuntime) => Promise<void>;
};

type BuildVerseSectionTutorialStepsOptions = {
  source: VerseSectionTutorialSource;
};

const VERSE_LIST_CONTENT_SELECTOR = "[data-tour='verse-list-content']";
const VERSE_LIST_SCROLLER_SELECTOR = "[data-tour='verse-list-virtualized']";
const PRIMARY_CARD_SELECTOR = "[data-tour='onboarding-mock-primary-verse-card']";
const VERSE_CARD_ADD_BUTTON_SELECTOR = "[data-tour='verse-card-add-button']";
const VERSE_CARD_PROGRESS_BUTTON_SELECTOR =
  "[data-tour='verse-card-progress-button']";
const VERSE_PROGRESS_DRAWER_SELECTOR = "[data-tour='verse-progress-drawer']";
const VERSE_PROGRESS_SUMMARY_SELECTOR = "[data-tour='verse-progress-summary']";
const VERSE_PROGRESS_LEARNING_SELECTOR =
  "[data-tour='verse-progress-phase-learning']";
const VERSE_PROGRESS_REVIEW_SELECTOR =
  "[data-tour='verse-progress-phase-review']";
const VERSE_PROGRESS_MASTERED_SELECTOR =
  "[data-tour='verse-progress-phase-mastered']";
const VERSE_GALLERY_ROOT_SELECTOR = "[data-tour='verse-gallery-root']";
const VERSE_GALLERY_PRIMARY_CTA_SELECTOR =
  "[data-tour='verse-gallery-primary-cta']";

function isElementVisible(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;

  const styles = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return (
    styles.display !== "none" &&
    styles.visibility !== "hidden" &&
    Number(styles.opacity) > 0 &&
    rect.width > 0 &&
    rect.height > 0
  );
}

function queryVisibleElement(selector: string) {
  if (typeof document === "undefined") return null;

  const matches = Array.from(document.querySelectorAll<HTMLElement>(selector));
  return matches.find((element) => isElementVisible(element)) ?? null;
}

async function waitForAnimationFrames(count = 2) {
  for (let index = 0; index < count; index += 1) {
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  }
}

async function scrollElementIntoView(element: HTMLElement) {
  element.scrollIntoView({
    block: "center",
    behavior: "smooth",
  });
  await waitForAnimationFrames(3);
}

function getPrimaryMockVerseCard() {
  return queryVisibleElement(PRIMARY_CARD_SELECTOR);
}

function getPrimaryMockVerseAction(selector: string) {
  const card = getPrimaryMockVerseCard();
  if (!(card instanceof HTMLElement)) return null;

  const action = card.querySelector<HTMLElement>(selector);
  return isElementVisible(action) ? action : null;
}

function getPrimaryMockVerse() {
  return (
    useVerseSectionTutorialStore
      .getState()
      .mockVerses.find(
        (verse) => verse.externalVerseId === ONBOARDING_PRIMARY_VERSE_ID,
      ) ?? null
  );
}

async function scrollVerseListToTop(runtime: VerseSectionTutorialRuntime) {
  const scroller = await runtime.waitForElement(VERSE_LIST_SCROLLER_SELECTOR, {
    timeoutMs: 4000,
  });

  if (!(scroller instanceof HTMLElement)) return;

  if (typeof scroller.scrollTo === "function") {
    scroller.scrollTo({ top: 0, behavior: "smooth" });
  } else {
    scroller.scrollTop = 0;
  }

  await waitForAnimationFrames(3);
}

async function closeVerseOverlays() {
  useVerseSectionTutorialStore.getState().closeAllOverlays();
  await waitForAnimationFrames(3);
}

async function ensureTutorialVerseData(
  runtime: VerseSectionTutorialRuntime,
  options?: {
    closeOverlays?: boolean;
    scrollListToTop?: boolean;
  },
) {
  if (options?.closeOverlays) {
    await closeVerseOverlays();
  }

  await runtime.waitForElement(VERSE_LIST_CONTENT_SELECTOR, {
    timeoutMs: 12000,
  });
  await runtime.waitForCondition(
    () =>
      Boolean(
        resolveVerseSectionTutorialElement(VERSE_LIST_CONTENT_SELECTOR),
      ),
    { timeoutMs: 12000 },
  );

  await runtime.waitForCondition(() => getPrimaryMockVerse() !== null, {
    timeoutMs: 8000,
  });

  if (options?.scrollListToTop) {
    await scrollVerseListToTop(runtime);
  }
}

async function ensureVerseListOverview(runtime: VerseSectionTutorialRuntime) {
  await ensureTutorialVerseData(runtime, {
    closeOverlays: true,
    scrollListToTop: true,
  });
}

async function ensurePrimaryMockVerseCard(runtime: VerseSectionTutorialRuntime) {
  await ensureTutorialVerseData(runtime, {
    closeOverlays: true,
    scrollListToTop: true,
  });

  const card = await runtime.waitForElement(PRIMARY_CARD_SELECTOR, {
    timeoutMs: 8000,
  });
  if (card instanceof HTMLElement) {
    await scrollElementIntoView(card);
  }
}

async function ensureProgressContent(
  runtime: VerseSectionTutorialRuntime,
  targetSelector: string,
) {
  await ensureTutorialVerseData(runtime);

  if (!resolveVerseSectionTutorialElement(VERSE_PROGRESS_DRAWER_SELECTOR)) {
    const targetVerse = getPrimaryMockVerse();
    if (targetVerse) {
      useVerseSectionTutorialStore.getState().openProgressDrawer(targetVerse);
      await waitForAnimationFrames(3);
    }
  }

  await runtime.waitForElement(VERSE_PROGRESS_DRAWER_SELECTOR, {
    timeoutMs: 5000,
  });

  const target = await runtime.waitForElement(targetSelector, {
    timeoutMs: 5000,
  });
  if (target instanceof HTMLElement) {
    await scrollElementIntoView(target);
  }
}

async function ensureVerseGallery(runtime: VerseSectionTutorialRuntime) {
  await ensureTutorialVerseData(runtime);

  if (!resolveVerseSectionTutorialElement(VERSE_GALLERY_ROOT_SELECTOR)) {
    const targetVerse = getPrimaryMockVerse();
    if (targetVerse) {
      useVerseSectionTutorialStore.getState().openGallery(targetVerse);
      await waitForAnimationFrames(3);
    }
  }

  const gallery = await runtime.waitForElement(VERSE_GALLERY_ROOT_SELECTOR, {
    timeoutMs: 5000,
  });
  if (gallery instanceof HTMLElement) {
    await scrollElementIntoView(gallery);
  }
}

async function animateTapAndClick(
  element: HTMLElement,
  options?: {
    delayBefore?: number;
    delayAfter?: number;
    pressDuration?: number;
  },
): Promise<void> {
  const delayBefore = options?.delayBefore ?? 40;
  const delayAfter = options?.delayAfter ?? 90;
  const pressDuration = options?.pressDuration ?? 90;

  await new Promise<void>((resolve) => setTimeout(resolve, delayBefore));

  element.style.transition = `transform ${pressDuration}ms ease`;
  element.style.transform = "scale(0.96)";
  triggerHaptic("light");

  await new Promise<void>((resolve) => setTimeout(resolve, pressDuration));
  element.style.transform = "scale(1)";

  await new Promise<void>((resolve) => setTimeout(resolve, delayAfter));
  element.style.transition = "";
  element.style.transform = "";
}

export function resolveVerseSectionTutorialElement(
  target?: VerseSectionTutorialElementTarget,
) {
  if (!target) return null;
  if (typeof target === "string") return queryVisibleElement(target);
  return target();
}

export function buildVerseSectionTutorialSteps({
  source,
}: BuildVerseSectionTutorialStepsOptions): VerseSectionTutorialStep[] {
  const isReplay = source === "profile";

  return [
    {
      id: "verses-overview",
      page: "verses",
      title: "Раздел «Стихи»",
      description: isReplay
        ? "Повторим только главное: здесь вы добавляете стихи, следите за их путем и открываете подробный просмотр."
        : "Здесь начинается работа со стихами: вы добавляете карточки в обучение и отслеживаете их движение по этапам.",
      element: VERSE_LIST_CONTENT_SELECTOR,
      side: "top",
      align: "center",
      prepare: ensureVerseListOverview,
    },
    {
      id: "verses-card",
      page: "verses",
      title: "Карточка стиха",
      description:
        "Это главная рабочая точка. Здесь видны текст, ссылка и быстрые действия по стиху.",
      element: PRIMARY_CARD_SELECTOR,
      side: "left",
      align: "center",
      prepare: ensurePrimaryMockVerseCard,
    },
    {
      id: "verses-add-card",
      page: "verses",
      title: "Добавить в обучение",
      description:
        "Сначала карточку нужно добавить в обучение. После этого у стиха появится путь прогресса и доступ к тренировке.",
      element: () => getPrimaryMockVerseAction(VERSE_CARD_ADD_BUTTON_SELECTOR),
      side: "left",
      align: "center",
      prepare: async (runtime) => {
        await ensurePrimaryMockVerseCard(runtime);
        const addButton = await runtime.waitForElement(
          () => getPrimaryMockVerseAction(VERSE_CARD_ADD_BUTTON_SELECTOR),
          { timeoutMs: 4000 },
        );
        if (addButton instanceof HTMLElement) {
          await scrollElementIntoView(addButton);
        }
      },
      autoAction: async (runtime) => {
        const addButton = getPrimaryMockVerseAction(VERSE_CARD_ADD_BUTTON_SELECTOR);
        if (addButton instanceof HTMLElement) {
          await animateTapAndClick(addButton);
          useVerseSectionTutorialStore
            .getState()
            .applyVerseAction(ONBOARDING_PRIMARY_VERSE_ID, "add-to-learning");
        }

        await runtime.waitForCondition(
          () =>
            Boolean(
              getPrimaryMockVerseAction(VERSE_CARD_PROGRESS_BUTTON_SELECTOR),
            ),
          { timeoutMs: 4000 },
        );
        await runtime.goNext();
      },
    },
    {
      id: "verses-open-progress",
      page: "verses",
      title: "Открываем путь стиха",
      description:
        "Теперь у карточки есть прогресс. По этой кнопке открывается весь путь стиха от изучения до закрепления.",
      element: () =>
        getPrimaryMockVerseAction(VERSE_CARD_PROGRESS_BUTTON_SELECTOR),
      side: "left",
      align: "center",
      prepare: async (runtime) => {
        await ensurePrimaryMockVerseCard(runtime);
        const progressButton = await runtime.waitForElement(
          () => getPrimaryMockVerseAction(VERSE_CARD_PROGRESS_BUTTON_SELECTOR),
          { timeoutMs: 4000 },
        );
        if (progressButton instanceof HTMLElement) {
          await scrollElementIntoView(progressButton);
        }
      },
      autoAction: async (runtime) => {
        const progressButton = getPrimaryMockVerseAction(
          VERSE_CARD_PROGRESS_BUTTON_SELECTOR,
        );

        if (progressButton instanceof HTMLElement) {
          await animateTapAndClick(progressButton);
        }

        const targetVerse = getPrimaryMockVerse();
        if (targetVerse) {
          useVerseSectionTutorialStore.getState().openProgressDrawer(targetVerse);
        }

        await runtime.waitForElement(VERSE_PROGRESS_SUMMARY_SELECTOR, {
          timeoutMs: 5000,
        });
        await runtime.goNext();
      },
    },
    {
      id: "verses-progress-summary",
      page: "verses",
      title: "Текущее состояние",
      description:
        "В верхнем блоке видно, где стих находится сейчас и насколько далеко он продвинулся.",
      element: VERSE_PROGRESS_SUMMARY_SELECTOR,
      side: "top",
      align: "center",
      prepare: async (runtime) => {
        await ensureProgressContent(runtime, VERSE_PROGRESS_SUMMARY_SELECTOR);
      },
    },
    {
      id: "verses-progress-learning",
      page: "verses",
      title: "Этап изучения",
      description:
        "Сначала стих проходит изучение. Здесь он закрепляется шаг за шагом после первых удачных тренировок.",
      element: VERSE_PROGRESS_LEARNING_SELECTOR,
      side: "top",
      align: "center",
      prepare: async (runtime) => {
        await ensureProgressContent(runtime, VERSE_PROGRESS_LEARNING_SELECTOR);
      },
    },
    {
      id: "verses-progress-review",
      page: "verses",
      title: "Этап повторения",
      description:
        "После изучения стих переходит в повторение. Здесь приложение возвращает его в нужный момент, чтобы не забыть.",
      element: VERSE_PROGRESS_REVIEW_SELECTOR,
      side: "top",
      align: "center",
      prepare: async (runtime) => {
        await ensureProgressContent(runtime, VERSE_PROGRESS_REVIEW_SELECTOR);
      },
    },
    {
      id: "verses-progress-mastered",
      page: "verses",
      title: "Этап закрепления",
      description:
        "Финальная точка пути. Сюда попадают стихи, которые уже стабильно вспоминаются и требуют только поддержания.",
      element: VERSE_PROGRESS_MASTERED_SELECTOR,
      side: "top",
      align: "center",
      prepare: async (runtime) => {
        await ensureProgressContent(runtime, VERSE_PROGRESS_MASTERED_SELECTOR);
      },
    },
    {
      id: "verses-return-to-card",
      page: "verses",
      title: "Снова к карточке",
      description:
        "Вернемся к списку. Обычно именно отсюда вы быстро открываете путь стиха или полный просмотр.",
      element: PRIMARY_CARD_SELECTOR,
      side: "left",
      align: "center",
      prepare: async (runtime) => {
        await closeVerseOverlays();
        await ensurePrimaryMockVerseCard(runtime);
      },
    },
    {
      id: "verses-open-gallery",
      page: "verses",
      title: "Открываем подробный просмотр",
      description:
        "По нажатию на карточку открывается полный экран со стихом и всеми основными действиями по нему.",
      element: PRIMARY_CARD_SELECTOR,
      side: "left",
      align: "center",
      prepare: ensurePrimaryMockVerseCard,
      autoAction: async (runtime) => {
        const card = await runtime.waitForElement(PRIMARY_CARD_SELECTOR, {
          timeoutMs: 4000,
        });
        if (card instanceof HTMLElement) {
          await animateTapAndClick(card, { pressDuration: 110, delayAfter: 120 });
        }

        const targetVerse = getPrimaryMockVerse();
        if (targetVerse) {
          useVerseSectionTutorialStore.getState().openGallery(targetVerse);
        }

        await runtime.waitForElement(VERSE_GALLERY_ROOT_SELECTOR, {
          timeoutMs: 5000,
        });
        await runtime.goNext();
      },
    },
    {
      id: "gallery-overview",
      page: "verses",
      title: "Полный экран стиха",
      description:
        "Здесь собраны расширенный просмотр стиха, прогресс и основные действия по выбранной карточке.",
      element: VERSE_GALLERY_ROOT_SELECTOR,
      side: "top",
      align: "center",
      prepare: ensureVerseGallery,
    },
    {
      id: "gallery-training-cta",
      page: "verses",
      title: "Отсюда запускается тренировка",
      description:
        "Когда захотите перейти к практике по конкретному стиху, запуск начинается с этой кнопки. Отдельное обучение по тренировке будет позже.",
      element: VERSE_GALLERY_PRIMARY_CTA_SELECTOR,
      side: "top",
      align: "center",
      prepare: async (runtime) => {
        await ensureVerseGallery(runtime);
        const cta = await runtime.waitForElement(VERSE_GALLERY_PRIMARY_CTA_SELECTOR, {
          timeoutMs: 5000,
        });
        if (cta instanceof HTMLElement) {
          await scrollElementIntoView(cta);
        }
      },
    },
    {
      id: "verse-section-tutorial-finish",
      page: "verses",
      title: "Обучение завершено",
      description:
        "Теперь у вас есть основная схема: добавляете стих, смотрите его путь и при необходимости переходите в подробный просмотр, чтобы оттуда запускать тренировку.",
      side: "over",
      align: "center",
    },
  ];
}
