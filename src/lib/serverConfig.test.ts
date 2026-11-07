import { describe, expect, test } from 'vitest'

import { checkDatabaseOwner, parseServerConfig } from './serverConfig'

describe('parseServerConfig', () => {
  test('reads the database connection string', () => {
    const databaseUrl = 'postgresql://user:secret@example.neon.tech/log?sslmode=require'

    expect(parseServerConfig({ DATABASE_URL: databaseUrl })).toEqual({
      isSuccess: true,
      output: { deployment: 'development', databaseUrl, databaseHost: 'example.neon.tech' },
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
      output: { deployment: 'preview', databaseUrl: preview, databaseHost: 'preview.neon.tech' },
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

describe('deployments', () => {
  const databaseUrl = 'postgresql://user:secret@example.neon.tech/log'

  test('are production on Render, preview for Render PR previews, else development', () => {
    const getDeployment = (environment: Readonly<Record<string, string>>) => {
      const parsed = parseServerConfig({ DATABASE_URL: databaseUrl, ...environment })

      return parsed.isSuccess ? parsed.output.deployment : null
    }

    expect(getDeployment({ RENDER: 'true' })).toBe('production')

    expect(
      getDeployment({ RENDER: 'true', IS_PULL_REQUEST: 'true', PREVIEW_DATABASE_URL: databaseUrl }),
    ).toBe('preview')

    expect(getDeployment({})).toBe('development')
  })
})

describe('checkDatabaseOwner', () => {
  test('keeps the production and preview databases to their own deployment', () => {
    expect(checkDatabaseOwner('a37255697dd9', 'production').isSuccess).toBe(true)
    expect(checkDatabaseOwner('66b6c6392f90', 'preview').isSuccess).toBe(true)

    expect(checkDatabaseOwner('a37255697dd9', 'development')).toEqual({
      isSuccess: false,
      error:
        'This development server is set up with the production database. Use its own (README → Environments).',
    })

    expect(checkDatabaseOwner('a37255697dd9', 'preview').isSuccess).toBe(false)
    expect(checkDatabaseOwner('66b6c6392f90', 'development').isSuccess).toBe(false)
  })

  test('allows development databases anywhere', () => {
    expect(checkDatabaseOwner('49960de5880e', 'development').isSuccess).toBe(true)
  })
})
