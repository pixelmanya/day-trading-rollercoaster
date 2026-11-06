import { describe, expect, test, vi as mocking } from 'vitest'

import { buildSettings, buy } from '../../test/builders'
import { createLocalStorageAdapter } from './localStorage'
import type { KeyValueStore } from './localStorage'

const state = { settings: buildSettings(), trades: [buy()] }

/** An adapter over a fake store whose getItem returns `stored`. */
function createAdapter(
  stored: string | null,
  setItem: KeyValueStore['setItem'] = mocking.fn<KeyValueStore['setItem']>(),
) {
  return createLocalStorageAdapter({
    getStore: () => ({ getItem: () => stored, setItem }),
    key: 'test-key',
  })
}

/** Stands in for a browser that blocks storage access. */
function failWithBlockedStorage(): never {
  throw new Error('storage blocked')
}

describe('createLocalStorageAdapter', () => {
  test('loads nothing when nothing was saved', async () => {
    expect(await createAdapter(null).load()).toEqual({ isSuccess: true, output: null })
  })

  test('loads a saved state', async () => {
    expect(await createAdapter(JSON.stringify(state)).load()).toEqual({
      isSuccess: true,
      output: state,
    })
  })

  test('reports corrupt JSON as a failed load', async () => {
    expect(await createAdapter('{').load()).toEqual({
      isSuccess: false,
      error: { kind: 'loadFailed', message: 'Couldn’t read your saved log.' },
    })
  })

  test('reports data in the wrong shape as invalid', async () => {
    const outcome = await createAdapter('{"trades":"x"}').load()

    expect(outcome.isSuccess || outcome.error.kind).toBe('invalidState')
  })

  test('reports blocked storage as a failed load', async () => {
    const adapter = createLocalStorageAdapter({ getStore: failWithBlockedStorage, key: 'test-key' })

    expect((await adapter.load()).isSuccess).toBe(false)
  })

  test('saves the state as JSON under its key', async () => {
    const setItem = mocking.fn<KeyValueStore['setItem']>()

    expect(await createAdapter(null, setItem).save(state)).toEqual({
      isSuccess: true,
      output: null,
    })

    expect(setItem).toHaveBeenCalledWith('test-key', JSON.stringify(state))
  })

  test('reports a failed save', async () => {
    expect(await createAdapter(null, failWithBlockedStorage).save(state)).toEqual({
      isSuccess: false,
      error: {
        kind: 'saveFailed',
        message: 'Couldn’t save. Your last change is only in this tab.',
      },
    })
  })
})
