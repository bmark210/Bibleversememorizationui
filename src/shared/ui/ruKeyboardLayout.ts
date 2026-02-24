export const RU_KEYBOARD_ROWS: string[][] = [
  ['й', 'ц', 'у', 'к', 'е', 'н', 'г', 'ш', 'щ', 'з', 'х'],
  ['ф', 'ы', 'в', 'а', 'п', 'р', 'о', 'л', 'д', 'ж', 'э'],
  ['я', 'ч', 'с', 'м', 'и', 'т', 'ь', 'б', 'ю'],
];

type KeyPosition = {
  x: number;
  y: number;
};

const ROW_X_OFFSETS = [0, 0.5, 1];

function normalizeRuKey(key: string) {
  return key.trim().toLowerCase();
}

function buildRuKeyboardPositions() {
  const positions = new Map<string, KeyPosition>();

  RU_KEYBOARD_ROWS.forEach((row, rowIndex) => {
    const offset = ROW_X_OFFSETS[rowIndex] ?? 0;
    row.forEach((key, keyIndex) => {
      positions.set(key, {
        x: keyIndex + offset,
        y: rowIndex,
      });
    });
  });

  return positions;
}

function buildRuKeyboardAdjacencyMap() {
  const positions = buildRuKeyboardPositions();
  const map = new Map<string, Set<string>>();
  const keys = Array.from(positions.keys());

  for (const key of keys) {
    map.set(key, new Set<string>());
  }

  for (let i = 0; i < keys.length; i += 1) {
    for (let j = i + 1; j < keys.length; j += 1) {
      const a = keys[i];
      const b = keys[j];
      const posA = positions.get(a);
      const posB = positions.get(b);
      if (!posA || !posB) continue;

      const dx = Math.abs(posA.x - posB.x);
      const dy = Math.abs(posA.y - posB.y);

      // Keyboard rows are staggered, so we allow close neighbors across rows.
      const isNeighbor = dx <= 1.15 && dy <= 1;
      if (!isNeighbor) continue;

      map.get(a)?.add(b);
      map.get(b)?.add(a);
    }
  }

  return map;
}

const RU_KEYBOARD_ADJACENCY = buildRuKeyboardAdjacencyMap();

export function isAdjacentRuKeyboardKey(actualKey: string, expectedKey: string) {
  const actual = normalizeRuKey(actualKey);
  const expected = normalizeRuKey(expectedKey);

  if (!actual || !expected || actual === expected) return false;

  return RU_KEYBOARD_ADJACENCY.get(actual)?.has(expected) ?? false;
}

