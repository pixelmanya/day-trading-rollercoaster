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

  test('sends through Brevo when both settings are there, anywhere', () => {
    const brevo = { BREVO_API_KEY: 'test-api-key', MAIL_FROM: 'hello@example.com' }

    expect(parseAuthConfig({ BETTER_AUTH_SECRET: secret, ...brevo })).toMatchObject({
      output: { mailer: { kind: 'brevo', apiKey: 'test-api-key', from: 'hello@example.com' } },
    })

    expect(
      parseAuthConfig({
        BETTER_AUTH_SECRET: secret,
        RENDER: 'true',
        RENDER_EXTERNAL_URL: 'https://app.onrender.com',
        ...brevo,
      }),
    ).toMatchObject({
      output: { mailer: { kind: 'brevo' } },
    })
  })

  test.each([
    { name: 'a key without a sender', mail: { BREVO_API_KEY: 'test-api-key' } },
    { name: 'a sender without a key', mail: { MAIL_FROM: 'hello@example.com' } },
    {
      name: 'a sender that isn’t an address',
      mail: { BREVO_API_KEY: 'test-api-key', MAIL_FROM: 'hello' },
    },
  ])('turns away $name', ({ mail }) => {
    const parsed = parseAuthConfig({ BETTER_AUTH_SECRET: secret, ...mail })

    expect(parsed.isSuccess ? '' : parsed.error).toMatch(/Set both BREVO_API_KEY and MAIL_FROM/)
  })
})
