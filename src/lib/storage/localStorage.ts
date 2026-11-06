import { parseState } from '../state'
import type { AppState } from '../types'
import type { StorageAdapter } from './types'

export const STORAGE_KEY = 'trading-experiment:v1'

type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>

export class LocalStorageAdapter implements StorageAdapter {
  private readonly store: KeyValueStore | undefined
  private readonly key: string

  /** `store` defaults to window.localStorage; pass another Storage for tests. */
  constructor(store?: KeyValueStore, key = STORAGE_KEY) {
    this.store = store ?? (typeof localStorage !== 'undefined' ? localStorage : undefined)
    this.key = key
  }

  private get kv(): KeyValueStore {
    // Accessing localStorage can throw (e.g. blocked site data), so fail at use time, not import time.
    if (!this.store) throw new Error('localStorage is not available in this browser.')
    return this.store
  }

  async load(): Promise<AppState | null> {
    const raw = this.kv.getItem(this.key)
    if (raw == null || raw === '') return null
    return parseState(JSON.parse(raw))
  }

  async save(state: AppState): Promise<void> {
    this.kv.setItem(this.key, JSON.stringify(state))
  }
}
