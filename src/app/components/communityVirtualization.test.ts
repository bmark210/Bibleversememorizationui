import assert from "node:assert/strict";
import test from "node:test";
import type {
  domain_FriendPlayerListItem,
  domain_FriendPlayersPageResponse,
} from "@/api/services/friends";
import {
  clampCommunityWindowOffset,
  createCommunityItemsCache,
  getCommunityWindowOffsetForIndex,
  mergeCommunityPageWindow,
} from "./communityVirtualization";

function createItem(id: string): domain_FriendPlayerListItem {
  return {
    telegramId: id,
    name: `Player ${id}`,
    versesCount: 1,
  };
}

function createPage(
  offset: number,
  total: number,
  ids: string[],
): domain_FriendPlayersPageResponse {
  return {
    items: ids.map((id) => createItem(id)),
    limit: ids.length,
    offset,
    total,
  };
}

test("clampCommunityWindowOffset stays within the last valid window", () => {
  assert.equal(clampCommunityWindowOffset(24, 17, 8), 9);
  assert.equal(clampCommunityWindowOffset(8, 17, 8), 8);
  assert.equal(clampCommunityWindowOffset(4, 0, 8), 4);
});

test("getCommunityWindowOffsetForIndex resolves stable server windows", () => {
  assert.equal(getCommunityWindowOffsetForIndex(0, 17, 8), 0);
  assert.equal(getCommunityWindowOffsetForIndex(7, 17, 8), 0);
  assert.equal(getCommunityWindowOffsetForIndex(8, 17, 8), 8);
  assert.equal(getCommunityWindowOffsetForIndex(16, 17, 8), 9);
});

test("mergeCommunityPageWindow preserves previous windows and inserts new items", () => {
  const firstWindow = mergeCommunityPageWindow(
    [],
    createPage(0, 5, ["a", "b"]),
  );
  const merged = mergeCommunityPageWindow(
    firstWindow,
    createPage(2, 5, ["c", "d", "e"]),
  );

  assert.equal(merged.length, 5);
  assert.deepEqual(
    merged.map((item) => item?.telegramId ?? null),
    ["a", "b", "c", "d", "e"],
  );
});

test("createCommunityItemsCache pads unknown rows with null placeholders", () => {
  const cache = createCommunityItemsCache(4, [createItem("a")]);

  assert.equal(cache.length, 4);
  assert.equal(cache[0]?.telegramId, "a");
  assert.equal(cache[1], null);
  assert.equal(cache[3], null);
});
