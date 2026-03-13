import test from "node:test";
import assert from "node:assert/strict";
import {
  clearVerseSectionTutorialCompleted,
  clearVerseSectionTutorialPromptSeen,
  readVerseSectionTutorialCompleted,
  readVerseSectionTutorialPromptSeen,
  writeVerseSectionTutorialCompleted,
  writeVerseSectionTutorialPromptSeen,
} from "./storage";

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

function withMockWindow(run: () => void) {
  const previousWindow = globalThis.window;
  const localStorage = createMemoryStorage();

  Object.assign(globalThis, {
    window: {
      localStorage,
    },
  });

  try {
    run();
  } finally {
    Object.assign(globalThis, {
      window: previousWindow,
    });
  }
}

test("prompt flag is persisted independently from completion", () => {
  withMockWindow(() => {
    assert.equal(readVerseSectionTutorialPromptSeen("42"), false);
    assert.equal(readVerseSectionTutorialCompleted("42"), false);

    writeVerseSectionTutorialPromptSeen("42");

    assert.equal(readVerseSectionTutorialPromptSeen("42"), true);
    assert.equal(readVerseSectionTutorialCompleted("42"), false);

    clearVerseSectionTutorialPromptSeen("42");

    assert.equal(readVerseSectionTutorialPromptSeen("42"), false);
  });
});

test("completion also marks the prompt as seen", () => {
  withMockWindow(() => {
    writeVerseSectionTutorialCompleted("42");

    assert.equal(readVerseSectionTutorialCompleted("42"), true);
    assert.equal(readVerseSectionTutorialPromptSeen("42"), true);

    clearVerseSectionTutorialCompleted("42");
    clearVerseSectionTutorialPromptSeen("42");

    assert.equal(readVerseSectionTutorialCompleted("42"), false);
    assert.equal(readVerseSectionTutorialPromptSeen("42"), false);
  });
});
