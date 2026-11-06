import { describe, expect, test } from 'vitest'

import { createAppError } from './errors'
import { chainSuccess, fail, mapSuccess, succeed } from './result'

describe('succeed and fail', () => {
  test('wrap an output or an error', () => {
    expect(succeed(1)).toEqual({ isSuccess: true, output: 1 })
    expect(fail('no')).toEqual({ isSuccess: false, error: 'no' })
  })
})

describe('mapSuccess', () => {
  test('transforms a success and passes a failure through', () => {
    expect(mapSuccess(succeed(2), (count) => count * 2)).toEqual(succeed(4))
    expect(mapSuccess(fail('no'), (count: number) => count * 2)).toEqual(fail('no'))
  })
})

describe('chainSuccess', () => {
  test('continues after a success and stops at a failure', () => {
    expect(chainSuccess(succeed(2), (count) => succeed(count + 1))).toEqual(succeed(3))
    expect(chainSuccess(fail('no'), (count: number) => succeed(count + 1))).toEqual(fail('no'))
  })
})

describe('createAppError', () => {
  test('creates a tagged error with a user-facing message', () => {
    expect(createAppError('saveFailed', 'Couldn’t save.')).toEqual({
      kind: 'saveFailed',
      message: 'Couldn’t save.',
    })
  })
})
