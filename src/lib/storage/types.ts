import type { AppError } from '../errors'
import type { Result } from '../result'
import type { AppState } from '../types'

/**
 * Where the log is kept. Async so a remote backend (e.g. Supabase) can implement it too.
 * Expected failures resolve to a failed Result; the promises never reject for them.
 */
export interface StorageAdapter {
  /** The saved state, or null when nothing has been saved yet. */
  readonly load: () => Promise<Result<AppState | null, AppError>>
  /** Save the full state. */
  readonly save: (state: AppState) => Promise<Result<null, AppError>>
}
