import { describe, expect, test } from 'vitest'

import { parseServerConfig } from './serverConfig'

describe('parseServerConfig', () => {
  test('reads the database connection string', () => {
    const databaseUrl = 'postgresql://user:secret@example.neon.tech/log?sslmode=require'

    expect(parseServerConfig({ DATABASE_URL: databaseUrl })).toEqual({
      isSuccess: true,
      output: { databaseUrl, databaseHost: 'example.neon.tech' },
    })
  })

  test('uses the preview database in a pull request preview, never production’s', () => {
    const preview = 'postgresql://user:secret@preview.neon.tech/log'
    const production = 'postgresql://user:secret@production.neon.tech/log'

    expect(
      parseServerConfig({
        IS_PULL_REQUEST: 'true',
        DATABASE_URL: production,
        PREVIEW_DATABASE_URL: preview,
      }),
    ).toEqual({
      isSuccess: true,
      output: { databaseUrl: preview, databaseHost: 'preview.neon.tech' },
    })

    expect(parseServerConfig({ IS_PULL_REQUEST: 'true', DATABASE_URL: production })).toEqual({
      isSuccess: false,
      error: 'PREVIEW_DATABASE_URL is not set. See .env.example.',
    })
  })

  test.each([
    { name: 'missing', environment: {}, message: /is not set/ },
    { name: 'empty', environment: { DATABASE_URL: '' }, message: /is not set/ },
    { name: 'not Postgres', environment: { DATABASE_URL: 'mysql://x' }, message: /must be/ },
    { name: 'host-less', environment: { DATABASE_URL: 'postgres:///log' }, message: /must be/ },
    { name: 'unparsable', environment: { DATABASE_URL: 'postgres://[broken' }, message: /must be/ },
  ])('explains a $name DATABASE_URL without repeating it', ({ environment, message }) => {
    const parsed = parseServerConfig(environment)

    expect(parsed.isSuccess ? '' : parsed.error).toMatch(message)
    expect(parsed.isSuccess ? '' : parsed.error).not.toMatch(/mysql:\/\/x/)
  })
})
