import '@tanstack/react-start/server-only'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink } from 'better-auth/plugins/magic-link'
import { tanstackStartCookies } from 'better-auth/tanstack-start'

import { parseAuthConfig } from '../lib/authConfig'
import type { AuthConfig, BrevoMailer, Mailer } from '../lib/authConfig'
import { chainSuccess, mapSuccess } from '../lib/result'
import type { Result } from '../lib/result'
import { createBrevoRequest, createSignInEmail } from '../lib/signInEmail'
import { getDatabase } from './database'
import type { Database } from './database'
import { readEnvironment } from './environment'
import { schema } from './schema'

/** A sign-in link on its way to someone. */
interface MagicLinkDelivery {
  readonly email: string
  readonly url: string
}

type Auth = ReturnType<typeof createAuth>

/** Sign-in needs the database and its own settings; either missing makes it unavailable. */
const auth: Result<Auth, string> = chainSuccess(getDatabase(), ({ database }) =>
  mapSuccess(parseAuthConfig(readEnvironment()), (config) => createAuth(database, config)),
)

/** Better Auth, or why sign-in is unavailable (safe to show: it never contains a secret). */
export function getAuth(): Result<Auth, string> {
  return auth
}

/** Magic-link sign-in only: no passwords. Tokens are stored hashed. */
function createAuth(database: Database, { secret, baseUrl, mailer }: AuthConfig) {
  return betterAuth({
    database: drizzleAdapter(database, { provider: 'pg', schema }),
    secret,
    baseURL: baseUrl,
    plugins: [
      magicLink({
        storeToken: 'hashed',
        sendMagicLink: async ({ email, url }) => sendSignInLink(mailer, { email, url }),
      }),
      // Lets server functions set the session cookie; keep it last
      tanstackStartCookies(),
    ],
  })
}

async function sendSignInLink(mailer: Mailer, { email, url }: MagicLinkDelivery): Promise<void> {
  if (mailer.kind === 'brevo') {
    return sendWithBrevo(mailer, { email, url })
  }

  if (mailer.kind === 'console') {
    // Development only: a sign-in link in a log is a credential
    console.info(`Sign-in link for ${email}: ${url}`)

    return
  }

  throw new Error('Sign-in emails aren’t set up on this server yet.')
}

/** Send the link by email. Errors name the status only, never the key or the link. */
async function sendWithBrevo(
  mailer: BrevoMailer,
  { email, url }: MagicLinkDelivery,
): Promise<void> {
  const request = createBrevoRequest(mailer, email, createSignInEmail(url))
  const response = await fetch(request.url, request.init)

  if (!response.ok) {
    throw new Error(`Brevo didn’t accept the sign-in email (HTTP ${response.status}).`)
  }
}
