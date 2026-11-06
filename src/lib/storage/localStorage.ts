import { createAppError } from '../errors'
import type { AppError } from '../errors'
import { fail, succeed } from '../result'
import type { Result } from '../result'
import { parseState } from '../state'
import type { AppState } from '../types'
import type { StorageAdapter } from './types'

/** Where the log lives in localStorage. Kept from the original page. */
export const STORAGE_KEY = 'trading-experiment:v1'

/** The part of the Web Storage API the adapter uses. */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>

export interface LocalStorageOptions {
  /** Returns the store. A function, because merely accessing localStorage can throw. */
  readonly getStore: () => KeyValueStore
  readonly key: string
}

/** A StorageAdapter that keeps the log as JSON under one key. */
export function createLocalStorageAdapter(options: LocalStorageOptions): StorageAdapter {
  return {
    load: async () => readState(options),
    save: async (state) => writeState(options, state),
  }
}

function readState({ getStore, key }: LocalStorageOptions): Result<AppState | null, AppError> {
  try {
    const stored = getStore().getItem(key)

    if (stored === null) {
      return succeed(null)
    }

    // JSON.parse throws on corrupt data; parseState rejects data in the wrong shape
    return parseState(JSON.parse(stored))
  } catch {
    return fail(createAppError('loadFailed', 'Couldn’t read your saved log.'))
  }
}

function writeState(
  { getStore, key }: LocalStorageOptions,
  state: AppState,
): Result<null, AppError> {
  try {
    getStore().setItem(key, JSON.stringify(state))

    return succeed(null)
  } catch {
    return fail(
      createAppError('saveFailed', 'Couldn’t save. Your last change is only in this tab.'),
    )
  }
}
