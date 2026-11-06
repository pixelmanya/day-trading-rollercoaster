import { describe, expect, test } from 'vitest'

import { buildSettings } from '../test/builders'
import { createAppError } from './errors'
import { fail, succeed } from './result'
import { createLoadEvent, createSaveEvent, INITIAL_SESSION, reduceSession } from './session'
import type { ReadySession } from './session'
import { createEmptyState } from './state'

const loadError = createAppError('loadFailed', 'Couldn’t read your saved log.')
const saveError = createAppError('saveFailed', 'Couldn’t save.')

const TODAY = '2026-11-06'

const ready: ReadySession = {
  phase: 'ready',
  appState: createEmptyState(),
  today: TODAY,
  revision: 0,
  saveError: null,
}

describe('reduceSession', () => {
  test('becomes ready with the loaded state and nothing to save', () => {
    const appState = createEmptyState()

    expect(
      reduceSession(INITIAL_SESSION, { type: 'loadSucceeded', appState, today: TODAY }),
    ).toEqual({
      ...ready,
      appState,
    })
  })

  test('records a failed load', () => {
    expect(reduceSession(INITIAL_SESSION, { type: 'loadFailed', error: loadError })).toEqual({
      phase: 'loadFailed',
      error: loadError,
    })
  })

  test('applies a user action and counts a revision to save', () => {
    const settings = buildSettings({ start: 50 })
    const action = { type: 'saveSettings', settings } as const
    const next = reduceSession(ready, { type: 'actionDispatched', action })

    expect(next).toMatchObject({ revision: 1, appState: { settings } })
  })

  test('ignores user actions until the log is loaded', () => {
    const action = { type: 'resetExperiment' } as const

    expect(reduceSession(INITIAL_SESSION, { type: 'actionDispatched', action })).toBe(
      INITIAL_SESSION,
    )
  })

  test('remembers a failed save until a save succeeds', () => {
    const failed = reduceSession(ready, { type: 'saveFailed', error: saveError })

    expect(failed).toMatchObject({ saveError })
    expect(reduceSession(failed, { type: 'saveSucceeded' })).toMatchObject({ saveError: null })
  })

  test('asks for another save when retried', () => {
    expect(reduceSession(ready, { type: 'saveRetried' })).toMatchObject({ revision: 1 })
  })
})

describe('createLoadEvent', () => {
  test('starts an empty log when nothing was saved', () => {
    expect(createLoadEvent(succeed(null), TODAY)).toEqual({
      today: TODAY,
      type: 'loadSucceeded',
      appState: createEmptyState(),
    })
  })

  test('passes on a loaded state or the failure', () => {
    const appState = createEmptyState()

    expect(createLoadEvent(succeed(appState), TODAY)).toEqual({
      type: 'loadSucceeded',
      appState,
      today: TODAY,
    })

    expect(createLoadEvent(fail(loadError), TODAY)).toEqual({
      type: 'loadFailed',
      error: loadError,
    })
  })
})

describe('createSaveEvent', () => {
  test('reports success or the failure', () => {
    expect(createSaveEvent(succeed(null))).toEqual({ type: 'saveSucceeded' })
    expect(createSaveEvent(fail(saveError))).toEqual({ type: 'saveFailed', error: saveError })
  })
})
