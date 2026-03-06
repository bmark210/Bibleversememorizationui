import type { AppError } from "../errors/AppError";

export type Result<T, E extends Error = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };

export const ok = <T>(data: T): Result<T, never> => ({ success: true, data });

export const err = <E extends Error>(error: E): Result<never, E> => ({
  success: false,
  error,
});
