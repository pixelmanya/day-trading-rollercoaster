import { describe, expect, test } from 'vitest'

import { createBrevoRequest, createSignInEmail } from './signInEmail'

const signInUrl = 'https://app.example/api/auth/magic-link/verify?token=abc&callbackURL=%2F'

describe('createSignInEmail', () => {
  test('carries the link in text and HTML, escaped in HTML', () => {
    const email = createSignInEmail(signInUrl)

    expect(email.subject).toBe('Your sign-in link for Trading experiment')
    expect(email.text).toContain(signInUrl)

    expect(email.html).toContain(
      'href="https://app.example/api/auth/magic-link/verify?token=abc&amp;callbackURL=%2F"',
    )

    expect(email.html).not.toContain('<script')
    expect(createSignInEmail('https://x/"><script>').html).toContain('&quot;&gt;&lt;script&gt;')
  })
})

describe('createBrevoRequest', () => {
  test('posts the email to Brevo with the key in its header', () => {
    const email = createSignInEmail(signInUrl)
    const mailer = { kind: 'brevo', apiKey: 'test-api-key', from: 'hello@example.com' } as const
    const { url, init } = createBrevoRequest(mailer, 'trader@example.com', email)

    expect(url).toBe('https://api.brevo.com/v3/smtp/email')
    expect(init).toMatchObject({ method: 'POST', headers: { 'api-key': 'test-api-key' } })

    expect(JSON.parse(init.body)).toEqual({
      sender: { name: 'Trading experiment', email: 'hello@example.com' },
      to: [{ email: 'trader@example.com' }],
      subject: email.subject,
      textContent: email.text,
      htmlContent: email.html,
    })
  })
})
