import { fail, succeed } from './result'
import type { Result } from './result'

/** What the server needs from its environment. Holds secrets: server code only. */
export interface ServerConfig {
  /** Postgres connection string, e.g. Neon's "postgresql://…?sslmode=require". */
  readonly databaseUrl: string
}

/** Environment variables as the process sees them. */
export type ServerEnvironment = Readonly<Record<string, string | undefined>>

const POSTGRES_URL = /^postgres(ql)?:\/\/\S+$/

/**
 * Validate the environment into a ServerConfig. Errors name the variable and what is wrong,
 * never its value, so they are safe to log.
 *
 * Render PR previews (IS_PULL_REQUEST=true) read PREVIEW_DATABASE_URL and never fall back to
 * DATABASE_URL, so a preview can't reach production data.
 */
export function parseServerConfig(environment: ServerEnvironment): Result<ServerConfig, string> {
  const variable =
    environment['IS_PULL_REQUEST'] === 'true' ? 'PREVIEW_DATABASE_URL' : 'DATABASE_URL'

  const databaseUrl = environment[variable]

  if (databaseUrl === undefined || databaseUrl === '') {
    return fail(`${variable} is not set. See .env.example.`)
  }

  if (!POSTGRES_URL.test(databaseUrl)) {
    return fail(`${variable} must be a postgres:// or postgresql:// connection string.`)
  }

  return succeed({ databaseUrl })
}
