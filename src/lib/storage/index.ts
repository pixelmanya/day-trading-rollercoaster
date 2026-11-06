import { LocalStorageAdapter } from './localStorage'
import type { StorageAdapter } from './types'

export type { StorageAdapter } from './types'
export { LocalStorageAdapter, STORAGE_KEY } from './localStorage'

/**
 * The adapter the app uses. Add a Supabase adapter next to LocalStorageAdapter
 * and select it here (e.g. by env var or signed-in state).
 */
export function createStorage(): StorageAdapter {
  return new LocalStorageAdapter()
}
