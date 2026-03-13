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
import { selectVerseListAction } from "./verseListOnboardingTargeting";

export type OnboardingPage = "dashboard" | "verses" | "training" | "profile";

export type StepElementTarget = string | (() => Element | null);

export type AppOnboardingRuntime = {
  source: OnboardingSource;
  isMockVerseFlow: boolean;
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
  dispatchAppEvent: (eventName: string) => void;
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
  hasOwnedVerses: boolean;
  hasProgressVerse: boolean;
  useMockVerseFlow: boolean;
};

const CLOSE_PROGRESS_DRAWER_EVENT = "bible-memory:onboarding-close-progress-drawer";
const OPEN_FILTERS_DRAWER_EVENT = "bible-memory:onboarding-open-filters-drawer";
const CLOSE_FILTERS_DRAWER_EVENT = "bible-memory:onboarding-close-filters-drawer";
const VERSE_LIST_CONTENT_SELECTOR = "[data-tour='verse-list-content']";
const VERSE_LIST_SCROLLER_SELECTOR = "[data-tour='verse-list-virtualized']";
const VERSE_LIST_ROW_SELECTOR = "[data-tour='verse-list-row']";
const VERSE_CARD_ADD_BUTTON_SELECTOR = "[data-tour='verse-card-add-button']";
const VERSE_CARD_PROMOTE_BUTTON_SELECTOR = "[data-tour='verse-card-promote-button']";
const VERSE_CARD_PROGRESS_BUTTON_SELECTOR = "[data-tour='verse-card-progress-button']";
const ONBOARDING_MOCK_PRIMARY_CARD_SELECTOR =
  "[data-tour='onboarding-mock-primary-verse-card']";
const VERSE_PROGRESS_DRAWER_SELECTOR = "[data-tour='verse-progress-drawer']";
const VERSE_PROGRESS_SUMMARY_SELECTOR = "[data-tour='verse-progress-summary']";
const VERSE_PROGRESS_COLLECTION_SELECTOR =
  "[data-tour='verse-progress-phase-collection']";
const VERSE_PROGRESS_LEARNING_SELECTOR =
  "[data-tour='verse-progress-phase-learning']";
const VERSE_PROGRESS_REVIEW_SELECTOR =
  "[data-tour='verse-progress-phase-review']";
const VERSE_PROGRESS_MASTERED_SELECTOR =
  "[data-tour='verse-progress-phase-mastered']";
const VERSE_LIST_FILTERS_TRIGGER_SELECTOR =
  "[data-tour='verse-list-filters-trigger']";
const VERSE_LIST_FILTERS_DRAWER_SELECTOR =
  "[data-tour='verse-list-filters-drawer']";
const VERSE_LIST_FILTERS_MAIN_VALUES_SELECTOR =
  "[data-tour='verse-list-filters-main-values']";
const VERSE_LIST_FILTERS_BOOK_SELECTOR = "[data-tour='verse-list-filters-book']";
const VERSE_LIST_FILTERS_SORT_SELECTOR = "[data-tour='verse-list-filters-sort']";
const VERSE_LIST_FILTERS_TAGS_SELECTOR = "[data-tour='verse-list-filters-tags']";

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

function normalizeVerseId(value?: string | null) {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

function escapeAttributeValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function getVerseListContentSelector(options?: {
  filter?: string;
  state?: "loading" | "empty" | "ready";
}) {
  const selectors = [VERSE_LIST_CONTENT_SELECTOR];

  if (options?.filter) {
    selectors.push(`[data-tour-filter="${escapeAttributeValue(options.filter)}"]`);
  }

  if (options?.state) {
    selectors.push(`[data-tour-state="${options.state}"]`);
  }

  return selectors.join("");
}

function getVerseListRowCandidates() {
  if (typeof document === "undefined") return [];

  return Array.from(document.querySelectorAll<HTMLElement>(VERSE_LIST_ROW_SELECTOR))
    .filter((row) => isElementVisible(row))
    .map((row) => {
      const rect = row.getBoundingClientRect();
      const index = Number.parseInt(row.dataset.tourIndex ?? "", 10);

      return {
        index: Number.isFinite(index) ? index : Number.MAX_SAFE_INTEGER,
        top: rect.top,
        left: rect.left,
        verseId: normalizeVerseId(row.dataset.tourVerseId),
        getAction: (selector: string) => {
          const action = row.querySelector<HTMLElement>(selector);
          return isElementVisible(action) ? action : null;
        },
      };
    });
}

function queryVerseListAction(
  selector: string,
  options?: { targetVerseId?: string | null },
) {
  return (
    selectVerseListAction(getVerseListRowCandidates(), selector, options) ??
    queryVisibleElement(selector)
  );
}

function getVerseIdFromActionElement(element: Element | null) {
  if (!(element instanceof HTMLElement)) return null;
  const row = element.closest<HTMLElement>(VERSE_LIST_ROW_SELECTOR);
  return normalizeVerseId(row?.dataset.tourVerseId);
}

async function waitForAnimationFrames(count = 2) {
  for (let index = 0; index < count; index += 1) {
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  }
}

async function scrollElementIntoView(
  runtime: AppOnboardingRuntime,
  element: HTMLElement,
) {
  element.scrollIntoView({
    block: "center",
    behavior: runtime.isMockVerseFlow ? "auto" : "smooth",
  });
  await waitForAnimationFrames(runtime.isMockVerseFlow ? 1 : 2);
}

async function scrollVerseListToTop(runtime: AppOnboardingRuntime) {
  const scroller = await runtime.waitForElement(VERSE_LIST_SCROLLER_SELECTOR, {
    timeoutMs: 12000,
  });

  if (!(scroller instanceof HTMLElement)) return;

  if (typeof scroller.scrollTo === "function") {
    scroller.scrollTo({ top: 0, behavior: "auto" });
  } else {
    scroller.scrollTop = 0;
  }

  await waitForAnimationFrames(runtime.isMockVerseFlow ? 1 : 2);
}

async function waitForVerseListState(
  runtime: AppOnboardingRuntime,
  options?: {
    filter?: string;
    states?: Array<"loading" | "empty" | "ready">;
    timeoutMs?: number;
  },
) {
  const states = options?.states ?? ["ready"];
  const timeoutMs = options?.timeoutMs ?? 20000;

  await runtime.waitForElement(getVerseListContentSelector(), { timeoutMs });

  return runtime.waitForCondition(
    () =>
      states.some((state) =>
        Boolean(
          resolveOnboardingElement(
            getVerseListContentSelector({
              filter: options?.filter,
              state,
            }),
          ),
        ),
      ),
    { timeoutMs },
  );
}

async function closeVerseListOverlays(
  runtime: AppOnboardingRuntime,
  options?: {
    closeProgress?: boolean;
    closeFilters?: boolean;
    timeoutMs?: number;
  },
) {
  const closeProgress = options?.closeProgress ?? true;
  const closeFilters = options?.closeFilters ?? true;
  const timeoutMs = options?.timeoutMs ?? 4000;

  if (closeProgress) {
    runtime.dispatchAppEvent(CLOSE_PROGRESS_DRAWER_EVENT);
  }

  if (closeFilters) {
    runtime.dispatchAppEvent(CLOSE_FILTERS_DRAWER_EVENT);
  }

  await runtime.waitForCondition(
    () =>
      (!closeProgress || !resolveOnboardingElement(VERSE_PROGRESS_DRAWER_SELECTOR)) &&
      (!closeFilters ||
        !resolveOnboardingElement(VERSE_LIST_FILTERS_DRAWER_SELECTOR)),
    { timeoutMs },
  );
}

async function ensureMockVerseCard(runtime: AppOnboardingRuntime) {
  await closeVerseListOverlays(runtime);
  await ensureCatalogTab(runtime);
  await scrollVerseListToTop(runtime);
  const card = await runtime.waitForElement(ONBOARDING_MOCK_PRIMARY_CARD_SELECTOR, {
    timeoutMs: 8000,
  });
  if (card instanceof HTMLElement) {
    await scrollElementIntoView(runtime, card);
  }
}

async function ensureTrainingScenario(
  stepSelector: string,
  runtime: AppOnboardingRuntime,
) {
  const trigger = await runtime.waitForElement(stepSelector, { timeoutMs: 12000 });
  if (!(trigger instanceof HTMLButtonElement)) return;
  if (trigger.getAttribute("data-state") === "active") return;
  trigger.click();
}

async function ensureCatalogTab(runtime: AppOnboardingRuntime) {
  const catalogTab = await runtime.waitForElement("[data-tour='verse-filter-tab-catalog']", {
    timeoutMs: 12000,
  });
  if (!(catalogTab instanceof HTMLButtonElement)) return;
  if (catalogTab.getAttribute("aria-selected") === "true") return;
  catalogTab.click();
}

async function ensureProfilePlayersTab(runtime: AppOnboardingRuntime) {
  const trigger = await runtime.waitForElement("[data-tour='profile-players-tab']", {
    timeoutMs: 8000,
  });
  if (!(trigger instanceof HTMLButtonElement)) return;
  if (trigger.getAttribute("data-state") === "active") return;
  trigger.click();
}

async function ensureVerseProgressDrawer(
  runtime: AppOnboardingRuntime,
  options?: { getProgressButton?: () => Element | null },
) {
  if (resolveOnboardingElement(VERSE_PROGRESS_DRAWER_SELECTOR)) return;

  const progressButton =
    (await runtime.waitForElement(options?.getProgressButton, {
      timeoutMs: 8000,
    })) ??
    (await runtime.waitForElement(VERSE_CARD_PROGRESS_BUTTON_SELECTOR, {
      timeoutMs: 8000,
    }));
  if (progressButton instanceof HTMLElement) {
    await scrollElementIntoView(runtime, progressButton);
    progressButton.click();
  }
  await runtime.waitForElement(VERSE_PROGRESS_DRAWER_SELECTOR);
}

async function ensureVerseProgressSection(
  runtime: AppOnboardingRuntime,
  sectionSelector: string,
  options?: { getProgressButton?: () => Element | null },
) {
  await ensureVerseProgressDrawer(runtime, options);
  const section = await runtime.waitForElement(sectionSelector, { timeoutMs: 8000 });
  if (section instanceof HTMLElement) {
    await scrollElementIntoView(runtime, section);
  }
}

async function ensureVerseFiltersDrawer(runtime: AppOnboardingRuntime) {
  if (resolveOnboardingElement(VERSE_LIST_FILTERS_DRAWER_SELECTOR)) return;

  runtime.dispatchAppEvent(OPEN_FILTERS_DRAWER_EVENT);
  const openedByEvent = await runtime.waitForElement(
    VERSE_LIST_FILTERS_DRAWER_SELECTOR,
    { timeoutMs: 2000 },
  );
  if (openedByEvent) return;

  const trigger = await runtime.waitForElement(VERSE_LIST_FILTERS_TRIGGER_SELECTOR, {
    timeoutMs: 8000,
  });

  if (trigger instanceof HTMLElement) {
    trigger.click();
  }

  await runtime.waitForElement(VERSE_LIST_FILTERS_DRAWER_SELECTOR, {
    timeoutMs: 8000,
  });
}

async function animateTapAndClick(
  element: HTMLElement,
  options?: {
    delayBefore?: number;
    delayAfter?: number;
    pressDuration?: number;
    fast?: boolean;
  },
): Promise<void> {
  const fast = options?.fast ?? false;
  const delayBefore = options?.delayBefore ?? (fast ? 32 : 400);
  const delayAfter = options?.delayAfter ?? (fast ? 72 : 500);
  const pressDuration = options?.pressDuration ?? (fast ? 70 : 150);

  await new Promise<void>((r) => setTimeout(r, delayBefore));

  let ripple: HTMLDivElement | null = null;
  if (!fast) {
    const rect = element.getBoundingClientRect();
    ripple = document.createElement("div");
    ripple.className = "onboarding-tap-indicator";
    ripple.style.left = `${rect.left + rect.width / 2 - 22}px`;
    ripple.style.top = `${rect.top + rect.height / 2 - 22}px`;
    document.body.appendChild(ripple);
  }

  element.style.transition = `transform ${pressDuration}ms ease`;
  element.style.transform = "scale(0.92)";
  triggerHaptic("light");

  await new Promise<void>((r) => setTimeout(r, pressDuration));
  element.style.transform = "scale(1)";

  element.click();

  await new Promise<void>((r) => setTimeout(r, delayAfter));
  ripple?.remove();
  element.style.transition = "";
  element.style.transform = "";
}

export function resolveOnboardingElement(target?: StepElementTarget) {
  if (!target) return null;
  if (typeof target === "string") return queryVisibleElement(target);
  return target();
}

function buildVerseProgressWalkthroughSteps(
  getProgressButton: () => Element | null,
): AppOnboardingStep[] {
  const ensureStepSection = (selector: string) => (runtime: AppOnboardingRuntime) =>
    ensureVerseProgressSection(runtime, selector, {
      getProgressButton,
    });

  return [
    {
      id: "verse-progress-summary",
      page: "verses",
      title: "Главная сводка по стиху",
      description:
        "Верхний блок показывает, где стих находится сейчас, сколько общего пути уже пройдено и когда откроется следующее окно повторения.",
      element: VERSE_PROGRESS_SUMMARY_SELECTOR,
      side: "left",
      align: "start",
      prepare: ensureStepSection(VERSE_PROGRESS_SUMMARY_SELECTOR),
    },
    {
      id: "verse-progress-collection",
      page: "verses",
      title: "Точка входа в маршрут",
      description:
        "Сначала стих попадает в коллекцию. Это стартовая фаза, после которой он переходит к активному изучению.",
      element: VERSE_PROGRESS_COLLECTION_SELECTOR,
      side: "left",
      align: "start",
      prepare: ensureStepSection(VERSE_PROGRESS_COLLECTION_SELECTOR),
    },
    {
      id: "verse-progress-learning",
      page: "verses",
      title: "Этап изучения",
      description:
        "После добавления стих проходит 7 ступеней изучения. Каждое успешное прохождение двигает его ближе к повторению.",
      element: VERSE_PROGRESS_LEARNING_SELECTOR,
      side: "left",
      align: "start",
      prepare: ensureStepSection(VERSE_PROGRESS_LEARNING_SELECTOR),
    },
    {
      id: "verse-progress-review",
      page: "verses",
      title: "Этап повторения",
      description:
        "Дальше идут 7 повторений по времени. Именно здесь приложение возвращает стих в нужное окно, чтобы закрепить его в памяти.",
      element: VERSE_PROGRESS_REVIEW_SELECTOR,
      side: "left",
      align: "start",
      prepare: ensureStepSection(VERSE_PROGRESS_REVIEW_SELECTOR),
    },
    {
      id: "verse-progress-mastered",
      page: "verses",
      title: "Статус «Выучен»",
      description:
        "Когда все повторы пройдены, стих становится выученным. После этого его можно поддерживать редкими повторами и при желании удалить из своей коллекции.",
      element: VERSE_PROGRESS_MASTERED_SELECTOR,
      side: "left",
      align: "start",
      prepare: ensureStepSection(VERSE_PROGRESS_MASTERED_SELECTOR),
    },
  ];
}

export function buildOnboardingSteps({
  source,
  hasOwnedVerses,
  hasProgressVerse,
  useMockVerseFlow,
}: BuildOnboardingStepsOptions): AppOnboardingStep[] {
  const isReplay = source === "profile";
  let trackedVerseId: string | null = useMockVerseFlow
    ? ONBOARDING_PRIMARY_VERSE_ID
    : null;
  const getTrackedVerseAction = (selector: string) =>
    queryVerseListAction(selector, { targetVerseId: trackedVerseId });
  const steps: AppOnboardingStep[] = [
    {
      id: "dashboard-intro",
      page: "dashboard",
      title: "Добро пожаловать в Bible Memory",
      description: useMockVerseFlow
        ? isReplay
          ? "Это повторный обзор. На демо-стихе вы снова пройдете весь маршрут: карточка, добавление, прогресс, фильтры, тренировки и друзья."
          : "Сейчас вы пройдете учебный маршрут на демо-стихе: увидите карточку, добавите стих, откроете прогресс, затем разберете фильтры, тренировки и друзей."
        : hasOwnedVerses
          ? isReplay
            ? "Это повторный обзор приложения. Вы снова пройдете живой маршрут: прогресс стиха, фильтры, тренировки, друзья и точка повторного запуска обучения."
            : "Это короткое обучение покажет живой маршрут внутри приложения: как читать прогресс стиха, где управлять фильтрами, как запускать тренировки и где позже повторить обзор."
          : isReplay
            ? "Это повторный обзор. Вы снова пройдете путь новичка: добавление стиха, открытие его прогресса, фильтры, тренировки и раздел друзей."
            : "Сейчас вы пройдете живой маршрут первого входа: добавите свой первый стих, откроете его путь запоминания, увидите фильтры, тренировки и раздел друзей.",
      side: "over",
      align: "center",
    },
    {
      id: "app-navigation",
      page: "dashboard",
      title: "Навигация по разделам",
      description:
        "Главная показывает быстрый срез прогресса. В Стихах вы собираете коллекцию. В Тренировке запускаются практики. В Профиле находятся друзья, настройки и повторный запуск обучения.",
      element: "[data-tour='app-nav']",
      side: "top",
      align: "center",
    },
    {
      id: "dashboard-stats",
      page: "dashboard",
      title: "Быстрый снимок дня",
      description:
        "Здесь видно, сколько стихов в изучении, сколько ждут повторения, сколько XP набрано и сколько стихов уже дошло до статуса «Выучен».",
      element: "[data-tour='dashboard-stats']",
      side: "left",
      align: "start",
    },
  ];

  if (useMockVerseFlow) {
    steps.push(
      {
        id: "verses-card-overview",
        page: "verses",
        title: "Демо-карточка стиха",
        description:
          "Перед вами полная карточка: ссылка, текст, теги и быстрые действия для работы со стихом.",
        element: ONBOARDING_MOCK_PRIMARY_CARD_SELECTOR,
        side: "left",
        align: "center",
        prepare: async (runtime) => {
          await ensureMockVerseCard(runtime);
        },
      },
      {
        id: "verses-add-button",
        page: "verses",
        title: "Добавляем стих",
        description:
          "Теперь приложение покажет tap по кнопке добавления и переведет демо-стих сразу в изучение.",
        element: () => getTrackedVerseAction(VERSE_CARD_ADD_BUTTON_SELECTOR),
        side: "left",
        align: "center",
        prepare: async (runtime) => {
          await ensureMockVerseCard(runtime);
          const addButton = await runtime.waitForElement(
            () => getTrackedVerseAction(VERSE_CARD_ADD_BUTTON_SELECTOR),
            { timeoutMs: 8000 },
          );
          if (addButton instanceof HTMLElement) {
            addButton.scrollIntoView({ block: "center", behavior: "auto" });
          }
        },
        autoAction: async (runtime) => {
          const addButton = getTrackedVerseAction(VERSE_CARD_ADD_BUTTON_SELECTOR);
          if (addButton instanceof HTMLElement) {
            trackedVerseId = getVerseIdFromActionElement(addButton) ?? trackedVerseId;
            await animateTapAndClick(addButton, { fast: true });
          }
          await runtime.waitForCondition(
            () => Boolean(getTrackedVerseAction(VERSE_CARD_PROGRESS_BUTTON_SELECTOR)),
            { timeoutMs: 8000 },
          );
          await runtime.goNext();
        },
      },
      {
        id: "verses-open-progress",
        page: "verses",
        title: "Прогресс стиха",
        description:
          "После добавления на карточке появляется плашка прогресса. По ней открывается весь путь стиха в drawer.",
        element: () => getTrackedVerseAction(VERSE_CARD_PROGRESS_BUTTON_SELECTOR),
        side: "left",
        align: "center",
        prepare: async (runtime) => {
          await closeVerseListOverlays(runtime);
          const progressButton = await runtime.waitForElement(
            () => getTrackedVerseAction(VERSE_CARD_PROGRESS_BUTTON_SELECTOR),
            { timeoutMs: 8000 },
          );
          if (progressButton instanceof HTMLElement) {
            progressButton.scrollIntoView({ block: "center", behavior: "auto" });
          }
        },
        autoAction: async (runtime) => {
          const progressButton = getTrackedVerseAction(VERSE_CARD_PROGRESS_BUTTON_SELECTOR);
          if (progressButton instanceof HTMLElement) {
            trackedVerseId = getVerseIdFromActionElement(progressButton) ?? trackedVerseId;
            await animateTapAndClick(progressButton, { fast: true });
          }
          await runtime.waitForCondition(
            () => Boolean(resolveOnboardingElement(VERSE_PROGRESS_DRAWER_SELECTOR)),
            { timeoutMs: 8000 },
          );
          await runtime.goNext();
        },
      },
      ...buildVerseProgressWalkthroughSteps(() =>
        getTrackedVerseAction(VERSE_CARD_PROGRESS_BUTTON_SELECTOR),
      ),
      {
        id: "verses-filters",
        page: "verses",
        title: "Фильтры списка",
        description:
          "Эта кнопка открывает фильтры. Через нее вы переключаете источник карточек и быстро сужаете список.",
        element: VERSE_LIST_FILTERS_TRIGGER_SELECTOR,
        side: "bottom",
        align: "center",
        prepare: async (runtime) => {
          await closeVerseListOverlays(runtime);
          await runtime.waitForElement(VERSE_LIST_FILTERS_TRIGGER_SELECTOR, {
            timeoutMs: 8000,
          });
        },
      },
      {
        id: "verses-open-filters",
        page: "verses",
        title: "Открываем drawer фильтров",
        description:
          "Сейчас приложение раскроет drawer, где собраны основные режимы, книга, сортировка и темы.",
        element: VERSE_LIST_FILTERS_TRIGGER_SELECTOR,
        side: "bottom",
        align: "center",
        prepare: async (runtime) => {
          await closeVerseListOverlays(runtime, { closeProgress: false });
          await runtime.waitForElement(VERSE_LIST_FILTERS_TRIGGER_SELECTOR, {
            timeoutMs: 8000,
          });
        },
        autoAction: async (runtime) => {
          const trigger = await runtime.waitForElement(
            VERSE_LIST_FILTERS_TRIGGER_SELECTOR,
            { timeoutMs: 8000 },
          );

          if (trigger instanceof HTMLElement) {
            trigger.scrollIntoView({ block: "center", behavior: "auto" });
            await animateTapAndClick(trigger, { fast: true });
          } else {
            runtime.dispatchAppEvent(OPEN_FILTERS_DRAWER_EVENT);
          }

          await runtime.waitForElement(VERSE_LIST_FILTERS_DRAWER_SELECTOR, {
            timeoutMs: 8000,
          });
          await runtime.goNext();
        },
      },
      {
        id: "verses-filters-main-values",
        page: "verses",
        title: "Главные значения фильтров",
        description:
          "Сверху видно текущее состояние фильтров: источник карточек, книга, сортировка и активные ограничения.",
        element: VERSE_LIST_FILTERS_MAIN_VALUES_SELECTOR,
        side: "top",
        align: "start",
        prepare: ensureVerseFiltersDrawer,
      },
      {
        id: "verses-filters-book",
        page: "verses",
        title: "Фильтр по книге",
        description:
          "Здесь список можно ограничить конкретной книгой Библии или быстро вернуть показ всех книг.",
        element: VERSE_LIST_FILTERS_BOOK_SELECTOR,
        side: "top",
        align: "start",
        prepare: ensureVerseFiltersDrawer,
      },
      {
        id: "verses-filters-sort",
        page: "verses",
        title: "Сортировка карточек",
        description:
          "Сортировка переключает порядок показа: по активности, по канону или по популярности.",
        element: VERSE_LIST_FILTERS_SORT_SELECTOR,
        side: "top",
        align: "start",
        prepare: ensureVerseFiltersDrawer,
      },
      {
        id: "verses-filters-tags",
        page: "verses",
        title: "Темы и теги",
        description:
          "Темы помогают быстро собрать стихи по смыслу. Здесь же можно включать и сбрасывать нужные теги.",
        element: VERSE_LIST_FILTERS_TAGS_SELECTOR,
        side: "top",
        align: "start",
        prepare: ensureVerseFiltersDrawer,
      },
    );
  } else {
    steps.push({
      id: "verses-add-button",
      page: "verses",
      title: "Ваш первый стих",
      description:
        "Сейчас откроется каталог. Нажмите «Далее», и приложение само добавит первый стих из списка. Если потом передумаете, его можно будет удалить из карточки.",
      element: () => getTrackedVerseAction(VERSE_CARD_ADD_BUTTON_SELECTOR),
      side: "left",
      align: "center",
      prepare: async (runtime) => {
        await ensureCatalogTab(runtime);
        await waitForVerseListState(runtime, {
          filter: "catalog",
          states: ["ready", "empty"],
          timeoutMs: 20000,
        });
        await scrollVerseListToTop(runtime);
        const firstAddButton = await runtime.waitForElement(
          () => getTrackedVerseAction(VERSE_CARD_ADD_BUTTON_SELECTOR),
          { timeoutMs: 12000 },
        );
        if (firstAddButton instanceof HTMLElement) {
          firstAddButton.scrollIntoView({
            block: "center",
            behavior: "smooth",
          });
        }
      },
      autoAction: async (runtime) => {
        const addButton = getTrackedVerseAction(VERSE_CARD_ADD_BUTTON_SELECTOR);
        if (addButton instanceof HTMLElement) {
          trackedVerseId = getVerseIdFromActionElement(addButton);
          await animateTapAndClick(addButton);
        }
        await runtime.waitForCondition(
          () =>
            Boolean(
              getTrackedVerseAction(VERSE_CARD_PROMOTE_BUTTON_SELECTOR) ??
                getTrackedVerseAction(VERSE_CARD_PROGRESS_BUTTON_SELECTOR),
            ),
          { timeoutMs: 8000 },
        );
        await runtime.goNext();
      },
    });

    if (!hasProgressVerse) {
      steps.push({
        id: "verses-promote",
        page: "verses",
        title: "Переведите стих в изучение",
        description:
          "Нажмите «Далее», и приложение запустит изучение этого стиха. После этого на карточке появится поле прогресса, из которого открывается весь маршрут запоминания.",
        element: () => getTrackedVerseAction(VERSE_CARD_PROMOTE_BUTTON_SELECTOR),
        side: "left",
        align: "center",
        skipWhen: () => Boolean(getTrackedVerseAction(VERSE_CARD_PROGRESS_BUTTON_SELECTOR)),
        autoAction: async (runtime) => {
          const promoteButton = getTrackedVerseAction(VERSE_CARD_PROMOTE_BUTTON_SELECTOR);
          if (promoteButton instanceof HTMLElement) {
            trackedVerseId = getVerseIdFromActionElement(promoteButton) ?? trackedVerseId;
            await animateTapAndClick(promoteButton);
          }
          await runtime.waitForCondition(
            () => Boolean(getTrackedVerseAction(VERSE_CARD_PROGRESS_BUTTON_SELECTOR)),
            { timeoutMs: 8000 },
          );
          await runtime.goNext();
        },
      });
    }

    steps.push(
      {
        id: "verses-open-progress",
        page: "verses",
        title: "Откройте путь стиха",
        description:
          "Нажмите «Далее», и приложение откроет маршрут стиха: от коллекции через изучение и повторение к статусу «Выучен».",
        element: () => getTrackedVerseAction(VERSE_CARD_PROGRESS_BUTTON_SELECTOR),
        side: "left",
        align: "center",
        prepare: (runtime) => {
          runtime.dispatchAppEvent(CLOSE_PROGRESS_DRAWER_EVENT);
        },
        autoAction: async (runtime) => {
          const progressButton = getTrackedVerseAction(VERSE_CARD_PROGRESS_BUTTON_SELECTOR);
          if (progressButton instanceof HTMLElement) {
            trackedVerseId = getVerseIdFromActionElement(progressButton) ?? trackedVerseId;
            progressButton.scrollIntoView({ block: "center", behavior: "smooth" });
            await animateTapAndClick(progressButton);
          }
          await runtime.waitForCondition(
            () => Boolean(resolveOnboardingElement(VERSE_PROGRESS_DRAWER_SELECTOR)),
            { timeoutMs: 8000 },
          );
          await runtime.goNext();
        },
      },
      ...buildVerseProgressWalkthroughSteps(() =>
        getTrackedVerseAction(VERSE_CARD_PROGRESS_BUTTON_SELECTOR),
      ),
      {
        id: "verses-filters",
        page: "verses",
        title: "Фильтры и поиск",
        description:
          "Здесь вы переключаете каталог, свои стихи и стихи друзей, а также сужаете список по книге, сортировке, поиску и темам.",
        element: "[data-tour='verse-list-filters-panel']",
        side: "bottom",
        align: "center",
        prepare: async (runtime) => {
          runtime.dispatchAppEvent(CLOSE_PROGRESS_DRAWER_EVENT);
          await runtime.waitForCondition(
            () => !resolveOnboardingElement(VERSE_PROGRESS_DRAWER_SELECTOR),
            { timeoutMs: 4000 },
          );
        },
      },
    );
  }

  steps.push(
    {
      id: "training-scenarios",
      page: "training",
      title: "Два сценария тренировки",
      description:
        "Практика нужна для основного движения по стихам: изучение и повторение. Закрепление подключается позже и сильнее проверяет уже знакомую базу.",
      element: "[data-tour='training-scenarios']",
      side: "bottom",
      align: "center",
    },
    {
      id: "training-anchor",
      page: "training",
      title: "Изучение, повторение и закрепление",
      description:
        "Изучение двигает стих по ступеням, повторение возвращает его по интервалам, а закрепление проверяет ссылку, начало, конец, контекст и смешанный режим.",
      element: "[data-tour='training-anchor-presets']",
      side: "bottom",
      align: "center",
      prepare: (runtime) => ensureTrainingScenario("[data-tour='training-scenario-anchor']", runtime),
    },
    {
      id: "training-cta",
      page: "training",
      title: "Запуск первой практики",
      description:
        "Когда у вас есть стих в изучении или доступное повторение, начать сессию можно из этого блока. Если кнопка заблокирована, рядом всегда написана причина.",
      element: "[data-tour='training-start-cta']",
      side: "top",
      align: "center",
      prepare: (runtime) => ensureTrainingScenario("[data-tour='training-scenario-core']", runtime),
    },
    {
      id: "profile-replay",
      page: "profile",
      title: "Повторить обучение позже",
      description:
        "Если захотите снова пройти обзор по приложению, вернитесь сюда и запустите обучение заново из этой карточки.",
      element: "[data-tour='profile-onboarding-replay']",
      side: "top",
      align: "center",
    },
    {
      id: "profile-friends",
      page: "profile",
      title: "Игроки и друзья",
      description:
        "Во вкладке «Игроки» ищите людей, а во вкладке «Друзья» следите за теми, кого уже добавили. Это помогает видеть активность и сравнивать прогресс.",
      element: "[data-tour='profile-friends']",
      side: "top",
      align: "center",
    },
    {
      id: "profile-add-friend",
      page: "profile",
      title: "Где добавить первого друга",
      description:
        "Если в списке игроков уже есть люди, добавляйте их отсюда. Если список пока пуст, просто запомните это место и вернитесь позже.",
      element: () =>
        resolveOnboardingElement("[data-tour='profile-add-friend-button']") ??
        resolveOnboardingElement("[data-tour='profile-friends']"),
      side: "top",
      align: "center",
      prepare: (runtime) => ensureProfilePlayersTab(runtime),
    },
    {
      id: "onboarding-finish",
      page: "profile",
      title: "Обучение завершено",
      description:
        "Теперь вы знаете, как добавить первый стих, читать его путь, запускать тренировки и где работать с друзьями. Дальше можно переходить к обычной практике.",
      side: "over",
      align: "center",
    },
  );

  return steps;
}
