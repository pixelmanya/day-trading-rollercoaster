import { describe, expect, test } from 'vitest'

import { parseAuthConfig } from './authConfig'

const secret = 'a-test-secret-that-is-long-enough-1234'

describe('parseAuthConfig', () => {
  test('prints sign-in links on a development machine at localhost', () => {
    expect(parseAuthConfig({ BETTER_AUTH_SECRET: secret })).toEqual({
      isSuccess: true,
      output: { secret, baseUrl: 'http://localhost:3000', mailer: { kind: 'console' } },
    })
  })

  test('uses Render’s address and never prints links on Render', () => {
    const render = { BETTER_AUTH_SECRET: secret, RENDER: 'true' }
    const live = parseAuthConfig({ ...render, RENDER_EXTERNAL_URL: 'https://app.onrender.com' })

    const preview = parseAuthConfig({
      ...render,
      IS_PULL_REQUEST: 'true',
      RENDER_EXTERNAL_URL: 'https://pr.onrender.com',
    })

    expect(live).toMatchObject({
      output: { baseUrl: 'https://app.onrender.com', mailer: { kind: 'unavailable' } },
    })

    expect(preview).toMatchObject({
      output: { baseUrl: 'https://pr.onrender.com', mailer: { kind: 'unavailable' } },
    })
  })

  test('prefers BETTER_AUTH_URL', () => {
    const parsed = parseAuthConfig({
      BETTER_AUTH_SECRET: secret,
      BETTER_AUTH_URL: 'https://own.example',
    })

    expect(parsed).toMatchObject({ output: { baseUrl: 'https://own.example' } })
  })

  test.each([
    { name: 'a missing secret', environment: {}, message: /BETTER_AUTH_SECRET must be set/ },
    {
      name: 'a short secret',
      environment: { BETTER_AUTH_SECRET: 'short' },
      message: /at least 32/,
    },
    {
      name: 'no address on Render',
      environment: { BETTER_AUTH_SECRET: secret, RENDER: 'true' },
      message: /BETTER_AUTH_URL/,
    },
  ])('explains $name without repeating the secret', ({ environment, message }) => {
    const parsed = parseAuthConfig(environment)

    expect(parsed.isSuccess ? '' : parsed.error).toMatch(message)
  })
})
