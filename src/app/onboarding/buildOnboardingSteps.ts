import type {
  Alignment,
  AllowedButtons,
  Driver,
  PopoverDOM,
  Side,
} from "driver.js";
import type { OnboardingSource } from "./onboardingStorage";
import { triggerHaptic } from "@/app/lib/haptics";

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
};

const CLOSE_PROGRESS_DRAWER_EVENT = "bible-memory:onboarding-close-progress-drawer";

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

async function ensureVerseProgressDrawer(runtime: AppOnboardingRuntime) {
  if (resolveOnboardingElement("[data-tour='verse-progress-drawer']")) return;

  const progressButton = await runtime.waitForElement(
    "[data-tour='verse-card-progress-button']",
    { timeoutMs: 8000 },
  );
  if (progressButton instanceof HTMLElement) {
    progressButton.scrollIntoView({ block: "center", behavior: "smooth" });
    // Allow scroll to settle before clicking.
    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => resolve()),
      );
    });
    progressButton.click();
  }
  await runtime.waitForElement("[data-tour='verse-progress-drawer']");
}

async function animateTapAndClick(
  element: HTMLElement,
  options?: { delayBefore?: number },
): Promise<void> {
  const delayBefore = options?.delayBefore ?? 400;

  await new Promise<void>((r) => setTimeout(r, delayBefore));

  const rect = element.getBoundingClientRect();
  const ripple = document.createElement("div");
  ripple.className = "onboarding-tap-indicator";
  ripple.style.left = `${rect.left + rect.width / 2 - 22}px`;
  ripple.style.top = `${rect.top + rect.height / 2 - 22}px`;
  document.body.appendChild(ripple);

  element.style.transition = "transform 150ms ease";
  element.style.transform = "scale(0.92)";
  triggerHaptic("light");

  await new Promise<void>((r) => setTimeout(r, 150));
  element.style.transform = "scale(1)";

  element.click();

  await new Promise<void>((r) => setTimeout(r, 500));
  ripple.remove();
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
  hasOwnedVerses,
  hasProgressVerse,
}: BuildOnboardingStepsOptions): AppOnboardingStep[] {
  const isReplay = source === "profile";
  const steps: AppOnboardingStep[] = [
    {
      id: "dashboard-intro",
      page: "dashboard",
      title: "Добро пожаловать в Bible Memory",
      description: hasOwnedVerses
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

  steps.push({
    id: "verses-add-button",
    page: "verses",
    title: "Добавьте первый стих",
    description:
      "Сейчас откроется каталог. Нажмите «Далее», и приложение само добавит первый стих из списка. Если потом передумаете, его можно будет удалить из карточки.",
    element: "[data-tour='verse-card-add-button']",
    side: "left",
    align: "center",
    prepare: async (runtime) => {
      await ensureCatalogTab(runtime);
      const firstAddButton = await runtime.waitForElement("[data-tour='verse-card-add-button']");
      if (firstAddButton instanceof HTMLElement) {
        firstAddButton.scrollIntoView({
          block: "center",
          behavior: "smooth",
        });
      }
    },
    autoAction: async (runtime) => {
      const addButton = resolveOnboardingElement("[data-tour='verse-card-add-button']");
      if (addButton instanceof HTMLElement) {
        await animateTapAndClick(addButton);
      }
      await runtime.waitForCondition(
        () =>
          Boolean(
            resolveOnboardingElement("[data-tour='verse-card-promote-button']") ??
              resolveOnboardingElement("[data-tour='verse-card-progress-button']"),
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
      element: "[data-tour='verse-card-promote-button']",
      side: "left",
      align: "center",
      skipWhen: () => Boolean(resolveOnboardingElement("[data-tour='verse-card-progress-button']")),
      autoAction: async (runtime) => {
        const promoteButton = resolveOnboardingElement("[data-tour='verse-card-promote-button']");
        if (promoteButton instanceof HTMLElement) {
          await animateTapAndClick(promoteButton);
        }
        await runtime.waitForCondition(
          () => Boolean(resolveOnboardingElement("[data-tour='verse-card-progress-button']")),
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
      element: "[data-tour='verse-card-progress-button']",
      side: "left",
      align: "center",
      prepare: (runtime) => {
        runtime.dispatchAppEvent(CLOSE_PROGRESS_DRAWER_EVENT);
      },
      autoAction: async (runtime) => {
        const progressButton = resolveOnboardingElement("[data-tour='verse-card-progress-button']");
        if (progressButton instanceof HTMLElement) {
          progressButton.scrollIntoView({ block: "center", behavior: "smooth" });
          await animateTapAndClick(progressButton);
        }
        await runtime.waitForCondition(
          () => Boolean(resolveOnboardingElement("[data-tour='verse-progress-drawer']")),
          { timeoutMs: 8000 },
        );
        await runtime.goNext();
      },
    },
    {
      id: "verse-progress-summary",
      page: "verses",
      title: "Главная сводка по стиху",
      description:
        "Верхний блок показывает, где стих находится сейчас, сколько общего пути уже пройдено и когда откроется следующее окно повторения.",
      element: "[data-tour='verse-progress-summary']",
      side: "left",
      align: "start",
      prepare: ensureVerseProgressDrawer,
    },
    {
      id: "verse-progress-learning",
      page: "verses",
      title: "Этап изучения",
      description:
        "После добавления стих проходит 7 ступеней изучения. Каждое успешное прохождение двигает его ближе к повторению.",
      element: "[data-tour='verse-progress-phase-learning']",
      side: "left",
      align: "start",
      prepare: ensureVerseProgressDrawer,
    },
    {
      id: "verse-progress-review",
      page: "verses",
      title: "Этап повторения",
      description:
        "Дальше идут 7 повторений по времени. Именно здесь приложение возвращает стих в нужное окно, чтобы закрепить его в памяти.",
      element: "[data-tour='verse-progress-phase-review']",
      side: "left",
      align: "start",
      prepare: ensureVerseProgressDrawer,
    },
    {
      id: "verse-progress-mastered",
      page: "verses",
      title: "Статус «Выучен»",
      description:
        "Когда все повторы пройдены, стих становится выученным. После этого его можно поддерживать редкими повторами и при желании удалить из своей коллекции.",
      element: "[data-tour='verse-progress-phase-mastered']",
      side: "left",
      align: "start",
      prepare: ensureVerseProgressDrawer,
    },
    {
      id: "verses-filters",
      page: "verses",
      title: "Фильтры и поиск",
      description:
        "Здесь вы переключаете каталог, свои стихи и стихи друзей, а также сужаете список по книге, сортировке, поиску и темам.",
      element: "[data-tour='verse-list-filters']",
      side: "bottom",
      align: "center",
      prepare: async (runtime) => {
        runtime.dispatchAppEvent(CLOSE_PROGRESS_DRAWER_EVENT);
        // Wait for the progress drawer to disappear from the DOM so
        // the filter element behind it becomes fully visible.
        await runtime.waitForCondition(
          () => !resolveOnboardingElement("[data-tour='verse-progress-drawer']"),
          { timeoutMs: 4000 },
        );
      },
    },
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
