import test from "node:test";
import assert from "node:assert/strict";
import {
  readVerseSectionTutorialCompleted,
} from "./storage";
import { useVerseSectionTutorialStore } from "./store";

type MemoryStorage = {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
};

function createMemoryStorage(): MemoryStorage {
  const values = new Map<string, string>();

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      values.set(key, value);
    },
    removeItem: (key) => {
      values.delete(key);
    },
  };
}

function resetStoreState() {
  useVerseSectionTutorialStore.setState({
    isActive: false,
    source: null,
    mockVerses: [],
    progressTargetVerseId: null,
    galleryTargetVerseId: null,
  });
}

function withMockWindow(run: () => void) {
  const previousWindow = globalThis.window;
  const localStorage = createMemoryStorage();

  Object.assign(globalThis, {
    window: {
      localStorage,
    },
  });

  try {
    resetStoreState();
    run();
  } finally {
    resetStoreState();
    Object.assign(globalThis, {
      window: previousWindow,
    });
  }
}

test("store opens progress and gallery as separate tutorial surfaces", () => {
  withMockWindow(() => {
    useVerseSectionTutorialStore
      .getState()
      .startVerseSectionTutorial("prompt");

    const firstVerse = useVerseSectionTutorialStore.getState().mockVerses[0];
    assert.ok(firstVerse);
    assert.equal(useVerseSectionTutorialStore.getState().isActive, true);

    useVerseSectionTutorialStore.getState().openProgressDrawer(firstVerse);
    assert.equal(
      useVerseSectionTutorialStore.getState().progressTargetVerseId,
      firstVerse.externalVerseId,
    );

    useVerseSectionTutorialStore.getState().openGallery(firstVerse);
    assert.equal(
      useVerseSectionTutorialStore.getState().galleryTargetVerseId,
      firstVerse.externalVerseId,
    );
    assert.equal(
      useVerseSectionTutorialStore.getState().progressTargetVerseId,
      null,
    );

    useVerseSectionTutorialStore.getState().closeAllOverlays();
    assert.equal(
      useVerseSectionTutorialStore.getState().galleryTargetVerseId,
      null,
    );
    assert.equal(
      useVerseSectionTutorialStore.getState().progressTargetVerseId,
      null,
    );
  });
});

test("store completion ends tutorial and persists completion flag", () => {
  withMockWindow(() => {
    useVerseSectionTutorialStore
      .getState()
      .startVerseSectionTutorial("profile");
    useVerseSectionTutorialStore
      .getState()
      .completeVerseSectionTutorial("42");

    assert.equal(useVerseSectionTutorialStore.getState().isActive, false);
    assert.equal(readVerseSectionTutorialCompleted("42"), true);
  });
});
