export function levenshteinDistance(left: string, right: string): number {
  const source = Array.from(left);
  const target = Array.from(right);

  if (source.length === 0) return target.length;
  if (target.length === 0) return source.length;

  let previousRow = Array.from(
    { length: target.length + 1 },
    (_, index) => index
  );

  for (let sourceIndex = 1; sourceIndex <= source.length; sourceIndex += 1) {
    const currentRow: number[] = [sourceIndex];

    for (
      let targetIndex = 1;
      targetIndex <= target.length;
      targetIndex += 1
    ) {
      const substitutionCost =
        source[sourceIndex - 1] === target[targetIndex - 1] ? 0 : 1;
      const deletionCost = (previousRow[targetIndex] ?? target.length) + 1;
      const insertionCost = (currentRow[targetIndex - 1] ?? source.length) + 1;
      const substitutionTotal =
        (previousRow[targetIndex - 1] ?? target.length) + substitutionCost;

      currentRow[targetIndex] = Math.min(
        deletionCost,
        insertionCost,
        substitutionTotal
      );
    }

    previousRow = currentRow;
  }

  return previousRow[target.length] ?? 0;
}

export function similarityRatio(left: string, right: string): number {
  const maxLength = Math.max(Array.from(left).length, Array.from(right).length);
  if (maxLength === 0) return 1;

  const distance = levenshteinDistance(left, right);
  return Math.max(0, 1 - distance / maxLength);
}
