export function swapArrayItems<T>(
  items: T[],
  leftIndex: number,
  rightIndex: number
): void {
  const leftItem = items[leftIndex];
  const rightItem = items[rightIndex];

  if (leftItem === undefined || rightItem === undefined) {
    return;
  }

  items[leftIndex] = rightItem;
  items[rightIndex] = leftItem;
}
