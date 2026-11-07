import type { BrevoMailer } from './authConfig'

/** The sign-in email in plain text and HTML. */
export interface SignInEmail {
  readonly subject: string
  readonly text: string
  readonly html: string
}

/** A request for fetch: where to send it and what. */
export interface MailRequest {
  readonly url: string
  readonly init: {
    readonly method: 'POST'
    readonly headers: Readonly<Record<string, string>>
    readonly body: string
  }
}

const APP_NAME = 'Trading experiment'
const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email'

/** The email carrying a sign-in link. */
export function createSignInEmail(signInUrl: string): SignInEmail {
  const note =
    'It works once and expires in 5 minutes. If you didn’t ask for it, ignore this email.'

  const link = escapeHtml(signInUrl)

  return {
    subject: `Your sign-in link for ${APP_NAME}`,
    text: `Open this link to sign in to ${APP_NAME}:\n\n${signInUrl}\n\n${note}\n`,
    html: `<p>Open this link to sign in to ${APP_NAME}:</p><p><a href="${link}">Sign in</a></p><p>${note}</p>`,
  }
}

/** The request that sends `email` to `recipient` through Brevo's transactional email API. */
export function createBrevoRequest(
  { apiKey, from }: BrevoMailer,
  recipient: string,
  { subject, text, html }: SignInEmail,
): MailRequest {
  const message = {
    sender: { name: APP_NAME, email: from },
    to: [{ email: recipient }],
    subject,
    textContent: text,
    htmlContent: html,
  }

  return {
    url: BREVO_SEND_URL,
    init: {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(message),
    },
  }
}

/** Text safe inside HTML and attribute values; & first, so entities aren't escaped twice. */
function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}
