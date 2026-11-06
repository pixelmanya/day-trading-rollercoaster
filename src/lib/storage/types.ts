import type { AppState } from '../types'

/**
 * Persistence for the trading log.
 *
 * Implementations are async so a remote backend (e.g. Supabase) can implement the
 * same interface. Both methods reject on failure; callers surface the error.
 */
export interface StorageAdapter {
  /** The saved state, or null when nothing has been saved yet. Rejects if data exists but can't be read. */
  load(): Promise<AppState | null>
  /** Persist the full state. Rejects if it could not be saved. */
  save(state: AppState): Promise<void>
}
