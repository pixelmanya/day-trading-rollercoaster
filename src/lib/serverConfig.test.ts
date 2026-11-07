import { describe, expect, test } from 'vitest'

import { parseServerConfig } from './serverConfig'

describe('parseServerConfig', () => {
  test('reads the database connection string', () => {
    const databaseUrl = 'postgresql://user:secret@example.neon.tech/log?sslmode=require'

    expect(parseServerConfig({ DATABASE_URL: databaseUrl })).toEqual({
      isSuccess: true,
      output: { databaseUrl },
    })
  })

  test.each([
    { name: 'missing', environment: {}, message: /is not set/ },
    { name: 'empty', environment: { DATABASE_URL: '' }, message: /is not set/ },
    { name: 'not Postgres', environment: { DATABASE_URL: 'mysql://x' }, message: /must be/ },
  ])('explains a $name DATABASE_URL without repeating it', ({ environment, message }) => {
    const parsed = parseServerConfig(environment)

    expect(parsed.isSuccess ? '' : parsed.error).toMatch(message)
    expect(parsed.isSuccess ? '' : parsed.error).not.toMatch(/mysql:\/\/x/)
  })
})
