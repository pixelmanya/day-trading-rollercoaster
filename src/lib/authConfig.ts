import { fail, mapSuccess, succeed } from './result'
import type { Result } from './result'
import { readDeployment } from './serverConfig'
import type { Deployment, ServerEnvironment } from './serverConfig'

/** Sending email through Brevo's API: its key and the verified sender address. */
export interface BrevoMailer {
  readonly kind: 'brevo'
  readonly apiKey: string
  readonly from: string
}

/**
 * How sign-in links reach people: email through Brevo when configured, else printed in the
 * terminal in development; on Render without Brevo, not at all.
 */
export type Mailer = BrevoMailer | { readonly kind: 'console' } | { readonly kind: 'unavailable' }

/** What sign-in needs from the environment. Holds secrets: server code only. */
export interface AuthConfig {
  /** Signs sessions and tokens; at least 32 characters. */
  readonly secret: string
  /** The app's public address, used in sign-in links. */
  readonly baseUrl: string
  readonly mailer: Mailer
}

const MIN_SECRET_LENGTH = 32
const LOCAL_URL = 'http://localhost:3000'
const EMAIL_ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Validate sign-in settings. The base URL comes from BETTER_AUTH_URL, else Render's own
 * address (RENDER_EXTERNAL_URL, also set for previews), else localhost in development.
 */
export function parseAuthConfig(environment: ServerEnvironment): Result<AuthConfig, string> {
  const secret = environment['BETTER_AUTH_SECRET'] ?? ''
  const deployment = readDeployment(environment)

  if (secret.length < MIN_SECRET_LENGTH) {
    return fail('BETTER_AUTH_SECRET must be set, at least 32 characters. See .env.example.')
  }

  const baseUrl = readBaseUrl(environment, deployment)

  if (!URL.canParse(baseUrl)) {
    return fail('BETTER_AUTH_URL must be the app’s address, e.g. https://example.onrender.com.')
  }

  return mapSuccess(readMailer(environment, deployment), (mailer) => ({ secret, baseUrl, mailer }))
}

/** Brevo when both settings are there; neither means the fallback; one alone is a mistake. */
function readMailer(
  environment: ServerEnvironment,
  deployment: Deployment,
): Result<Mailer, string> {
  const apiKey = environment['BREVO_API_KEY'] ?? ''
  const from = environment['MAIL_FROM'] ?? ''

  if (`${apiKey}${from}` === '') {
    return succeed({ kind: deployment === 'development' ? 'console' : 'unavailable' })
  }

  return isBrevoReady(apiKey, from)
    ? succeed({ kind: 'brevo', apiKey, from })
    : fail('Set both BREVO_API_KEY and MAIL_FROM (a verified sender address). See .env.example.')
}

function isBrevoReady(apiKey: string, from: string): boolean {
  return apiKey !== '' && EMAIL_ADDRESS.test(from)
}

/** The app's address: configured, else Render's, else localhost in development. */
function readBaseUrl(environment: ServerEnvironment, deployment: Deployment): string {
  const developmentUrl = deployment === 'development' ? LOCAL_URL : ''

  return environment['BETTER_AUTH_URL'] ?? environment['RENDER_EXTERNAL_URL'] ?? developmentUrl
}
