/** @vitest-environment jsdom */
import { describe, expect, test } from 'vitest'

import { createStorage } from '.'

describe('createStorage', () => {
  test('uses the browser’s localStorage, which starts empty', async () => {
    expect(await createStorage().load()).toEqual({ isSuccess: true, output: null })
  })
})
