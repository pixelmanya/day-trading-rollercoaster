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
 */
export function parseServerConfig(environment: ServerEnvironment): Result<ServerConfig, string> {
  const databaseUrl = environment['DATABASE_URL']

  if (databaseUrl === undefined || databaseUrl === '') {
    return fail('DATABASE_URL is not set. See .env.example.')
  }

  if (!POSTGRES_URL.test(databaseUrl)) {
    return fail('DATABASE_URL must be a postgres:// or postgresql:// connection string.')
  }

  return succeed({ databaseUrl })
}
