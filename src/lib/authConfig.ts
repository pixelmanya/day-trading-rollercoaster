import { fail, succeed } from './result'
import type { Result } from './result'
import { readDeployment } from './serverConfig'
import type { Deployment, ServerEnvironment } from './serverConfig'

/** How sign-in links reach people. Development prints them; elsewhere email is required. */
export type Mailer = { readonly kind: 'console' } | { readonly kind: 'unavailable' }

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

  return succeed({
    secret,
    baseUrl,
    mailer: { kind: deployment === 'development' ? 'console' : 'unavailable' },
  })
}

/** The app's address: configured, else Render's, else localhost in development. */
function readBaseUrl(environment: ServerEnvironment, deployment: Deployment): string {
  const developmentUrl = deployment === 'development' ? LOCAL_URL : ''

  return environment['BETTER_AUTH_URL'] ?? environment['RENDER_EXTERNAL_URL'] ?? developmentUrl
}
