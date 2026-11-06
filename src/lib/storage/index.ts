import { createLocalStorageAdapter, STORAGE_KEY } from './localStorage'
import type { StorageAdapter } from './types'

export type { StorageAdapter } from './types'

/**
 * The adapter the app uses. To add Supabase, write createSupabaseAdapter(client) next to
 * createLocalStorageAdapter and select it here.
 */
export function createStorage(): StorageAdapter {
  return createLocalStorageAdapter({ getStore: () => localStorage, key: STORAGE_KEY })
}
