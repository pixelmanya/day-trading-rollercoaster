/** The kinds of expected failure the app handles. */
export type AppErrorKind = 'invalidState' | 'loadFailed' | 'saveFailed'

/** An expected failure. `message` is written for the user. */
export interface AppError {
  readonly kind: AppErrorKind
  readonly message: string
}

/** Create an AppError of `kind` with a user-facing `message`. */
export function createAppError(kind: AppErrorKind, message: string): AppError {
  return { kind, message }
}
