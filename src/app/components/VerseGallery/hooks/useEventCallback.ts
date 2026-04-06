import { useCallback, useLayoutEffect, useRef } from "react";

export function useEventCallback<Args extends unknown[], Result>(
  fn: (...args: Args) => Result
): (...args: Args) => Result {
  const fnRef = useRef(fn);

  useLayoutEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  return useCallback((...args: Args) => fnRef.current(...args), []);
}
