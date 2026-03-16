import type {
  Alignment,
  AllowedButtons,
  Driver,
  PopoverDOM,
  Side,
} from "driver.js";
import type { OnboardingSource } from "./onboardingStorage";
import { triggerHaptic } from "@/app/lib/haptics";
import { ONBOARDING_PRIMARY_VERSE_ID } from "./onboardingMockVerseFlow";
import { useOnboardingStore } from "./onboardingStore";

export type OnboardingPage = "dashboard" | "verses" | "training" | "profile";

export type StepElementTarget = string | (() => Element | null);

export type AppOnboardingRuntime = {
  source: OnboardingSource;
  goNext: () => Promise<void>;
  goPrevious: () => Promise<void>;
  goToStep: (index: number, direction?: 1 | -1) => Promise<void>;
  waitForElement: (
    target?: StepElementTarget,
    options?: { timeoutMs?: number },
  ) => Promise<Element | null>;
  waitForCondition: (
    predicate: () => boolean,
    options?: { timeoutMs?: number; signal?: AbortSignal },
  ) => Promise<boolean>;
};

export type AppOnboardingStep = {
  id: string;
  page: OnboardingPage;
  title: string;
  description: string;
  element?: StepElementTarget;
  side?: Side;
  align?: Alignment;
  disableActiveInteraction?: boolean;
  showButtons?: AllowedButtons[];
  showProgress?: boolean;
  prepare?: (runtime: AppOnboardingRuntime) => void | Promise<void>;
  skipWhen?: (runtime: AppOnboardingRuntime) => boolean | Promise<boolean>;
  onPopoverRender?: (popover: PopoverDOM, driver: Driver) => void;
  onHighlighted?:
    | ((
        runtime: AppOnboardingRuntime,
      ) => void | (() => void) | Promise<void | (() => void)>)
    | undefined;
  autoAction?: (runtime: AppOnboardingRuntime) => Promise<void>;
};

type BuildOnboardingStepsOptions = {
  source: OnboardingSource;
};

const APP_NAV_SELECTOR = "[data-tour='app-nav']";
const VERSE_LIST_CONTENT_SELECTOR = "[data-tour='verse-list-content']";
const VERSE_LIST_SCROLLER_SELECTOR = "[data-tour='verse-list-virtualized']";
const ONBOARDING_PRIMARY_CARD_SELECTOR =
  "[data-tour='onboarding-mock-primary-verse-card']";
const VERSE_CARD_ADD_BUTTON_SELECTOR = "[data-tour='verse-card-add-button']";
const VERSE_CARD_PROGRESS_BUTTON_SELECTOR =
  "[data-tour='verse-card-progress-button']";
const VERSE_PROGRESS_DRAWER_SELECTOR = "[data-tour='verse-progress-drawer']";
const VERSE_PROGRESS_SUMMARY_SELECTOR = "[data-tour='verse-progress-summary']";
const TRAINING_SCENARIO_CORE_SELECTOR = "[data-tour='training-scenario-core']";
const TRAINING_CORE_PRESETS_SELECTOR = "[data-tour='training-core-presets']";
const TRAINING_START_CTA_SELECTOR = "[data-tour='training-start-cta']";
const TRAINING_START_BUTTON_SELECTOR = "[data-tour='training-start-button']";
const TRAINING_SESSION_CARD_SELECTOR = "[data-tour='training-session-card']";

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
    behavior: "auto",
  });
  await waitForAnimationFrames(2);
}

function getPrimaryMockVerseCard() {
  return queryVisibleElement(ONBOARDING_PRIMARY_CARD_SELECTOR);
}

function getPrimaryMockVerseAction(selector: string) {
  const card = getPrimaryMockVerseCard();
  if (!(card instanceof HTMLElement)) return null;

  const action = card.querySelector<HTMLElement>(selector);
  return isElementVisible(action) ? action : null;
}

function getPrimaryMockVerse() {
  return (
    useOnboardingStore
      .getState()
      .mockVerses.find(
        (verse) => verse.externalVerseId === ONBOARDING_PRIMARY_VERSE_ID,
      ) ?? null
  );
}

async function scrollVerseListToTop(runtime: AppOnboardingRuntime) {
  const scroller = await runtime.waitForElement(VERSE_LIST_SCROLLER_SELECTOR, {
    timeoutMs: 4000,
  });

  if (!(scroller instanceof HTMLElement)) return;

  if (typeof scroller.scrollTo === "function") {
    scroller.scrollTo({ top: 0, behavior: "auto" });
  } else {
    scroller.scrollTop = 0;
  }

  await waitForAnimationFrames(2);
}

async function closeVerseOverlays() {
  useOnboardingStore.getState().closeAllOverlays();
  await waitForAnimationFrames(2);
}

async function ensureVerseListOverview(runtime: AppOnboardingRuntime) {
  await closeVerseOverlays();
  await runtime.waitForElement(VERSE_LIST_CONTENT_SELECTOR, {
    timeoutMs: 12000,
  });
  await runtime.waitForCondition(
    () => Boolean(resolveOnboardingElement(VERSE_LIST_CONTENT_SELECTOR)),
    { timeoutMs: 12000 },
  );
  await scrollVerseListToTop(runtime);
}

async function ensurePrimaryMockVerseCard(runtime: AppOnboardingRuntime) {
  await ensureVerseListOverview(runtime);

  const card = await runtime.waitForElement(ONBOARDING_PRIMARY_CARD_SELECTOR, {
    timeoutMs: 8000,
  });
  if (card instanceof HTMLElement) {
    await scrollElementIntoView(card);
  }
}

async function ensureVerseProgressSummary(runtime: AppOnboardingRuntime) {
  await ensurePrimaryMockVerseCard(runtime);

  if (!resolveOnboardingElement(VERSE_PROGRESS_DRAWER_SELECTOR)) {
    const targetVerse = getPrimaryMockVerse();
    if (targetVerse) {
      useOnboardingStore.getState().openProgressDrawer(targetVerse);
      await waitForAnimationFrames(2);
    }
  }

  const summary = await runtime.waitForElement(VERSE_PROGRESS_SUMMARY_SELECTOR, {
    timeoutMs: 4000,
  });
  if (summary instanceof HTMLElement) {
    await scrollElementIntoView(summary);
  }
}

async function ensureCoreTrainingHub(runtime: AppOnboardingRuntime) {
  const coreScenario = await runtime.waitForElement(TRAINING_SCENARIO_CORE_SELECTOR, {
    timeoutMs: 8000,
  });

  if (coreScenario instanceof HTMLButtonElement) {
    if (coreScenario.getAttribute("data-state") !== "active") {
      coreScenario.click();
      await waitForAnimationFrames(2);
    }
  }

  await runtime.waitForElement(TRAINING_CORE_PRESETS_SELECTOR, {
    timeoutMs: 4000,
  });
  await runtime.waitForElement(TRAINING_START_BUTTON_SELECTOR, {
    timeoutMs: 4000,
  });
}

async function animateTapAndClick(
  element: HTMLElement,
  options?: {
    delayBefore?: number;
    delayAfter?: number;
    pressDuration?: number;
  },
): Promise<void> {
  const delayBefore = options?.delayBefore ?? 32;
  const delayAfter = options?.delayAfter ?? 72;
  const pressDuration = options?.pressDuration ?? 70;

  await new Promise<void>((resolve) => setTimeout(resolve, delayBefore));

  element.style.transition = `transform ${pressDuration}ms ease`;
  element.style.transform = "scale(0.92)";
  triggerHaptic("light");

  await new Promise<void>((resolve) => setTimeout(resolve, pressDuration));
  element.style.transform = "scale(1)";

  await new Promise<void>((resolve) => setTimeout(resolve, delayAfter));
  element.style.transition = "";
  element.style.transform = "";
}

export function resolveOnboardingElement(target?: StepElementTarget) {
  if (!target) return null;
  if (typeof target === "string") return queryVisibleElement(target);
  return target();
}

export function buildOnboardingSteps({
  source,
}: BuildOnboardingStepsOptions): AppOnboardingStep[] {
  const isReplay = source === "profile";

  return [
    {
      id: "dashboard-home",
      page: "dashboard",
      title: "Главный экран",
      description: isReplay
        ? "Это быстрый повтор маршрута. Главная дает общий срез, а вся основная работа происходит в разделах «Стихи» и «Тренировка»."
        : "Это стартовый экран приложения. Главная нужна для общего среза, а основной маршрут строится через разделы «Стихи» и «Тренировка».",
      element: APP_NAV_SELECTOR,
      side: "top",
      align: "center",
    },
    {
      id: "verses-overview",
      page: "verses",
      title: "Раздел «Стихи»",
      description:
        "Здесь находятся все карточки. В этом разделе вы добавляете стихи в практику и следите за тем, как они двигаются по маршруту запоминания.",
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
        "У каждой карточки есть текст, ссылка и быстрые действия. Отсюда начинается работа со стихом.",
      element: ONBOARDING_PRIMARY_CARD_SELECTOR,
      side: "bottom",
      align: "center",
      prepare: ensurePrimaryMockVerseCard,
    },
    {
      id: "verses-add-card",
      page: "verses",
      title: "Добавить в обучение",
      description:
        "Сейчас приложение само добавит эту карточку в практику. После этого у стиха появится прогресс и он станет доступен в тренировке.",
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
          useOnboardingStore
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
      title: "Путь карточки",
      description:
        "После добавления появляется прогресс карточки. В нем видно, где стих находится сейчас и как он будет двигаться дальше.",
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
          useOnboardingStore.getState().openProgressDrawer(targetVerse);
        }

        await runtime.waitForElement(VERSE_PROGRESS_SUMMARY_SELECTOR, {
          timeoutMs: 4000,
        });
        await runtime.goNext();
      },
    },
    {
      id: "verses-progress-summary",
      page: "verses",
      title: "Как стих растет",
      description:
        "Тренировки двигают карточку по этапам: сначала изучение, потом повторение, затем статус выученного. Хорошие ответы поднимают прогресс и дают XP.",
      element: VERSE_PROGRESS_SUMMARY_SELECTOR,
      side: "top",
      align: "center",
      prepare: ensureVerseProgressSummary,
    },
    {
      id: "training-overview",
      page: "training",
      title: "Раздел «Тренировка»",
      description:
        "Здесь приложение собирает карточки, которые готовы к практике. Для ежедневной работы главное - запускать обычную практику и регулярно возвращаться к повторениям.",
      element: TRAINING_CORE_PRESETS_SELECTOR,
      side: "bottom",
      align: "center",
      prepare: ensureCoreTrainingHub,
    },
    {
      id: "training-start",
      page: "training",
      title: "Запуск практики",
      description:
        "Сессию вы запускаете отсюда. После каждого ответа приложение просит оценить, насколько уверенно вы вспомнили стих, и на основе этой оценки меняет прогресс карточки и ваш XP.",
      element: TRAINING_START_CTA_SELECTOR,
      side: "top",
      align: "center",
      prepare: ensureCoreTrainingHub,
    },
    {
      id: "training-open-session",
      page: "training",
      title: "Открываем первую тренировку",
      description:
        "Сейчас приложение войдет внутрь первой сессии, чтобы показать, как выглядит живая практика.",
      element: TRAINING_START_BUTTON_SELECTOR,
      side: "top",
      align: "center",
      prepare: ensureCoreTrainingHub,
      autoAction: async (runtime) => {
        const startButton = await runtime.waitForElement(TRAINING_START_BUTTON_SELECTOR, {
          timeoutMs: 4000,
        });

        if (startButton instanceof HTMLElement) {
          await animateTapAndClick(startButton);
          startButton.click();
        }

        await runtime.waitForElement(TRAINING_SESSION_CARD_SELECTOR, {
          timeoutMs: 8000,
        });
        await runtime.goNext();
      },
    },
    {
      id: "training-session",
      page: "training",
      title: "Внутри тренировки",
      description:
        "Внутри вы проходите одно упражнение за раз. Сначала решаете задание по карточке, затем оцениваете результат, и эта оценка определяет дальнейший рост карточки и XP.",
      element: TRAINING_SESSION_CARD_SELECTOR,
      side: "top",
      align: "center",
      prepare: async (runtime) => {
        await runtime.waitForElement(TRAINING_SESSION_CARD_SELECTOR, {
          timeoutMs: 8000,
        });
      },
    },
    {
      id: "onboarding-finish",
      page: "training",
      title: "Обучение завершено",
      description:
        "Основная идея приложения проста: добавляете карточки в разделе «Стихи», затем регулярно проходите практику в разделе «Тренировка», чтобы двигать их вперед и набирать XP.",
      side: "over",
      align: "center",
    },
  ];
}
